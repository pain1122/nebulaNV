BEGIN;
INSERT INTO "Media" ("id", "storage", "path", "filename", "mimeType", "sizeBytes", "updatedAt")
VALUES ('fc100000-0000-4000-8000-000000000001','local','metadata/proof.png','proof.png','image/png',1,now());
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Media" WHERE "id"='fc100000-0000-4000-8000-000000000001' AND "title" IS NULL AND "defaultAlt" IS NULL AND "metadataVersion"=1) THEN RAISE EXCEPTION 'media_metadata_initial_state'; END IF;
  BEGIN UPDATE "Media" SET "title"=repeat('x',201) WHERE "id"='fc100000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'media_title_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE "Media" SET "defaultAlt"=repeat('x',181) WHERE "id"='fc100000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'media_alt_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE "Media" SET "metadataVersion"=0 WHERE "id"='fc100000-0000-4000-8000-000000000001'; RAISE EXCEPTION 'media_revision_limit_missing'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE "Media" SET "title"='لیوان آبی', "defaultAlt"='', "metadataVersion"=2 WHERE "id"='fc100000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Media" WHERE "id"='fc100000-0000-4000-8000-000000000001' AND "title"='لیوان آبی' AND "defaultAlt"='') THEN RAISE EXCEPTION 'media_unicode_empty_text_lost'; END IF;
END $$;
ROLLBACK;
