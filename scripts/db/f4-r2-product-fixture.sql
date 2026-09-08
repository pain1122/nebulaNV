-- ProductComment.userId was text before R2; preserve identified and anonymous comments.
INSERT INTO "Product" ("id", "slug", "title", "description", "sku", "price", "category_id", "tags", "complementaryIds", "updatedAt")
VALUES ('e5000000-0000-4000-8000-000000000001', 'r2-fixture', 'R2 fixture', 'Fixture description',
  'R2-SKU', 12.34, 'e6000000-0000-4000-8000-000000000001', ARRAY['fixture'], ARRAY[]::text[], '2026-09-01');
INSERT INTO "ProductComment" ("id", "productId", "userId", "authorName", "rating", "body", "status", "updatedAt") VALUES
  ('e7000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001',
   'd1000000-0000-4000-8000-000000000001', 'Fixture author', 4, 'Identified fixture', 'APPROVED', '2026-09-01'),
  ('e7000000-0000-4000-8000-000000000002', 'e5000000-0000-4000-8000-000000000001',
   NULL, 'Anonymous fixture', NULL, 'Anonymous fixture', 'PENDING', '2026-09-02');

-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Product', 'ProductComment'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;
