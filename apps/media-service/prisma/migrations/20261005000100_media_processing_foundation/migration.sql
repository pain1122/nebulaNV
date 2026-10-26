BEGIN;

CREATE TYPE "MediaJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "MediaProcessingJob" (
  "id" UUID NOT NULL,
  "mediaId" UUID NOT NULL,
  "status" "MediaJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMP(3),
  "expectedSha256" TEXT,
  "expectedUploadBinding" TEXT,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaProcessingJob_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaProcessingJob_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" BETWEEN 1 AND 20 AND "attempts" <= "maxAttempts"),
  CONSTRAINT "MediaProcessingJob_lease_check" CHECK (
    ("status" = 'PROCESSING' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL)
    OR ("status" <> 'PROCESSING' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL)),
  CONSTRAINT "MediaProcessingJob_checksum_check" CHECK ("expectedSha256" IS NULL OR "expectedSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "MediaProcessingJob_binding_check" CHECK ("expectedUploadBinding" IS NULL OR "expectedUploadBinding" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "MediaProcessingJob_mediaId_key" ON "MediaProcessingJob"("mediaId");
CREATE INDEX "MediaProcessingJob_status_availableAt_idx" ON "MediaProcessingJob"("status", "availableAt");
CREATE INDEX "MediaProcessingJob_status_leaseUntil_idx" ON "MediaProcessingJob"("status", "leaseUntil");

CREATE TABLE "MediaVerifiedSource" (
  "mediaId" UUID NOT NULL,
  "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "scanner" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaVerifiedSource_pkey" PRIMARY KEY ("mediaId"),
  CONSTRAINT "MediaVerifiedSource_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaVerifiedSource_facts_check" CHECK ("sizeBytes" > 0 AND "width" > 0 AND "height" > 0 AND "sha256" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "MediaVerifiedSource_path_key" ON "MediaVerifiedSource"("path");
CREATE INDEX "MediaVerifiedSource_sha256_idx" ON "MediaVerifiedSource"("sha256");

CREATE TABLE "MediaObjectCleanup" (
  "id" UUID NOT NULL,
  "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaObjectCleanup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaObjectCleanup_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "MediaObjectCleanup_bucket_path_key" ON "MediaObjectCleanup"("bucket", "path");
CREATE INDEX "MediaObjectCleanup_availableAt_idx" ON "MediaObjectCleanup"("availableAt");

-- Queue existing unapproved S3 uploads only. Without an upload authorization
-- binding they terminate as BLOCKED/FAILED for operator review, not approval.
-- Preserve legacy READY, BLOCKED, DELETED and FAILED rows and historical facts.
INSERT INTO "MediaProcessingJob" ("id", "mediaId", "expectedSha256")
SELECT md5('media-processing-v1:' || "id"::text)::uuid, "id",
  CASE WHEN lower("sha256") ~ '^[0-9a-f]{64}$' THEN lower("sha256") ELSE NULL END
FROM "Media" WHERE "storage" = 's3' AND "status" = 'PENDING'
AND "scanStatus" IN ('NONE', 'QUEUED', 'SCANNING');

COMMIT;
