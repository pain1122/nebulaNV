DO $$ BEGIN
  IF (SELECT count(*) FROM "Media") <> 8 OR EXISTS (
    SELECT 1 FROM "_media_processing_upgrade_snapshot" s
    FULL JOIN "Media" m ON m."id"=s."id"
    WHERE s."id" IS NULL OR m."id" IS NULL OR to_jsonb(m) IS DISTINCT FROM s.facts
  ) THEN RAISE EXCEPTION 'media_upgrade_changed_legacy_facts'; END IF;

  IF (SELECT count(*) FROM "MediaProcessingJob") <> 3 OR EXISTS (
    SELECT 1 FROM "MediaProcessingJob" j JOIN "Media" m ON m."id"=j."mediaId"
    WHERE m."status" <> 'PENDING' OR m."storage" <> 's3'
      OR m."scanStatus" NOT IN ('NONE','QUEUED','SCANNING')
      OR j."id" <> md5('media-processing-v1:' || m."id"::text)::uuid
      OR j."status" <> 'QUEUED' OR j."attempts" <> 0
      OR j."expectedUploadBinding" IS NOT NULL OR j."leaseToken" IS NOT NULL
      OR j."leaseUntil" IS NOT NULL OR j."completedAt" IS NOT NULL
      OR j."expectedSha256" IS DISTINCT FROM
        CASE WHEN lower(m."sha256") ~ '^[0-9a-f]{64}$' THEN lower(m."sha256") ELSE NULL END
  ) THEN RAISE EXCEPTION 'media_upgrade_backfill_not_selective'; END IF;

  IF EXISTS (SELECT 1 FROM "MediaVerifiedSource") OR
     EXISTS (SELECT 1 FROM "MediaObjectCleanup") THEN
    RAISE EXCEPTION 'media_upgrade_invented_source_evidence'; END IF;
END $$;
