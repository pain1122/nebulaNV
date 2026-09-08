-- Legacy identified and anonymous owners, with distinct business state.
INSERT INTO "Media" (
  "id", "ownerId", "path", "filename", "mimeType", "sizeBytes",
  "status", "accessClass", "entityType", "entityId", "updatedAt"
) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   '/r2/owned.png', 'owned.png', 'image/png', 123, 'READY', 'STRICT', 'ORDER', 'r2-order', '2026-09-01'),
  ('e1000000-0000-4000-8000-000000000002', NULL,
   '/r2/anonymous.png', 'anonymous.png', 'image/png', 456, 'PENDING', 'PUBLIC', NULL, NULL, '2026-09-02');

-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Media'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;
