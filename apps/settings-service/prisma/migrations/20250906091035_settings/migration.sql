/*
  Warnings:

  - The primary key for the `app_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `meta` on the `app_settings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ix_settings_ns_key";

-- AlterTable
ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_pkey",
DROP COLUMN "meta",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "namespace" DROP DEFAULT,
ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");

-- RenameIndex
ALTER INDEX "ux_settings_ns_env_key" RENAME TO "app_settings_namespace_env_key_uq";
