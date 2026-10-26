INSERT INTO "Media" ("id", "storage", "bucket", "path", "filename", "mimeType",
  "sizeBytes", "ownerId", "visibility", "accessClass", "scope", "sha256",
  "status", "scanStatus", "scannedAt", "promotedAt", "etag", "updatedAt")
SELECT ('f6000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  storage, 'media', 'uploads/upgrade-proof/' || n || '.png', n || '.png',
  'image/png', 100, 'f6000000-0000-4000-8000-000000000099'::uuid,
  'public', 'PUBLIC'::"AccessClass", 'panel',
  CASE n WHEN 1 THEN repeat('A',64) WHEN 2 THEN 'legacy-short-claim'
    WHEN 4 THEN 'legacy-ready-checksum' END,
  status::"MediaStatus", scan::"ScanStatus",
  CASE WHEN n=4 THEN timestamp '2026-01-01 00:00:00' END,
  CASE WHEN n=4 THEN timestamp '2026-01-01 00:00:00' END,
  'legacy-etag-' || n, timestamp '2026-01-01 00:00:00'
FROM (VALUES
  (1,'s3','PENDING','NONE'), (2,'s3','PENDING','QUEUED'),
  (3,'s3','PENDING','SCANNING'), (4,'s3','READY','CLEAN'),
  (5,'s3','BLOCKED','INFECTED'), (6,'s3','DELETED','NONE'),
  (7,'s3','PENDING','FAILED'), (8,'local','PENDING','NONE')
) AS legacy(n,storage,status,scan);

CREATE TABLE "_media_processing_upgrade_snapshot" AS
SELECT "id", to_jsonb(m) AS facts FROM "Media" m;
