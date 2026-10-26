import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaClient } from "../prisma/generated";
import type { PrismaService } from "../src/prisma.service";
import {
  derivativeFacts,
  MediaDerivativeStore,
  type SavedOutput,
} from "../src/processing/media-derivative.store";
import { generateImageDerivatives } from "../src/processing/image-recipes";
import { ProcessingError } from "../src/processing/processing-policy";

const suite =
  process.env.MEDIA_PROCESSING_DB_PROOF === "1" ? describe : describe.skip;
suite("saved image generations on PostgreSQL", () => {
  let prisma: PrismaClient;
  let store: MediaDerivativeStore;
  const ids: string[] = [];
  const paths: string[] = [];
  const recipe = [
    { view: "card", width: 8, height: 8, fit: "cover", format: "png" },
  ];
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      process.env.NODE_ENV === "production" ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !/^\/nebula_media_verify_[a-z0-9]{1,12}$/.test(url.pathname)
    )
      throw new Error(
        "media_derivative_proof_requires_disposable_local_database",
      );
    prisma = new PrismaClient({ datasourceUrl: url.toString() });
    await prisma.$connect();
    store = new MediaDerivativeStore(prisma as unknown as PrismaService);
  });
  afterEach(async () => {
    await prisma.media.deleteMany({ where: { id: { in: ids.splice(0) } } });
    await prisma.mediaObjectCleanup.deleteMany({
      where: { bucket: "media", path: { in: paths.splice(0) } },
    });
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });
  async function source() {
    const id = randomUUID();
    ids.push(id);
    const bytes = await sharp({
      create: { width: 16, height: 12, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const row = await prisma.media.create({
      data: {
        id,
        storage: "s3",
        bucket: "media",
        path: `uploads/derivative-proof/${id}.png`,
        filename: "proof.png",
        mimeType: "image/png",
        sizeBytes: bytes.length,
        status: "READY",
        scanStatus: "CLEAN",
        accessClass: "PUBLIC",
        visibility: "public",
        scope: "panel",
        verifiedSource: {
          create: {
            bucket: "media",
            path: `private/verified/${id}`,
            sha256,
            width: 16,
            height: 12,
            sizeBytes: bytes.length,
            mimeType: "image/png",
            scanner: "proof",
            scannedAt: new Date(),
          },
        },
      },
      include: { verifiedSource: true },
    });
    return { row, bytes };
  }
  async function copies(
    job: NonNullable<Awaited<ReturnType<MediaDerivativeStore["claim"]>>>,
    bytes: Buffer,
  ): Promise<SavedOutput[]> {
    const row = await store.source(job.mediaId);
    const result = await generateImageDerivatives(
      { ...derivativeFacts(row), bytes },
      job.recipes as unknown[],
    );
    return result.map((o) => {
      const path = `private/derivative-proof/${job.id}/${job.leaseToken}/${o.view}`;
      paths.push(path);
      return { ...o, bucket: "media", path };
    });
  }
  it("deduplicates concurrent requests and gives only one worker the generation", async () => {
    const { row } = await source();
    const generations = await Promise.all([
      store.enqueue(row.id, recipe),
      store.enqueue(row.id, recipe),
    ]);
    expect(generations[0]).toBe(generations[1]);
    expect(await prisma.mediaDerivativeGeneration.count()).toBe(1);
    const claims = await Promise.all([store.claim(), store.claim()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
  });
  it("recovers expired leases and refuses the old worker's publication", async () => {
    const { row, bytes } = await source();
    await store.enqueue(row.id, recipe);
    const old = (await store.claim())!;
    await prisma.mediaDerivativeGeneration.update({
      where: { id: old.id },
      data: { leaseUntil: new Date(Date.now() - 1000) },
    });
    const resumed = (await store.claim())!;
    expect(resumed.attempts).toBe(2);
    expect(resumed.leaseToken).not.toBe(old.leaseToken);
    const output = await copies(resumed, bytes);
    expect(await store.planCopies(old, output)).toBe(false);
    expect(await store.complete(old, output)).toBe(false);
    expect(await store.planCopies(resumed, output)).toBe(true);
    expect(await store.complete(resumed, output)).toBe(true);
    expect((await store.snapshot(row.id)).approvedGenerationId).toBe(
      resumed.id,
    );
  });
  it("keeps the approved set through failures and replaces all sizes atomically", async () => {
    const { row, bytes } = await source();
    const before = JSON.stringify(
      await prisma.media.findUnique({ where: { id: row.id } }),
    );
    await store.enqueue(row.id, recipe);
    const first = (await store.claim())!;
    const original = await copies(first, bytes);
    await store.planCopies(first, original);
    await store.complete(first, original);
    const replacement = [
      ...recipe,
      { view: "thumbnail", width: 4, height: 4, fit: "cover", format: "png" },
    ];
    const failed = await store.enqueue(row.id, replacement);
    const attempt = (await store.claim())!;
    await store.fail(attempt, new ProcessingError("test_failure"));
    expect((await store.snapshot(row.id)).approvedGenerationId).toBe(first.id);
    expect(await store.enqueue(row.id, replacement)).toBe(failed);
    const retry = await store.enqueue(row.id, replacement, true);
    expect(retry).not.toBe(failed);
    const job = (await store.claim())!;
    const output = await copies(job, bytes);
    await store.planCopies(job, output);
    // A rejected partial publication rolls its transaction back.
    await expect(store.complete(job, output.slice(0, 1))).rejects.toThrow(
      "derivative_output_facts_invalid",
    );
    expect((await store.snapshot(row.id)).outputs).toHaveLength(1);
    expect(await store.complete(job, output)).toBe(true);
    const state = await store.snapshot(row.id);
    expect(state.approvedGenerationId).toBe(job.id);
    expect(state.outputs).toHaveLength(2);
    expect(
      await prisma.mediaObjectCleanup.count({
        where: { path: { in: original.map((o) => o.path) } },
      }),
    ).toBe(1);
    expect(
      await prisma.mediaObjectCleanup.count({
        where: { path: { in: output.map((o) => o.path) } },
      }),
    ).toBe(0);
    expect(
      JSON.stringify(await prisma.media.findUnique({ where: { id: row.id } })),
    ).toBe(before);
  });
  it("fences superseded generation and deletion while preserving orphan cleanup", async () => {
    const { row, bytes } = await source();
    await store.enqueue(row.id, recipe);
    const old = (await store.claim())!;
    const output = await copies(old, bytes);
    await store.planCopies(old, output);
    await store.enqueue(row.id, [{ ...recipe[0], width: 4 }]);
    expect(await store.complete(old, output)).toBe(false);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Media" WHERE "id" = ${row.id}::uuid FOR UPDATE`;
      await store.cancelForDeletion(tx, row.id);
      await tx.media.delete({ where: { id: row.id } });
    });
    expect(await store.complete(old, output)).toBe(false);
    expect(await prisma.mediaDerivativeState.count()).toBe(0);
    expect(
      await prisma.mediaObjectCleanup.count({
        where: { path: { in: output.map((o) => o.path) } },
      }),
    ).toBe(1);
  });
  it("rejects watermark revocation at publication and at public delivery", async () => {
    const { row, bytes } = await source();
    const wm = await source();
    await store.enqueue(row.id, [
      {
        ...recipe[0],
        watermark: {
          kind: "image",
          mediaId: wm.row.id,
          width: 2,
          height: 2,
          margin: 0,
        },
      },
    ]);
    const job = (await store.claim())!;
    const recipes = job.recipes as unknown[];
    const images = await generateImageDerivatives(
      { ...derivativeFacts(row), bytes },
      recipes,
      {
        resolveWatermark: () =>
          Promise.resolve({ ...derivativeFacts(wm.row), bytes: wm.bytes }),
      },
    );
    const output = images.map((o) => {
      const path = `private/derivative-proof/${job.id}/${o.view}`;
      paths.push(path);
      return { ...o, bucket: "media", path };
    });
    await store.planCopies(job, output);
    await prisma.media.update({
      where: { id: wm.row.id },
      data: { status: "BLOCKED" },
    });
    expect(await store.complete(job, output)).toBe(false);
    expect((await store.snapshot(row.id)).approvedGenerationId).toBe("");
    await prisma.media.update({
      where: { id: wm.row.id },
      data: { status: "READY" },
    });
    await store.enqueue(row.id, recipes);
    const resumed = (await store.claim())!;
    const restored = output.map((o) => ({ ...o, path: `${o.path}-retry` }));
    paths.push(...restored.map((o) => o.path));
    await store.planCopies(resumed, restored);
    expect(await store.complete(resumed, restored)).toBe(true);
    expect((await store.publicOutput(row.id, "card")).sha256).toBe(
      restored[0].sha256,
    );
    await prisma.media.update({
      where: { id: wm.row.id },
      data: { status: "BLOCKED" },
    });
    await expect(store.publicOutput(row.id, "card")).rejects.toMatchObject({
      status: 403,
    });
  });
});
