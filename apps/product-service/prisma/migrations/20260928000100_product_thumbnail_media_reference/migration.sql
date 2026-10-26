-- Preserve legacy URLs for an explicit, Media-verified backfill. New public
-- responses derive the render path only from a validated Media ID.
ALTER TABLE "Product" ADD COLUMN "thumbnailMediaId" UUID;

CREATE INDEX "Product_thumbnailMediaId_idx" ON "Product"("thumbnailMediaId");
