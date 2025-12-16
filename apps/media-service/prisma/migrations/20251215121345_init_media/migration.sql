-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" UUID NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'local',
    "bucket" TEXT,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "ownerId" UUID,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "scope" TEXT NOT NULL DEFAULT 'panel',
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_sha256_key" ON "public"."Media"("sha256");

-- CreateIndex
CREATE INDEX "Media_ownerId_idx" ON "public"."Media"("ownerId");

-- CreateIndex
CREATE INDEX "Media_visibility_idx" ON "public"."Media"("visibility");
