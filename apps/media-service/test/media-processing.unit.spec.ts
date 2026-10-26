import sharp from "sharp";
import { createHash } from "node:crypto";
import { MediaProcessingWorker } from "../src/processing/media-processing.worker";
import {
  MediaProcessingStore,
  type ClaimedJob,
} from "../src/processing/media-processing.store";
import { MediaProcessingStorage } from "../src/processing/media-processing.storage";
import { ClamavScanner } from "../src/processing/clamav-scanner";
import { validateImage } from "../src/processing/image-validation";
import {
  ProcessingError,
  retryDelay,
} from "../src/processing/processing-policy";
import { MediaService } from "../src/media.service";
import type { PrismaService } from "../src/prisma.service";
import {
  signUploadBinding,
  UPLOAD_BINDING_METADATA,
} from "../src/processing/upload-binding";

async function png() {
  return sharp({
    create: { width: 8, height: 6, channels: 3, background: "#2266aa" },
  })
    .png()
    .toBuffer();
}

describe("Media image validation", () => {
  it.each(["png", "jpeg", "webp", "gif"] as const)(
    "fully decodes allowed %s bytes and computes actual facts",
    async (format) => {
      const bytes = await sharp({
        create: { width: 8, height: 6, channels: 3, background: "#2266aa" },
      })
        .toFormat(format)
        .toBuffer();
      const facts = await validateImage(
        bytes,
        `image/${format}`,
        `sample.${format}`,
        null,
      );
      expect(facts).toEqual({
        width: 8,
        height: 6,
        sizeBytes: bytes.length,
        mimeType: `image/${format}`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    },
  );

  it("rejects mismatched types/extensions, claimed checksums, arbitrary and truncated bytes", async () => {
    const bytes = await png();
    await expect(
      validateImage(bytes, "image/webp", "sample.webp", null),
    ).rejects.toThrow("image_mime_mismatch");
    await expect(
      validateImage(bytes, "image/png", "sample.exe", null),
    ).rejects.toThrow("image_extension_mismatch");
    await expect(
      validateImage(bytes, "image/png", "sample.png", "0".repeat(64)),
    ).rejects.toThrow("image_checksum_mismatch");
    await expect(
      validateImage(Buffer.from("hello"), "image/png", "sample.png", null),
    ).rejects.toThrow("image_type_not_supported");
    await expect(
      validateImage(bytes.subarray(0, 40), "image/png", "sample.png", null),
    ).rejects.toThrow("image_decode_failed");
  });

  it("bounds decoded pixels, not just uploaded byte length", async () => {
    const previous = process.env.MEDIA_PROCESSING_MAX_PIXELS;
    process.env.MEDIA_PROCESSING_MAX_PIXELS = "4";
    try {
      await expect(
        validateImage(await png(), "image/png", "sample.png", null),
      ).rejects.toThrow("image_decode_failed");
    } finally {
      if (previous === undefined)
        delete process.env.MEDIA_PROCESSING_MAX_PIXELS;
      else process.env.MEDIA_PROCESSING_MAX_PIXELS = previous;
    }
  });
});

function workerHarness(bytes: Buffer) {
  const job = {
    id: "00000000-0000-4000-8000-000000000011",
    mediaId: "00000000-0000-4000-8000-000000000012",
    leaseToken: "00000000-0000-4000-8000-000000000013",
    attempts: 1,
    maxAttempts: 5,
    expectedSha256: null,
    expectedUploadBinding: "b".repeat(64),
    media: { filename: "sample.png", mimeType: "image/png", bucket: "media" },
  } as ClaimedJob;
  const store = {
    nextCleanup: jest.fn().mockResolvedValue(null),
    claim: jest.fn().mockResolvedValue(job),
    planCopy: jest.fn().mockResolvedValue(true),
    complete: jest.fn().mockResolvedValue(true),
    fail: jest.fn().mockResolvedValue(true),
    cleanupSucceeded: jest.fn(),
    cleanupFailed: jest.fn(),
  };
  const storage = {
    readUpload: jest.fn().mockResolvedValue(bytes),
    writeCopy: jest.fn(),
    removeObject: jest.fn(),
  };
  const scanner = {
    scan: jest.fn().mockResolvedValue("ClamAV test/database"),
    checkAvailability: jest.fn().mockResolvedValue(undefined),
  };
  const worker = new MediaProcessingWorker(
    store as unknown as MediaProcessingStore,
    storage as unknown as MediaProcessingStorage,
    scanner as unknown as ClamavScanner,
  );
  return { worker, store, storage, scanner, job };
}

describe("Media processing publication", () => {
  it("does not consume queued-job attempts while the scanner is unavailable", async () => {
    const { worker, scanner, store } = workerHarness(await png());
    scanner.checkAvailability.mockRejectedValue(
      new ProcessingError("scanner_unavailable", true),
    );
    await expect(worker.runOnce()).resolves.toBe(false);
    expect(store.claim).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
  });
  it("publishes the exact scanned bytes to an isolated copy with verified facts", async () => {
    const bytes = await png();
    const { worker, store, storage, scanner, job } = workerHarness(bytes);
    await worker.runOnce();
    expect(scanner.scan).toHaveBeenCalledWith(bytes);
    expect(storage.writeCopy).toHaveBeenCalledWith(
      "media",
      expect.stringContaining(`/verified/${job.mediaId}/${job.leaseToken}/`),
      bytes,
      "image/png",
    );
    expect(store.complete).toHaveBeenCalledWith(
      job,
      expect.objectContaining({
        width: 8,
        height: 6,
        scanner: "ClamAV test/database",
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }),
    );
    expect(store.fail).not.toHaveBeenCalled();
  });

  it.each([
    new ProcessingError("scanner_timeout", true),
    new ProcessingError("scanner_unavailable", true),
    new ProcessingError("scanner_infected", false, true),
    new ProcessingError("scanner_scan_failed", true),
  ])(
    "never writes or approves a file when scanning fails: %s",
    async (error) => {
      const { worker, store, storage, scanner, job } = workerHarness(
        await png(),
      );
      scanner.scan.mockRejectedValue(error);
      await worker.runOnce();
      expect(store.fail).toHaveBeenCalledWith(job, error);
      expect(storage.writeCopy).not.toHaveBeenCalled();
      expect(store.complete).not.toHaveBeenCalled();
    },
  );

  it("does not copy after a deleted/replaced/expired claim", async () => {
    const { worker, store, storage } = workerHarness(await png());
    store.planCopy.mockResolvedValue(false);
    await worker.runOnce();
    expect(storage.writeCopy).not.toHaveBeenCalled();
    expect(store.complete).not.toHaveBeenCalled();
  });

  it("keeps durable cleanup intent when copy fails and never publishes it", async () => {
    const { worker, store, storage } = workerHarness(await png());
    storage.writeCopy.mockRejectedValue(new Error("connection lost"));
    await worker.runOnce();
    expect(store.planCopy).toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ retryable: true }),
    );
    expect(store.complete).not.toHaveBeenCalled();
  });

  it("retries orphan cleanup without preventing subsequent jobs", async () => {
    const { worker, store, storage } = workerHarness(await png());
    store.nextCleanup.mockResolvedValue({
      id: "cleanup-id",
      bucket: "media",
      path: "private/objects/verified/old",
      attempts: 1,
    });
    storage.removeObject.mockRejectedValue(new Error("unavailable"));
    await worker.runOnce();
    expect(store.cleanupFailed).toHaveBeenCalledWith("cleanup-id", 1);
    expect(store.complete).toHaveBeenCalled();
  });

  it("caps retry backoff", () => {
    expect([1, 2, 3, 20].map((attempt) => retryDelay(attempt, 10000))).toEqual([
      10000, 20000, 40000, 300000,
    ]);
  });
});

describe("Media finalization handoff", () => {
  function harness(head: Record<string, unknown>) {
    const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "media-id", ...data }),
    );
    const service = new MediaService({
      media: { findFirst: jest.fn().mockResolvedValue(null), create },
    } as unknown as PrismaService);
    // Exercise actual finalization and its atomic nested-create payload without
    // requiring a storage server for focused service tests.
    const send = jest.fn();
    Object.assign(service, { internalS3: { send } });
    const input = {
      path: "uploads/processing/sample.png",
      filename: "sample.png",
      mimeType: "image/png",
      accessClass: "PUBLIC",
      scope: "panel",
      actorUserId: "00000000-0000-4000-8000-000000000001",
      actorRole: "admin",
    };
    const binding = signUploadBinding(
      {
        ...input,
        bucket: "media",
        ownerId: input.actorUserId,
        entityType: null,
        entityId: null,
      },
      process.env.MEDIA_DELETE_CONFIRM_SECRET!,
    );
    send.mockResolvedValue({
      ...head,
      Metadata: { [UPLOAD_BINDING_METADATA]: binding },
    });
    return { service, create, input, send, binding };
  }

  it("atomically creates an unapproved upload plus its job without trusting a claimed checksum", async () => {
    const { service, create, input, binding } = harness({
      ContentLength: 90,
      ContentType: "image/png",
      ETag: '"etag"',
    });
    const hash = "a".repeat(64);
    await service.finalizeUpload({ ...input, sha256: hash });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        scanStatus: "QUEUED",
        sha256: null,
        etag: "etag",
        processingJob: {
          create: {
            expectedSha256: hash,
            expectedUploadBinding: binding,
            maxAttempts: 5,
          },
        },
      }) as unknown,
    });
  });

  it("rejects another actor's upload and unsigned legacy objects before creating a row", async () => {
    const { service, create, input, send } = harness({
      ContentLength: 90,
      ContentType: "image/png",
      ETag: '"etag"',
    });
    await expect(
      service.finalizeUpload({
        ...input,
        actorUserId: "00000000-0000-4000-8000-000000000099",
      }),
    ).rejects.toThrow("upload_authorization_mismatch");
    send.mockResolvedValue({
      ContentLength: 90,
      ContentType: "image/png",
      ETag: '"etag"',
    });
    await expect(service.finalizeUpload(input)).rejects.toThrow(
      "upload_authorization_mismatch",
    );
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    [
      {
        ContentLength: 21 * 1024 * 1024,
        ContentType: "image/png",
        ETag: '"etag"',
      },
      "upload_too_large",
    ],
    [
      { ContentLength: 90, ContentType: "image/webp", ETag: '"etag"' },
      "upload_declared_mime_mismatch",
    ],
    [
      { ContentLength: 90, ContentType: "image/png" },
      "upload_integrity_missing",
    ],
  ])(
    "rejects invalid storage facts before creating a row",
    async (head, code) => {
      const { service, create, input } = harness(head);
      await expect(service.finalizeUpload(input)).rejects.toThrow(code);
      expect(create).not.toHaveBeenCalled();
    },
  );
});
