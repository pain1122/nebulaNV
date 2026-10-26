import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma, type MediaDerivativeGeneration } from "../../prisma/generated";
import { PrismaService } from "../prisma.service";
import {
  assertImageWatermarkContext,
  imagePresets,
  imageRecipeRegion,
  IMAGE_PROCESSOR_VERSION,
  type VerifiedImage,
  type ImageRecipe,
  generateImageDerivatives,
} from "./image-recipes";
import {
  DERIVATIVE_LEASE_MS,
  SERVER_IMAGE_FONT,
  derivativeRequestHash,
} from "./derivative-policy";
import {
  ProcessingError,
  processingPolicy,
  retryDelay,
} from "./processing-policy";

type Tx = Prisma.TransactionClient;
type Approved = Prisma.MediaGetPayload<{ include: { verifiedSource: true } }>;
type WatermarkPin = { mediaId: string; sha256: string };
export type SavedOutput = Awaited<
  ReturnType<typeof generateImageDerivatives>
>[number] & { bucket: string; path: string };
const json = (value: unknown) => value as Prisma.InputJsonValue;

export function derivativeFacts(row: Approved): Omit<VerifiedImage, "bytes"> {
  if (
    !row.verifiedSource ||
    row.storage !== "s3" ||
    row.status !== "READY" ||
    row.scanStatus !== "CLEAN"
  )
    throw new ConflictException("derivative_source_not_verified");
  return {
    mediaId: row.id,
    sha256: row.verifiedSource.sha256,
    width: row.verifiedSource.width,
    height: row.verifiedSource.height,
    status: "READY",
    scanStatus: "CLEAN",
    accessClass: row.accessClass,
    visibility: row.visibility,
    ownerId: row.ownerId,
    scope: row.scope,
    entityType: row.entityType,
    entityId: row.entityId,
  };
}

export function watermarkPins(value: Prisma.JsonValue): WatermarkPin[] {
  if (!Array.isArray(value) || value.length > 4)
    throw new ProcessingError("derivative_watermark_pins_invalid");
  return value.map((pin) => {
    if (
      !pin ||
      typeof pin !== "object" ||
      Array.isArray(pin) ||
      typeof pin.mediaId !== "string" ||
      typeof pin.sha256 !== "string"
    )
      throw new ProcessingError("derivative_watermark_pins_invalid");
    return { mediaId: pin.mediaId, sha256: pin.sha256 };
  });
}

@Injectable()
export class MediaDerivativeStore {
  constructor(private readonly prisma: PrismaService) {}

  private async lockMedia(tx: Tx, ids: string[]) {
    const values = [...new Set(ids)]
      .sort()
      .map((id) => Prisma.sql`${id}::uuid`);
    await tx.$queryRaw`SELECT "id" FROM "Media" WHERE "id" IN (${Prisma.join(values)}) ORDER BY "id" FOR UPDATE`;
  }

  async source(
    id: string,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<Approved> {
    const row = await tx.media.findUnique({
      where: { id },
      include: { verifiedSource: true },
    });
    if (!row) throw new NotFoundException("media_not_found");
    derivativeFacts(row);
    return row;
  }

  async enqueue(
    mediaId: string,
    input?: unknown[],
    retryFailed = false,
    onlyIfMissing = false,
  ) {
    let recipes: ImageRecipe[];
    try {
      recipes =
        input === undefined
          ? imagePresets(process.env.MEDIA_IMAGE_PRESETS)
          : imagePresets(JSON.stringify(input));
    } catch (error) {
      throw new BadRequestException(
        error instanceof ProcessingError ? error.code : "image_recipe_invalid",
      );
    }
    const markIds = [
      ...new Set(
        recipes.flatMap((r) =>
          r.watermark?.mediaId ? [r.watermark.mediaId] : [],
        ),
      ),
    ].sort();
    return this.prisma.$transaction(async (tx) => {
      await this.lockMedia(tx, [mediaId, ...markIds]);
      const source = await this.source(mediaId, tx);
      const facts = derivativeFacts(source);
      try {
        for (const recipe of recipes) imageRecipeRegion(facts, recipe);
      } catch (error) {
        throw new BadRequestException(
          error instanceof ProcessingError
            ? error.code
            : "image_recipe_invalid",
        );
      }
      const state = await tx.mediaDerivativeState.findUnique({
        where: { mediaId },
        include: { desiredGeneration: true },
      });
      if (onlyIfMissing && state) return state.desiredGenerationId;
      const pins: WatermarkPin[] = [];
      for (const id of markIds) {
        const row = await this.source(id, tx);
        const watermark = derivativeFacts(row);
        try {
          assertImageWatermarkContext(facts, watermark);
        } catch {
          throw new ForbiddenException("image_watermark_context_denied");
        }
        pins.push({ mediaId: row.id, sha256: watermark.sha256 });
      }
      const fontSha256 = recipes.some((r) => r.watermark?.kind === "text")
        ? SERVER_IMAGE_FONT.sha256
        : null;
      const requestHash = derivativeRequestHash({
        sourceSha256: facts.sha256,
        recipes,
        watermarks: pins,
        fontSha256,
        fontFamily: fontSha256 ? SERVER_IMAGE_FONT.family : null,
        processorVersion: IMAGE_PROCESSOR_VERSION,
      });
      const previous = state?.desiredGeneration;
      if (
        previous?.requestHash === requestHash &&
        (previous.status !== "FAILED" || !retryFailed) &&
        previous.status !== "CANCELLED"
      )
        return previous.id;
      if (previous)
        await tx.mediaDerivativeGeneration.updateMany({
          where: { id: previous.id, status: { in: ["QUEUED", "PROCESSING"] } },
          data: {
            status: "CANCELLED",
            leaseToken: null,
            leaseUntil: null,
            lastError: "derivative_superseded",
          },
        });
      const generation = await tx.mediaDerivativeGeneration.create({
        data: {
          mediaId,
          requestHash,
          sourceSha256: facts.sha256,
          recipes: json(recipes),
          watermarks: json(pins),
          fontSha256,
          maxAttempts: Math.min(5, processingPolicy().maxAttempts),
        },
      });
      await tx.mediaDerivativeState.upsert({
        where: { mediaId },
        create: { mediaId, desiredGenerationId: generation.id },
        update: { desiredGenerationId: generation.id },
      });
      return generation.id;
    });
  }

  async discoverDefault() {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT m."id" FROM "Media" m
      JOIN "MediaVerifiedSource" v ON v."mediaId" = m."id"
      LEFT JOIN "MediaDerivativeState" s ON s."mediaId" = m."id"
      WHERE s."mediaId" IS NULL AND m."status" = 'READY' AND m."scanStatus" = 'CLEAN' AND m."storage" = 's3'
      ORDER BY v."createdAt", m."id" LIMIT 1`;
    if (rows[0]) {
      try {
        await this.enqueue(rows[0].id, undefined, false, true);
      } catch (error) {
        if (
          !(error instanceof NotFoundException) &&
          !(error instanceof ConflictException)
        )
          throw error;
      }
    }
  }

  async claim(): Promise<MediaDerivativeGeneration | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; now: Date }>
      >`SELECT g."id", CURRENT_TIMESTAMP AS "now" FROM "MediaDerivativeGeneration" g
        JOIN "MediaDerivativeState" s ON s."desiredGenerationId" = g."id" AND s."mediaId" = g."mediaId"
        JOIN "Media" m ON m."id" = g."mediaId" JOIN "MediaVerifiedSource" v ON v."mediaId" = m."id"
        WHERE m."status" = 'READY' AND m."scanStatus" = 'CLEAN' AND v."sha256" = g."sourceSha256" AND
        ((g."status" = 'QUEUED' AND g."availableAt" <= CURRENT_TIMESTAMP) OR (g."status" = 'PROCESSING' AND g."leaseUntil" <= CURRENT_TIMESTAMP))
        ORDER BY g."availableAt", g."createdAt", g."id" LIMIT 1 FOR UPDATE OF m,g SKIP LOCKED`;
      if (!rows[0]) return null;
      const job = await tx.mediaDerivativeGeneration.findUniqueOrThrow({
        where: { id: rows[0].id },
      });
      if (job.attempts >= job.maxAttempts) {
        await tx.mediaDerivativeGeneration.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            lastError: "derivative_attempts_exhausted",
            leaseToken: null,
            leaseUntil: null,
          },
        });
        return null;
      }
      return tx.mediaDerivativeGeneration.update({
        where: { id: job.id },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          leaseToken: randomUUID(),
          leaseUntil: new Date(rows[0].now.getTime() + DERIVATIVE_LEASE_MS),
        },
      });
    });
  }

  private async lockClaim(tx: Tx, job: MediaDerivativeGeneration) {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT g."id" FROM "MediaDerivativeGeneration" g
      JOIN "Media" m ON m."id" = g."mediaId" JOIN "MediaDerivativeState" s ON s."desiredGenerationId" = g."id" AND s."mediaId" = g."mediaId"
      WHERE g."id" = ${job.id}::uuid AND g."status" = 'PROCESSING' AND g."leaseToken" = ${job.leaseToken}::uuid AND g."leaseUntil" > CURRENT_TIMESTAMP FOR UPDATE OF m,g`;
    return rows.length === 1;
  }

  async planCopies(job: MediaDerivativeGeneration, outputs: SavedOutput[]) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockClaim(tx, job))) return false;
      await tx.mediaObjectCleanup.createMany({
        data: outputs.map((output) => ({
          bucket: output.bucket,
          path: output.path,
          availableAt: new Date(
            job.leaseUntil!.getTime() + processingPolicy().ioTimeoutMs * 2,
          ),
        })),
      });
      return true;
    });
  }

  async complete(job: MediaDerivativeGeneration, outputs: SavedOutput[]) {
    return this.prisma.$transaction(async (tx) => {
      const pins = watermarkPins(job.watermarks);
      await this.lockMedia(tx, [job.mediaId, ...pins.map((p) => p.mediaId)]);
      if (!(await this.lockClaim(tx, job))) return false;
      try {
        const source = derivativeFacts(await this.source(job.mediaId, tx));
        if (source.sha256 !== job.sourceSha256)
          throw new ProcessingError("image_source_changed");
        for (const pin of pins) {
          const wm = derivativeFacts(await this.source(pin.mediaId, tx));
          assertImageWatermarkContext(source, wm);
          if (wm.sha256 !== pin.sha256)
            throw new ProcessingError("image_watermark_changed");
        }
      } catch (error) {
        if (
          !(error instanceof ProcessingError) &&
          !(error instanceof ConflictException) &&
          !(error instanceof NotFoundException)
        )
          throw error;
        await tx.mediaDerivativeGeneration.update({
          where: { id: job.id },
          data: {
            status: "CANCELLED",
            lastError: "derivative_eligibility_changed",
            leaseToken: null,
            leaseUntil: null,
          },
        });
        return false;
      }
      const recipes = imagePresets(JSON.stringify(job.recipes));
      if (
        outputs.length !== recipes.length ||
        new Set(outputs.map((o) => o.view)).size !== outputs.length ||
        outputs.some(
          (o) =>
            o.sourceSha256 !== job.sourceSha256 ||
            !recipes.some(
              (r) =>
                r.view === o.view &&
                JSON.stringify(r) === JSON.stringify(o.recipe),
            ) ||
            o.fontSha256 !==
              (o.recipe.watermark?.kind === "text" ? job.fontSha256 : null) ||
            o.fontFamily !==
              (o.recipe.watermark?.kind === "text"
                ? SERVER_IMAGE_FONT.family
                : null) ||
            o.watermarkSha256 !==
              (pins.find((p) => p.mediaId === o.recipe.watermark?.mediaId)
                ?.sha256 ?? null),
        )
      )
        throw new ProcessingError("derivative_output_facts_invalid");
      const state = await tx.mediaDerivativeState.findUniqueOrThrow({
        where: { mediaId: job.mediaId },
      });
      if (state.approvedGenerationId) {
        const old = await tx.mediaDerivative.findMany({
          where: { generationId: state.approvedGenerationId },
        });
        for (const output of old)
          await tx.mediaObjectCleanup.upsert({
            where: {
              bucket_path: { bucket: output.bucket, path: output.path },
            },
            create: {
              bucket: output.bucket,
              path: output.path,
              availableAt: new Date(Date.now() + 60_000),
            },
            update: {},
          });
        await tx.mediaDerivativeGeneration.update({
          where: { id: state.approvedGenerationId },
          data: { retiredAt: new Date() },
        });
      }
      await tx.mediaDerivative.createMany({
        data: outputs.map((o) => ({
          id: randomUUID(),
          mediaId: job.mediaId,
          generationId: job.id,
          view: o.view,
          recipe: json(o.recipe),
          recipeHash: o.recipeHash,
          processorVersion: o.processorVersion,
          sourceSha256: o.sourceSha256,
          watermarkMediaId: o.recipe.watermark?.mediaId ?? null,
          watermarkSha256: o.watermarkSha256,
          fontSha256: o.fontSha256,
          fontFamily: o.fontFamily,
          bucket: o.bucket,
          path: o.path,
          sha256: o.sha256,
          mimeType: o.mimeType,
          width: o.width,
          height: o.height,
          sizeBytes: o.sizeBytes,
        })),
      });
      await tx.mediaDerivativeGeneration.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          lastError: null,
          leaseToken: null,
          leaseUntil: null,
        },
      });
      await tx.mediaDerivativeState.update({
        where: { mediaId: job.mediaId },
        data: { approvedGenerationId: job.id },
      });
      await tx.mediaObjectCleanup.deleteMany({
        where: { OR: outputs.map((o) => ({ bucket: o.bucket, path: o.path })) },
      });
      return true;
    });
  }

  async fail(job: MediaDerivativeGeneration, error: ProcessingError) {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockClaim(tx, job))) return false;
      const retry = error.retryable && job.attempts < job.maxAttempts;
      await tx.mediaDerivativeGeneration.update({
        where: { id: job.id },
        data: {
          status: retry ? "QUEUED" : "FAILED",
          lastError: error.code,
          leaseToken: null,
          leaseUntil: null,
          availableAt: new Date(
            Date.now() + retryDelay(job.attempts, processingPolicy().retryMs),
          ),
        },
      });
      return true;
    });
  }

  async snapshot(mediaId: string) {
    const exists = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("media_not_found");
    const state = await this.prisma.mediaDerivativeState.findUnique({
      where: { mediaId },
      include: {
        desiredGeneration: true,
        approvedGeneration: {
          include: { outputs: { orderBy: { view: "asc" } } },
        },
      },
    });
    return {
      mediaId,
      desiredGenerationId: state?.desiredGenerationId ?? "",
      approvedGenerationId: state?.approvedGenerationId ?? "",
      status: state?.desiredGeneration?.status ?? "NONE",
      lastError: state?.desiredGeneration?.lastError ?? "",
      attempts: state?.desiredGeneration?.attempts ?? 0,
      outputs: (state?.approvedGeneration?.outputs ?? []).map((o) => ({
        view: o.view,
        generationId: o.generationId,
        recipeHash: o.recipeHash,
        sha256: o.sha256,
        mimeType: o.mimeType,
        width: o.width,
        height: o.height,
        sizeBytes: o.sizeBytes,
        renderPath: `/api/v1/media/render/${mediaId}?variant=${o.view}`,
      })),
    };
  }

  async publicOutput(mediaId: string, view: string) {
    const state = await this.prisma.mediaDerivativeState.findUnique({
      where: { mediaId },
      include: {
        approvedGeneration: { include: { outputs: { where: { view } } } },
      },
    });
    const output = state?.approvedGeneration?.outputs[0];
    if (!output) throw new NotFoundException("media_size_not_ready");
    if (
      state.approvedGeneration?.status !== "COMPLETED" ||
      state.approvedGeneration.retiredAt
    )
      throw new ForbiddenException("media_not_available");
    try {
      const source = derivativeFacts(await this.source(mediaId));
      if (
        source.accessClass !== "PUBLIC" ||
        source.visibility !== "public" ||
        source.scope !== "panel" ||
        source.sha256 !== output.sourceSha256
      )
        throw new ForbiddenException("media_not_available");
      if (output.watermarkMediaId) {
        const mark = derivativeFacts(
          await this.source(output.watermarkMediaId),
        );
        assertImageWatermarkContext(source, mark);
        if (mark.sha256 !== output.watermarkSha256)
          throw new ForbiddenException("media_not_available");
      }
    } catch (error) {
      if (
        error instanceof ProcessingError ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw new ForbiddenException("media_not_available");
      throw error;
    }
    return output;
  }

  async cancelForDeletion(tx: Tx, mediaId: string) {
    await tx.mediaDerivativeGeneration.updateMany({
      where: { mediaId, status: { in: ["QUEUED", "PROCESSING"] } },
      data: {
        status: "CANCELLED",
        leaseToken: null,
        leaseUntil: null,
        lastError: "media_deleted",
      },
    });
    const outputs = await tx.mediaDerivative.findMany({
      where: { mediaId, generation: { retiredAt: null } },
    });
    for (const output of outputs)
      await tx.mediaObjectCleanup.upsert({
        where: { bucket_path: { bucket: output.bucket, path: output.path } },
        create: {
          bucket: output.bucket,
          path: output.path,
          availableAt: new Date(),
        },
        update: { availableAt: new Date() },
      });
  }
}
