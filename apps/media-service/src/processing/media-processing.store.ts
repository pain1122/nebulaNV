import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Prisma,
  MediaJobStatus,
  MediaStatus,
  ScanStatus,
} from "../../prisma/generated";
import { PrismaService } from "../prisma.service";
import {
  ProcessingError,
  processingPolicy,
  retryDelay,
} from "./processing-policy";

export type ClaimedJob = Prisma.MediaProcessingJobGetPayload<{
  include: { media: true };
}>;
export type VerifiedFacts = {
  bucket: string;
  path: string;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  scanner: string;
};

@Injectable()
export class MediaProcessingStore {
  constructor(private readonly prisma: PrismaService) {}

  async claim(): Promise<ClaimedJob | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; now: Date }>>`
        SELECT j."id", CURRENT_TIMESTAMP AS "now"
        FROM "MediaProcessingJob" j JOIN "Media" m ON m."id" = j."mediaId"
        WHERE m."status" = 'PENDING' AND (
          (j."status" = 'QUEUED' AND j."availableAt" <= CURRENT_TIMESTAMP) OR
          (j."status" = 'PROCESSING' AND j."leaseUntil" <= CURRENT_TIMESTAMP))
        ORDER BY j."availableAt", j."createdAt", j."id"
        LIMIT 1 FOR UPDATE OF m, j SKIP LOCKED`;
      if (!rows[0]) return null;
      const job = await tx.mediaProcessingJob.findUniqueOrThrow({
        where: { id: rows[0].id },
        include: { media: true },
      });
      if (job.attempts >= job.maxAttempts) {
        await tx.mediaProcessingJob.update({
          where: { id: job.id },
          data: {
            status: MediaJobStatus.FAILED,
            leaseToken: null,
            leaseUntil: null,
            lastError: "processing_attempts_exhausted",
          },
        });
        await tx.media.update({
          where: { id: job.mediaId },
          data: {
            status: MediaStatus.BLOCKED,
            scanStatus: ScanStatus.FAILED,
            scanError: "processing_attempts_exhausted",
            quarantineReason: "processing_attempts_exhausted",
          },
        });
        return null;
      }
      await tx.media.update({
        where: { id: job.mediaId },
        data: { scanStatus: ScanStatus.SCANNING, scanError: null },
      });
      return tx.mediaProcessingJob.update({
        where: { id: job.id },
        include: { media: true },
        data: {
          status: MediaJobStatus.PROCESSING,
          attempts: { increment: 1 },
          leaseToken: randomUUID(),
          leaseUntil: new Date(
            rows[0].now.getTime() + processingPolicy().leaseMs,
          ),
        },
      });
    });
  }

  private async lockClaim(
    tx: Prisma.TransactionClient,
    job: ClaimedJob,
  ): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT j."id" FROM "MediaProcessingJob" j JOIN "Media" m ON m."id" = j."mediaId"
      WHERE j."id" = ${job.id}::uuid AND j."leaseToken" = ${job.leaseToken}::uuid
        AND j."status" = 'PROCESSING' AND j."leaseUntil" > CURRENT_TIMESTAMP
        AND m."status" = 'PENDING'
      FOR UPDATE OF m, j`;
    return rows.length === 1;
  }

  async planCopy(
    job: ClaimedJob,
    bucket: string,
    path: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockClaim(tx, job))) return false;
      // The cleanup deadline outlives this lease and every bounded PUT. A crash
      // or failed completion leaves the intent independent of Media deletion.
      await tx.mediaObjectCleanup.create({
        data: {
          bucket,
          path,
          availableAt: new Date(
            job.leaseUntil!.getTime() + processingPolicy().ioTimeoutMs * 2,
          ),
        },
      });
      return true;
    });
  }

  async complete(job: ClaimedJob, facts: VerifiedFacts): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockClaim(tx, job))) return false;
      const [{ now }] = await tx.$queryRaw<
        Array<{ now: Date }>
      >`SELECT CURRENT_TIMESTAMP AS "now"`;
      await tx.mediaVerifiedSource.create({
        data: { mediaId: job.mediaId, ...facts, scannedAt: now },
      });
      await tx.media.update({
        where: { id: job.mediaId },
        data: {
          status: MediaStatus.READY,
          scanStatus: ScanStatus.CLEAN,
          scannedAt: now,
          promotedAt: now,
          scanError: null,
          quarantineReason: null,
          width: facts.width,
          height: facts.height,
        },
      });
      await tx.mediaProcessingJob.update({
        where: { id: job.id },
        data: {
          status: MediaJobStatus.COMPLETED,
          completedAt: now,
          lastError: null,
          leaseToken: null,
          leaseUntil: null,
        },
      });
      await tx.mediaObjectCleanup.deleteMany({
        where: { bucket: facts.bucket, path: facts.path },
      });
      return true;
    });
  }

  async fail(job: ClaimedJob, error: ProcessingError): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (!(await this.lockClaim(tx, job))) return false;
      const retry = error.retryable && job.attempts < job.maxAttempts;
      const [{ now }] = await tx.$queryRaw<
        Array<{ now: Date }>
      >`SELECT CURRENT_TIMESTAMP AS "now"`;
      await tx.mediaProcessingJob.update({
        where: { id: job.id },
        data: {
          status: retry ? MediaJobStatus.QUEUED : MediaJobStatus.FAILED,
          leaseToken: null,
          leaseUntil: null,
          lastError: error.code,
          availableAt: new Date(
            now.getTime() +
              retryDelay(job.attempts, processingPolicy().retryMs),
          ),
        },
      });
      await tx.media.update({
        where: { id: job.mediaId },
        data: {
          status: retry ? MediaStatus.PENDING : MediaStatus.BLOCKED,
          scanStatus: retry
            ? ScanStatus.QUEUED
            : error.infected
              ? ScanStatus.INFECTED
              : ScanStatus.FAILED,
          scanError: error.code,
          quarantineReason: retry ? null : error.code,
        },
      });
      return true;
    });
  }

  async nextCleanup() {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; bucket: string; path: string; attempts: number }>
    >`
      SELECT "id", "bucket", "path", "attempts" FROM "MediaObjectCleanup"
      WHERE "availableAt" <= CURRENT_TIMESTAMP ORDER BY "availableAt", "id" LIMIT 1`;
    return rows[0] ?? null;
  }

  async cleanupSucceeded(id: string) {
    // deleteMany is safe when another worker already removed the intent.
    await this.prisma.mediaObjectCleanup.deleteMany({ where: { id } });
  }

  async cleanupFailed(id: string, attempts: number) {
    await this.prisma.mediaObjectCleanup.updateMany({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: "storage_cleanup_failed",
        availableAt: new Date(
          Date.now() + retryDelay(attempts + 1, processingPolicy().retryMs),
        ),
      },
    });
  }
}
