-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MediaStatus" AS ENUM ('PENDING', 'READY', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."ScanStatus" AS ENUM ('NONE', 'QUEUED', 'SCANNING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" UUID NOT NULL,
    "storage" TEXT NOT NULL DEFAULT 'local',
    "bucket" TEXT,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "ownerId" UUID,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "scope" TEXT NOT NULL DEFAULT 'panel',
    "sha256" TEXT,
    "status" "public"."MediaStatus" NOT NULL DEFAULT 'PENDING',
    "scanStatus" "public"."ScanStatus" NOT NULL DEFAULT 'NONE',
    "scannedAt" TIMESTAMP(3),
    "scanError" TEXT,
    "quarantineReason" TEXT,
    "etag" TEXT,
    "promotedAt" TIMESTAMP(3),
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

-- CreateIndex
CREATE INDEX "Media_scope_idx" ON "public"."Media"("scope");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "public"."Media"("status");

-- CreateIndex
CREATE INDEX "Media_scanStatus_idx" ON "public"."Media"("scanStatus");

-- CreateIndex
CREATE INDEX "Media_promotedAt_idx" ON "public"."Media"("promotedAt");
