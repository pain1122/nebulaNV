BEGIN;

CREATE TABLE "MediaDerivativeGeneration" (
 "id" UUID NOT NULL PRIMARY KEY, "mediaId" UUID NOT NULL,
 "requestHash" TEXT NOT NULL, "sourceSha256" TEXT NOT NULL,
 "recipes" JSONB NOT NULL, "watermarks" JSONB NOT NULL,
 "fontSha256" TEXT, "status" "MediaJobStatus" NOT NULL DEFAULT 'QUEUED',
 "attempts" INTEGER NOT NULL DEFAULT 0, "maxAttempts" INTEGER NOT NULL DEFAULT 5,
 "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseToken" UUID, "leaseUntil" TIMESTAMP(3), "lastError" TEXT,
 "completedAt" TIMESTAMP(3), "retiredAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MediaDerivativeGeneration_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "derivative_generation_hashes" CHECK ("requestHash" ~ '^[0-9a-f]{64}$' AND "sourceSha256" ~ '^[0-9a-f]{64}$' AND ("fontSha256" IS NULL OR "fontSha256" ~ '^[0-9a-f]{64}$')),
 CONSTRAINT "derivative_generation_attempts" CHECK ("attempts" >= 0 AND "maxAttempts" BETWEEN 1 AND 5 AND "attempts" <= "maxAttempts"),
 CONSTRAINT "derivative_generation_lease" CHECK (("status" = 'PROCESSING' AND "leaseToken" IS NOT NULL AND "leaseUntil" IS NOT NULL) OR ("status" <> 'PROCESSING' AND "leaseToken" IS NULL AND "leaseUntil" IS NULL)),
 CONSTRAINT "derivative_generation_recipes" CHECK (jsonb_typeof("recipes") = 'array' AND jsonb_array_length("recipes") BETWEEN 1 AND 4 AND jsonb_typeof("watermarks") = 'array' AND jsonb_array_length("watermarks") <= 4)
);
CREATE UNIQUE INDEX "MediaDerivativeGeneration_id_mediaId_key" ON "MediaDerivativeGeneration"("id", "mediaId");
CREATE INDEX "MediaDerivativeGeneration_mediaId_createdAt_idx" ON "MediaDerivativeGeneration"("mediaId", "createdAt");
CREATE INDEX "MediaDerivativeGeneration_status_availableAt_idx" ON "MediaDerivativeGeneration"("status", "availableAt");
CREATE INDEX "MediaDerivativeGeneration_status_leaseUntil_idx" ON "MediaDerivativeGeneration"("status", "leaseUntil");

CREATE TABLE "MediaDerivativeState" (
 "mediaId" UUID NOT NULL PRIMARY KEY,
 "desiredGenerationId" UUID, "approvedGenerationId" UUID,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MediaDerivativeState_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MediaDerivativeState_desiredGenerationId_mediaId_fkey" FOREIGN KEY ("desiredGenerationId", "mediaId") REFERENCES "MediaDerivativeGeneration"("id", "mediaId") ON DELETE NO ACTION ON UPDATE CASCADE,
 CONSTRAINT "MediaDerivativeState_approvedGenerationId_mediaId_fkey" FOREIGN KEY ("approvedGenerationId", "mediaId") REFERENCES "MediaDerivativeGeneration"("id", "mediaId") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE TABLE "MediaDerivative" (
 "id" UUID NOT NULL PRIMARY KEY, "mediaId" UUID NOT NULL, "generationId" UUID NOT NULL,
 "view" TEXT NOT NULL, "recipe" JSONB NOT NULL, "recipeHash" TEXT NOT NULL,
 "processorVersion" TEXT NOT NULL, "sourceSha256" TEXT NOT NULL,
 "watermarkMediaId" UUID, "watermarkSha256" TEXT, "fontSha256" TEXT, "fontFamily" TEXT,
 "bucket" TEXT NOT NULL, "path" TEXT NOT NULL, "sha256" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
 "sizeBytes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MediaDerivative_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "MediaDerivative_generationId_mediaId_fkey" FOREIGN KEY ("generationId", "mediaId") REFERENCES "MediaDerivativeGeneration"("id", "mediaId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "derivative_saved_geometry" CHECK ("width" BETWEEN 1 AND 4096 AND "height" BETWEEN 1 AND 4096 AND "width"::BIGINT * "height" <= 8000000 AND "sizeBytes" BETWEEN 1 AND 20971520),
 CONSTRAINT "derivative_saved_type" CHECK ("mimeType" IN ('image/png', 'image/jpeg', 'image/webp') AND "view" IN ('thumbnail', 'card', 'detail', 'mobile')),
 CONSTRAINT "derivative_saved_hashes" CHECK ("sha256" ~ '^[0-9a-f]{64}$' AND "sourceSha256" ~ '^[0-9a-f]{64}$' AND "recipeHash" ~ '^[0-9a-f]{64}$'),
 CONSTRAINT "derivative_watermark_facts" CHECK (("watermarkMediaId" IS NULL) = ("watermarkSha256" IS NULL) AND ("watermarkSha256" IS NULL OR "watermarkSha256" ~ '^[0-9a-f]{64}$') AND ("fontSha256" IS NULL OR "fontSha256" ~ '^[0-9a-f]{64}$'))
);
CREATE UNIQUE INDEX "MediaDerivative_path_key" ON "MediaDerivative"("path");
CREATE UNIQUE INDEX "MediaDerivative_generationId_view_key" ON "MediaDerivative"("generationId", "view");
CREATE INDEX "MediaDerivative_mediaId_idx" ON "MediaDerivative"("mediaId");
CREATE INDEX "MediaDerivative_watermarkMediaId_idx" ON "MediaDerivative"("watermarkMediaId");
COMMIT;
