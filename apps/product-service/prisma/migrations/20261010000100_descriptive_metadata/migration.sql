BEGIN;
ALTER TABLE "Product" ADD COLUMN "thumbnailTitle" TEXT, ADD COLUMN "thumbnailAlt" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_thumbnailTitle_length" CHECK (char_length("thumbnailTitle") <= 200),
  ADD CONSTRAINT "Product_thumbnailAlt_length" CHECK (char_length("thumbnailAlt") <= 180);
ALTER TABLE "ProductGalleryImage" ADD COLUMN "title" TEXT,
  ADD COLUMN "metadataVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProductGalleryImage" ADD CONSTRAINT "ProductGalleryImage_title_length" CHECK (char_length("title") <= 200),
  ADD CONSTRAINT "ProductGalleryImage_metadataVersion_positive" CHECK ("metadataVersion" > 0);
-- Existing alt is deliberately preserved, including historical values and empty strings.
COMMIT;
