BEGIN;

INSERT INTO "Media" ("id", "storage", "path", "filename", "mimeType", "sizeBytes", "status", "scanStatus", "updatedAt")
VALUES ('00000000-0000-4000-8000-0000000000a1', 's3', 'uploads/proof/a.png', 'a.png', 'image/png', 100, 'PENDING', 'QUEUED', now()),
       ('00000000-0000-4000-8000-0000000000a2', 's3', 'uploads/proof/b.png', 'b.png', 'image/png', 100, 'PENDING', 'QUEUED', now());
INSERT INTO "MediaProcessingJob" ("id", "mediaId")
VALUES ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1');

DO $$ BEGIN
  BEGIN
    UPDATE "MediaProcessingJob" SET "status" = 'PROCESSING';
    RAISE EXCEPTION 'missing lease was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "MediaProcessingJob" SET "attempts" = 6;
    RAISE EXCEPTION 'exhausted attempts were accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "MediaProcessingJob" SET "leaseToken" = '00000000-0000-4000-8000-0000000000c1';
    RAISE EXCEPTION 'non-processing job retained a lease';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "MediaProcessingJob" SET "expectedUploadBinding" = 'unverified';
    RAISE EXCEPTION 'malformed upload authorization was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "MediaProcessingJob" SET "expectedSha256" = 'not-a-checksum';
    RAISE EXCEPTION 'malformed expected checksum was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO "MediaProcessingJob" ("id", "mediaId")
    VALUES ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a1');
    RAISE EXCEPTION 'duplicate job was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

UPDATE "MediaProcessingJob" SET "status" = 'PROCESSING', "attempts" = 1,
"leaseToken" = '00000000-0000-4000-8000-0000000000c1', "leaseUntil" = now() + interval '3 minutes';

-- Identical verified bytes must be allowed for independent Media identities.
INSERT INTO "MediaVerifiedSource" ("mediaId", "bucket", "path", "sha256", "mimeType", "sizeBytes", "width", "height", "scanner", "scannedAt")
VALUES ('00000000-0000-4000-8000-0000000000a1', 'media', 'private/objects/verified/proof/a', repeat('a',64), 'image/png', 100, 8, 6, 'proof scanner', now()),
       ('00000000-0000-4000-8000-0000000000a2', 'media', 'private/objects/verified/proof/b', repeat('a',64), 'image/png', 100, 8, 6, 'proof scanner', now());

INSERT INTO "MediaObjectCleanup" ("id", "bucket", "path", "availableAt")
VALUES ('00000000-0000-4000-8000-0000000000d1', 'media', 'private/objects/verified/proof/orphan', now());
DELETE FROM "Media" WHERE "id" = '00000000-0000-4000-8000-0000000000a1';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "MediaProcessingJob" WHERE "mediaId" = '00000000-0000-4000-8000-0000000000a1') THEN
    RAISE EXCEPTION 'deleted Media retained a job'; END IF;
  IF EXISTS (SELECT 1 FROM "MediaVerifiedSource" WHERE "mediaId" = '00000000-0000-4000-8000-0000000000a1') THEN
    RAISE EXCEPTION 'deleted Media retained a verified source'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "MediaObjectCleanup" WHERE "id" = '00000000-0000-4000-8000-0000000000d1') THEN
    RAISE EXCEPTION 'deletion lost independent cleanup intent'; END IF;
END $$;

ROLLBACK;
