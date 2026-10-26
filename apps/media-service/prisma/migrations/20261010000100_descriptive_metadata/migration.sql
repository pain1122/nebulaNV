BEGIN;
ALTER TABLE "Media" ADD COLUMN "title" TEXT, ADD COLUMN "defaultAlt" TEXT,
  ADD COLUMN "metadataVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Media" ADD CONSTRAINT "Media_title_length" CHECK (char_length("title") <= 200),
  ADD CONSTRAINT "Media_defaultAlt_length" CHECK (char_length("defaultAlt") <= 180),
  ADD CONSTRAINT "Media_metadataVersion_positive" CHECK ("metadataVersion" > 0);
COMMIT;
