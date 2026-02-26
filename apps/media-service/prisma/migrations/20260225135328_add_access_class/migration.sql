-- CreateEnum
CREATE TYPE "public"."AccessClass" AS ENUM ('PUBLIC', 'PROTECTED', 'STRICT');

-- AlterTable
ALTER TABLE "public"."Media" ADD COLUMN     "accessClass" "public"."AccessClass" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "Media_accessClass_idx" ON "public"."Media"("accessClass");
