import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import type { MediaDerivativeGeneration } from "../prisma/generated";
import {
  MediaDerivativeStore,
  type SavedOutput,
} from "../src/processing/media-derivative.store";
import { MediaDerivativeWorker } from "../src/processing/media-derivative.worker";
import { MediaProcessingStorage } from "../src/processing/media-processing.storage";
import { imagePresets } from "../src/processing/image-recipes";
import { SERVER_IMAGE_FONT } from "../src/processing/derivative-policy";

async function harness() {
  const bytes = await sharp({
    create: { width: 80, height: 40, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const mediaId = randomUUID();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const source = {
    id: mediaId,
    storage: "s3",
    status: "READY",
    scanStatus: "CLEAN",
    accessClass: "PUBLIC",
    visibility: "public",
    scope: "panel",
    ownerId: null,
    entityId: null,
    entityType: null,
    verifiedSource: {
      bucket: "media",
      path: "private/verified/source",
      sha256,
      width: 80,
      height: 40,
      sizeBytes: bytes.length,
    },
  };
  const job = {
    id: randomUUID(),
    mediaId,
    leaseToken: randomUUID(),
    leaseUntil: new Date(Date.now() + 1_200_000),
    sourceSha256: sha256,
    fontSha256: null,
    watermarks: [],
    recipes: imagePresets(
      JSON.stringify([
        {
          view: "thumbnail",
          width: 20,
          height: 20,
          fit: "cover",
          format: "png",
        },
        { view: "detail", width: 40, height: 40, fit: "inside", format: "png" },
      ]),
    ),
  } as unknown as MediaDerivativeGeneration;
  const events: string[] = [];
  const store = {
    discoverDefault: jest.fn().mockResolvedValue(undefined),
    claim: jest.fn().mockResolvedValue(job),
    source: jest.fn().mockResolvedValue(source),
    planCopies: jest.fn().mockImplementation(() => {
      events.push("plan");
      return Promise.resolve(true);
    }),
    complete: jest
      .fn<Promise<boolean>, [MediaDerivativeGeneration, SavedOutput[]]>()
      .mockImplementation(() => {
        events.push("publish");
        return Promise.resolve(true);
      }),
    fail: jest.fn().mockResolvedValue(true),
  };
  const storage = {
    readVerified: jest.fn().mockResolvedValue(bytes),
    writeCopy: jest.fn().mockImplementation(() => {
      events.push("put");
      return Promise.resolve();
    }),
  };
  return {
    job,
    store,
    storage,
    events,
    worker: new MediaDerivativeWorker(
      store as unknown as MediaDerivativeStore,
      storage as unknown as MediaProcessingStorage,
    ),
  };
}

describe("saved derivative worker", () => {
  it("renders a real text job using the bundled server font and pinned checksum", async () => {
    const h = await harness();
    h.job.fontSha256 = SERVER_IMAGE_FONT.sha256;
    h.job.recipes = imagePresets(
      JSON.stringify([
        {
          view: "card",
          width: 32,
          height: 32,
          fit: "cover",
          format: "png",
          watermark: {
            kind: "text",
            text: "Demo <&>",
            width: 24,
            height: 8,
            margin: 1,
            opacity: 0.6,
          },
        },
      ]),
    );
    await h.worker.runOnce();
    expect(h.store.fail).not.toHaveBeenCalled();
    expect(h.store.complete).toHaveBeenCalledWith(
      h.job,
      expect.arrayContaining([
        expect.objectContaining({
          fontSha256: SERVER_IMAGE_FONT.sha256,
          fontFamily: "Vazirmatn",
          width: 32,
          height: 32,
        }),
      ]),
    );
  });
  it("plans durable cleanup before writes and publishes only the complete set", async () => {
    const h = await harness();
    expect(await h.worker.runOnce()).toBe(true);
    expect(h.events).toEqual(["plan", "put", "put", "publish"]);
    const copies = h.store.complete.mock.calls[0][1];
    expect(
      copies.map((o: { width: number; height: number }) => [o.width, o.height]),
    ).toEqual([
      [20, 20],
      [40, 20],
    ]);
    for (const o of copies) {
      expect(o.sourceSha256).toBe(h.job.sourceSha256);
      expect(o.sha256).toBe(createHash("sha256").update(o.bytes).digest("hex"));
      expect(o.path).toContain(`/${h.job.id}/${h.job.leaseToken}/`);
    }
  });
  it("does not publish partial writes and leaves cleanup plans durable", async () => {
    const h = await harness();
    h.storage.writeCopy
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("outage"));
    await h.worker.runOnce();
    expect(h.store.planCopies).toHaveBeenCalledTimes(1);
    expect(h.store.complete).not.toHaveBeenCalled();
    expect(h.store.fail).toHaveBeenCalledWith(
      h.job,
      expect.objectContaining({
        code: "derivative_dependency_failed",
        retryable: true,
      }),
    );
  });
  it("does not upload after a superseded claim loses its fence", async () => {
    const h = await harness();
    h.store.planCopies.mockResolvedValue(false);
    await h.worker.runOnce();
    expect(h.storage.writeCopy).not.toHaveBeenCalled();
    expect(h.store.complete).not.toHaveBeenCalled();
  });
  it("rejects changed immutable bytes before any cleanup plan or write", async () => {
    const h = await harness();
    h.storage.readVerified.mockResolvedValue(Buffer.from("changed"));
    await h.worker.runOnce();
    expect(h.store.planCopies).not.toHaveBeenCalled();
    expect(h.storage.writeCopy).not.toHaveBeenCalled();
    expect(h.store.fail).toHaveBeenCalledWith(
      h.job,
      expect.objectContaining({
        code: "image_source_checksum_mismatch",
        retryable: false,
      }),
    );
  });
});
