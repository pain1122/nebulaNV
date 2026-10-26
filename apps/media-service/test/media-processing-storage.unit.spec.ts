import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import type { Media } from "../prisma/generated";
import { MediaProcessingStorage } from "../src/processing/media-processing.storage";

const binding = "b".repeat(64);

function harness(
  body: Readable,
  metadata = { ContentLength: 3, ETag: '"finalized-etag"' },
) {
  const send = jest
    .fn<
      Promise<{
        ContentLength: number;
        ETag: string;
        Body: Readable;
        Metadata: Record<string, string>;
      }>,
      [unknown, unknown]
    >()
    .mockResolvedValue({
      ...metadata,
      Body: body,
      Metadata: { "nebula-upload-binding": binding },
    });
  const storage = new MediaProcessingStorage();
  Object.assign(storage, { client: { send } });
  const media = {
    storage: "s3",
    bucket: "media",
    path: "uploads/proof.png",
    sizeBytes: 3,
    etag: "finalized-etag",
  } as Media;
  return { storage, send, media };
}

describe("Media bounded object reading", () => {
  it("checks verified source length and actual SHA before derivative processing", async () => {
    const { storage, send } = harness(Readable.from([Buffer.from("abc")]));
    const source = {
      bucket: "media",
      path: "private/verified/source",
      sizeBytes: 3,
      sha256: createHash("sha256").update("abc").digest("hex"),
    };
    await expect(storage.readVerified(source)).resolves.toEqual(
      Buffer.from("abc"),
    );
    send.mockResolvedValue({
      ContentLength: 3,
      ETag: "irrelevant",
      Body: Readable.from([Buffer.from("abd")]),
      Metadata: {},
    });
    await expect(storage.readVerified(source)).rejects.toThrow(
      "image_source_changed",
    );
  });
  it("bounds and closes a stalled verified-source stream", async () => {
    const previous = process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS;
    process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS = "100";
    const body = new Readable({ read() {} });
    try {
      const { storage } = harness(body);
      await expect(
        storage.readVerified({
          bucket: "media",
          path: "private/source",
          sizeBytes: 3,
          sha256: "a".repeat(64),
        }),
      ).rejects.toThrow("storage_timeout");
      expect(body.destroyed).toBe(true);
    } finally {
      if (previous === undefined)
        delete process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS;
      else process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS = previous;
    }
  });
  it("requires the finalized object version and reads all bytes within the bound", async () => {
    const { storage, send, media } = harness(
      Readable.from([Buffer.from("a"), Buffer.from("bc")]),
    );
    await expect(storage.readUpload(media, binding)).resolves.toEqual(
      Buffer.from("abc"),
    );
    const command = send.mock.calls[0][0] as { input: { IfMatch: string } };
    expect(command.input.IfMatch).toBe('"finalized-etag"');
  });

  it.each([
    [
      Readable.from([Buffer.from("abcd")]),
      { ContentLength: 3, ETag: '"finalized-etag"' },
      "upload_size_invalid",
    ],
    [
      Readable.from([Buffer.from("ab")]),
      { ContentLength: 3, ETag: '"finalized-etag"' },
      "upload_size_mismatch",
    ],
    [
      Readable.from([Buffer.from("abc")]),
      { ContentLength: 3, ETag: '"changed-etag"' },
      "upload_changed",
    ],
  ])(
    "rejects actual size and identity drift",
    async (body, metadata, reason) => {
      const { storage, media } = harness(body, metadata);
      await expect(storage.readUpload(media, binding)).rejects.toThrow(reason);
      expect(body.destroyed).toBe(true);
    },
  );

  it("times out and closes a stalled stream", async () => {
    const previous = process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS;
    process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS = "100";
    const body = new Readable({ read() {} });
    try {
      const { storage, media } = harness(body);
      await expect(storage.readUpload(media, binding)).rejects.toThrow(
        "storage_timeout",
      );
      expect(body.destroyed).toBe(true);
    } finally {
      if (previous === undefined)
        delete process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS;
      else process.env.MEDIA_PROCESSING_IO_TIMEOUT_MS = previous;
    }
  });

  it.each([undefined, "a".repeat(64)])(
    "rejects missing or substituted upload authorization and closes the stream",
    async (actualBinding) => {
      const body = Readable.from([Buffer.from("abc")]);
      const { storage, send, media } = harness(body);
      send.mockResolvedValue({
        ContentLength: 3,
        ETag: '"finalized-etag"',
        Body: body,
        Metadata: actualBinding
          ? { "nebula-upload-binding": actualBinding }
          : {},
      });
      await expect(storage.readUpload(media, binding)).rejects.toThrow(
        "upload_authorization_mismatch",
      );
      expect(body.destroyed).toBe(true);
    },
  );

  it("does not read an old unbound upload as verified input", async () => {
    const { storage, send, media } = harness(
      Readable.from([Buffer.from("abc")]),
    );
    await expect(storage.readUpload(media, null)).rejects.toThrow(
      "upload_authorization_unverified",
    );
    expect(send).not.toHaveBeenCalled();
  });
});
