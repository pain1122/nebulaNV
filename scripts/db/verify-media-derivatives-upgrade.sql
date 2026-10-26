DO $$ BEGIN
  IF (SELECT count(*) FROM "Media") <> 8 OR EXISTS (
    SELECT 1 FROM "_media_processing_upgrade_snapshot" s FULL JOIN "Media" m ON m."id"=s."id"
    WHERE s."id" IS NULL OR m."id" IS NULL OR (to_jsonb(m) - 'title' - 'defaultAlt' - 'metadataVersion') IS DISTINCT FROM s.facts
  ) THEN RAISE EXCEPTION 'media_derivative_upgrade_changed_media'; END IF;
  IF EXISTS (
    SELECT 1 FROM "_media_derivative_upgrade_jobs" s FULL JOIN "MediaProcessingJob" j ON j."id"=s."id"
    WHERE s."id" IS NULL OR j."id" IS NULL OR to_jsonb(j) IS DISTINCT FROM s.facts
  ) OR EXISTS (
    SELECT 1 FROM "_media_derivative_upgrade_sources" s FULL JOIN "MediaVerifiedSource" v ON v."mediaId"=s."id"
    WHERE s."id" IS NULL OR v."mediaId" IS NULL OR to_jsonb(v) IS DISTINCT FROM s.facts
  ) OR EXISTS (
    SELECT 1 FROM "_media_derivative_upgrade_cleanup" s FULL JOIN "MediaObjectCleanup" c ON c."id"=s."id"
    WHERE s."id" IS NULL OR c."id" IS NULL OR to_jsonb(c) IS DISTINCT FROM s.facts
  ) THEN RAISE EXCEPTION 'media_derivative_upgrade_changed_processing_facts'; END IF;
END $$;
