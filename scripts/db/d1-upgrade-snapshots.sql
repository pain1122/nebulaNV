CREATE TABLE "_d1_upgrade_legacy" ("tableName" text PRIMARY KEY, "columns" text NOT NULL, "facts" jsonb NOT NULL);
CREATE TABLE "_d1_upgrade_schema" ("facts" jsonb NOT NULL);

CREATE FUNCTION "_d1_upgrade_schema_facts"() RETURNS jsonb LANGUAGE sql AS $$
SELECT jsonb_build_object(
 'tables', (SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' AND left(tablename,12)<>'_d1_upgrade_'),
 'columns', (SELECT jsonb_agg(jsonb_build_array(table_name,column_name,data_type,udt_name,is_nullable,column_default) ORDER BY table_name,ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name<>'_prisma_migrations' AND left(table_name,12)<>'_d1_upgrade_'),
 'constraints', (SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid)) ORDER BY c.relname,k.conname) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname<>'_prisma_migrations' AND left(c.relname,12)<>'_d1_upgrade_'),
 'indexes', (SELECT jsonb_agg(jsonb_build_array(tablename,indexname,indexdef) ORDER BY tablename,indexname) FROM pg_indexes WHERE schemaname='public' AND tablename<>'_prisma_migrations' AND left(tablename,12)<>'_d1_upgrade_'),
 'enums', (SELECT jsonb_agg(jsonb_build_array(t.typname,e.enumlabel,e.enumsortorder) ORDER BY t.typname,e.enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public')
);
$$;

DO $$ DECLARE tab record; cols text; facts jsonb; BEGIN
  FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' AND left(tablename,12)<>'_d1_upgrade_' LOOP
    SELECT string_agg(format('%I',column_name),',' ORDER BY ordinal_position) INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name=tab.tablename;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY to_jsonb(s)),''[]''::jsonb) FROM (SELECT %s FROM public.%I) s',cols,tab.tablename) INTO facts;
    INSERT INTO "_d1_upgrade_legacy" VALUES (tab.tablename,cols,facts);
  END LOOP;
END $$;

CREATE FUNCTION "_d1_upgrade_check_legacy"() RETURNS void LANGUAGE plpgsql AS $$
DECLARE tab record; facts jsonb; BEGIN
  FOR tab IN SELECT * FROM "_d1_upgrade_legacy" LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY to_jsonb(s)),''[]''::jsonb) FROM (SELECT %s FROM public.%I) s',tab."columns",tab."tableName") INTO facts;
    IF facts IS DISTINCT FROM tab."facts" THEN RAISE EXCEPTION 'd1_upgrade_legacy_changed_%',tab."tableName"; END IF;
  END LOOP;
END $$;
