-- Membership is valid in the old schema; the required default realm is absent.
INSERT INTO "Tenant" ("id", "lifecycle", "displayName", "updatedAt")
VALUES ('a1000000-0000-4000-8000-000000000001', 'PROVISIONING', 'R2 rollback', '2026-09-01');
INSERT INTO "Membership" ("id", "tenantId", "userId", "updatedAt")
VALUES ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
 'd1000000-0000-4000-8000-000000000001', '2026-09-01');

-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Tenant', 'Membership'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;

-- Compare complete public DDL before/after a failed transactional migration.
CREATE VIEW "_r2_catalog" AS
  SELECT 'column'::text AS kind, c.relname || '.' || a.attname AS name,
    jsonb_build_object('type', format_type(a.atttypid,a.atttypmod), 'notNull', a.attnotnull,
      'position', a.attnum, 'default', pg_get_expr(d.adbin,d.adrelid))::text AS definition
  FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE n.nspname='public' AND c.relkind IN ('r','v','S') AND c.relname NOT LIKE '\_r2\_%'
    AND a.attnum>0 AND NOT a.attisdropped
  UNION ALL
  SELECT 'constraint', c.relname || '.' || p.conname, pg_get_constraintdef(p.oid)
  FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname NOT LIKE '\_r2\_%'
  UNION ALL
  SELECT 'index', indexname, indexdef FROM pg_indexes
  WHERE schemaname='public' AND tablename NOT LIKE '\_r2\_%'
  UNION ALL
  SELECT 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'
  UNION ALL
  SELECT 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname NOT LIKE '\_r2\_%';
CREATE TABLE "_r2_schema_snapshot" AS SELECT * FROM "_r2_catalog";
