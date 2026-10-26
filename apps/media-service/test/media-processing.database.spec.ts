import { randomUUID } from "node:crypto";
import { PrismaClient } from "../prisma/generated";
import type { PrismaService } from "../src/prisma.service";
import { MediaProcessingStore } from "../src/processing/media-processing.store";
import { ProcessingError } from "../src/processing/processing-policy";
import { MediaService } from "../src/media.service";

// This test owns a disposable database. It must never claim jobs belonging to
// ordinary demo/operator uploads in nebula_media.
const proof = process.env.MEDIA_PROCESSING_DB_PROOF === "1";
const suite = proof ? describe : describe.skip;

suite("Media durable jobs on PostgreSQL", () => {
  let prisma: PrismaClient;
  let store: MediaProcessingStore;
  const ids: string[] = [];
  const paths: string[] = [];

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      process.env.NODE_ENV === "production" ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/nebula_media_verify_[a-z0-9]{1,12}$/.test(url.pathname)
    )
      throw new Error(
        "media_processing_proof_requires_disposable_local_database",
      );
    prisma = new PrismaClient({ datasourceUrl: url.toString() });
    await prisma.$connect();
    store = new MediaProcessingStore(prisma as unknown as PrismaService);
  });

  afterEach(async () => {
    if (!prisma) return;
    await prisma.media.deleteMany({ where: { id: { in: ids.splice(0) } } });
    await prisma.mediaObjectCleanup.deleteMany({
      where: { bucket: "media", path: { in: paths.splice(0) } },
    });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function upload(maxAttempts = 5) {
    const id = randomUUID();
    ids.push(id);
    return prisma.media.create({
      data: {
        id,
        storage: "s3",
        bucket: "media",
        path: `uploads/job-proof/${id}.png`,
        filename: `${id}.png`,
        mimeType: "image/png",
        sizeBytes: 100,
        status: "PENDING",
        scanStatus: "QUEUED",
        etag: "test-etag",
        processingJob: { create: { maxAttempts } },
      },
    });
  }
  function facts(id: string) {
    const path = `private/objects/verified/job-proof/${id}/${randomUUID()}`;
    paths.push(path);
    return {
      bucket: "media",
      path,
      sha256: "a".repeat(64),
      mimeType: "image/png",
      sizeBytes: 100,
      width: 8,
      height: 6,
      scanner: "proof scanner",
    };
  }

  it("gives concurrent workers distinct claims for one queued upload", async () => {
    const media = await upload();
    const claims = await Promise.all([store.claim(), store.claim()]);
    const claimed = claims.filter((claim) => claim !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].mediaId).toBe(media.id);
    expect(claimed[0].attempts).toBe(1);
    expect(
      (await prisma.media.findUniqueOrThrow({ where: { id: media.id } }))
        .scanStatus,
    ).toBe("SCANNING");
  });

  it("recovers an expired lease and fences out its old completion", async () => {
    const media = await upload();
    const old = (await store.claim())!;
    await prisma.mediaProcessingJob.update({
      where: { id: old.id },
      data: { leaseUntil: new Date(Date.now() - 1000) },
    });
    const resumed = (await store.claim())!;
    expect(resumed.attempts).toBe(2);
    expect(resumed.leaseToken).not.toBe(old.leaseToken);
    const output = facts(media.id);
    expect(await store.complete(old, output)).toBe(false);
    expect(await store.planCopy(resumed, output.bucket, output.path)).toBe(
      true,
    );
    expect(await store.complete(resumed, output)).toBe(true);
    expect(await store.complete(resumed, output)).toBe(false);
    expect(
      (await prisma.media.findUniqueOrThrow({ where: { id: media.id } }))
        .status,
    ).toBe("READY");
    expect(
      await prisma.mediaObjectCleanup.count({ where: { path: output.path } }),
    ).toBe(0);
  });

  it("backs off dependency failures and stops at the retry limit without approval", async () => {
    const media = await upload(2);
    const first = (await store.claim())!;
    expect(
      await store.fail(first, new ProcessingError("scanner_timeout", true)),
    ).toBe(true);
    expect(await store.claim()).toBeNull();
    await prisma.mediaProcessingJob.update({
      where: { id: first.id },
      data: { availableAt: new Date(Date.now() - 1000) },
    });
    const second = (await store.claim())!;
    await store.fail(second, new ProcessingError("scanner_timeout", true));
    expect(await store.claim()).toBeNull();
    const failed = await prisma.media.findUniqueOrThrow({
      where: { id: media.id },
    });
    expect([failed.status, failed.scanStatus]).toEqual(["BLOCKED", "FAILED"]);
    expect(
      await prisma.mediaVerifiedSource.count({ where: { mediaId: media.id } }),
    ).toBe(0);
  });

  it("retains copy cleanup after Media deletion and denies late completion", async () => {
    const media = await upload();
    const job = (await store.claim())!;
    const output = facts(media.id);
    await store.planCopy(job, output.bucket, output.path);
    await prisma.media.delete({ where: { id: media.id } });
    expect(await store.complete(job, output)).toBe(false);
    expect(
      await prisma.mediaProcessingJob.count({ where: { mediaId: media.id } }),
    ).toBe(0);
    expect(
      await prisma.mediaObjectCleanup.count({ where: { path: output.path } }),
    ).toBe(1);
  });

  it("serializes deletion against completion without losing the verified copy cleanup", async () => {
    const media = await upload();
    const job = (await store.claim())!;
    const output = facts(media.id);
    await store.planCopy(job, output.bucket, output.path);
    const service = new MediaService(prisma as unknown as PrismaService);
    const send = jest
      .fn<Promise<Record<string, never>>, [unknown, unknown]>()
      .mockResolvedValue({});
    Object.assign(service, { internalS3: { send } });
    const [completed, deleted] = await Promise.all([
      store.complete(job, output),
      service.deleteById(media.id),
    ]);
    expect(deleted).toBe(true);
    expect(
      await prisma.media.findUnique({ where: { id: media.id } }),
    ).toBeNull();
    if (completed) {
      const keys = send.mock.calls.map(
        ([command]) => (command as { input: { Key: string } }).input.Key,
      );
      expect(keys).toContain(output.path);
    } else {
      expect(
        await prisma.mediaObjectCleanup.count({ where: { path: output.path } }),
      ).toBe(1);
    }
  });

  it("does not resurrect a blocked upload or collapse identical bytes into one owner record", async () => {
    const blocked = await upload();
    const job = (await store.claim())!;
    await prisma.media.update({
      where: { id: blocked.id },
      data: { status: "BLOCKED", scanStatus: "INFECTED" },
    });
    expect(await store.complete(job, facts(blocked.id))).toBe(false);
    for (let index = 0; index < 2; index++) {
      const media = await upload();
      const claimed = (await store.claim())!;
      const output = facts(media.id);
      await store.planCopy(claimed, output.bucket, output.path);
      expect(await store.complete(claimed, output)).toBe(true);
    }
    expect(
      await prisma.mediaVerifiedSource.count({
        where: { sha256: "a".repeat(64) },
      }),
    ).toBe(2);
  });
});
