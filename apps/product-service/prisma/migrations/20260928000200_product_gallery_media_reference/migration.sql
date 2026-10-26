-- Existing URL-only rows remain readable by administrators for explicit
-- remediation; public gallery reads require a validated Media ID.
ALTER TABLE "ProductGalleryImage" ADD COLUMN "mediaId" UUID;

CREATE INDEX "ProductGalleryImage_mediaId_idx" ON "ProductGalleryImage"("mediaId");
