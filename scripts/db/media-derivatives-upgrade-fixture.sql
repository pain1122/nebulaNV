-- Disposable database only: synthetic completed-source and orphan-cleanup facts.
-- No processing worker runs against this proof database.
INSERT INTO "MediaVerifiedSource" ("mediaId", "bucket", "path", "sha256", "mimeType", "sizeBytes", "width", "height", "scanner", "scannedAt")
VALUES ('f6000000-0000-4000-8000-000000000004', 'media', 'private/verified/upgrade-proof/source',
  repeat('a',64), 'image/png', 100, 8, 6, 'disposable proof fixture', timestamp '2026-10-05');
INSERT INTO "MediaObjectCleanup" ("id", "bucket", "path", "availableAt")
VALUES ('f6000000-0000-4000-8000-000000000090', 'media', 'private/orphan/upgrade-proof', timestamp '2026-10-05');
CREATE TABLE "_media_derivative_upgrade_jobs" AS SELECT "id", to_jsonb(j) AS facts FROM "MediaProcessingJob" j;
CREATE TABLE "_media_derivative_upgrade_sources" AS SELECT "mediaId" AS "id", to_jsonb(v) AS facts FROM "MediaVerifiedSource" v;
CREATE TABLE "_media_derivative_upgrade_cleanup" AS SELECT "id", to_jsonb(c) AS facts FROM "MediaObjectCleanup" c;
