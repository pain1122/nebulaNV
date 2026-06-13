ALTER TABLE "public"."Media"
ADD COLUMN "folderPath" TEXT NOT NULL DEFAULT '/',
ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "originalFilename" TEXT;

CREATE INDEX "Media_folderPath_idx" ON "public"."Media"("folderPath");
CREATE INDEX "Media_displayName_idx" ON "public"."Media"("displayName");
CREATE INDEX "Media_scope_folderPath_idx" ON "public"."Media"("scope", "folderPath");
