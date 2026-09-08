-- R2 product: exact pairs, zero-row rerun, all legacy/business columns preserved.
BEGIN;
-- Every denial must match its reason (or PostgreSQL constraint SQLSTATE).
CREATE FUNCTION pg_temp.r2_reject(statement text, expected text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = expected OR SQLSTATE = expected THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'r2_expected_denial_missing: %', expected;
END $$;

DO $$
DECLARE table_name text; bad boolean; affected integer;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ProductComment'] LOOP
    EXECUTE format(
      'SELECT count(*) <> 2 OR bool_or(CASE WHEN %I IS NULL THEN "identityRealmId" IS NOT NULL OR "subjectId" IS NOT NULL ELSE "identityRealmId" IS DISTINCT FROM %L::uuid OR "subjectId"::text IS DISTINCT FROM %I::text END) FROM %I',
      'userId', 'b1000000-0000-4000-8000-000000000001', 'userId', table_name
    ) INTO bad;
    IF bad THEN RAISE EXCEPTION 'r2_product_pair_mismatch: %', table_name; END IF;
    EXECUTE format(
      'UPDATE %I SET %I = %I WHERE %I IS NOT NULL AND "identityRealmId" IS NULL AND "subjectId" IS NULL',
      table_name, 'userId', 'userId', 'userId'
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'r2_product_rerun_wrote_rows'; END IF;

    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "identityRealmId" = NULL WHERE %I IS NOT NULL', table_name, 'userId'), 'product_comment_default_actor_pair_partial');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "subjectId" = NULL WHERE %I IS NOT NULL', table_name, 'userId'), 'product_comment_default_actor_pair_partial');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "identityRealmId" = %L WHERE %I IS NOT NULL', table_name, 'b1000000-0000-4000-8000-000000000002', 'userId'), 'product_comment_default_actor_pair_mismatch');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "subjectId" = %L WHERE %I IS NOT NULL', table_name, 'd1000000-0000-4000-8000-000000000099', 'userId'), 'product_comment_default_actor_pair_mismatch');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET %I = NULL WHERE %I IS NOT NULL', table_name, 'userId', 'userId'), 'product_comment_actor_pair_without_user');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "identityRealmId" = %L, "subjectId" = %L WHERE %I IS NULL', table_name, 'b1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000099', 'userId'), 'product_comment_actor_pair_without_user');
  END LOOP;
END $$;
DO $$
DECLARE invalid_id text;
BEGIN
  FOREACH invalid_id IN ARRAY ARRAY[
    'not-a-uuid', '', 'D1000000-0000-4000-8000-000000000001',
    'd1000000-0000-1000-8000-000000000001', ' d1000000-0000-4000-8000-000000000001'
  ] LOOP
    PERFORM pg_temp.r2_reject(format('UPDATE "ProductComment" SET "userId" = %L WHERE "userId" IS NOT NULL', invalid_id), 'product_comment_legacy_user_id_invalid');
  END LOOP;
END $$;

DO $$
DECLARE saved record; actual jsonb; row_filter text; added_columns text[];
BEGIN
  FOR saved IN SELECT * FROM "_r2_snapshot" LOOP
    added_columns := CASE
      WHEN saved."tableName" = 'AuthorityAuditEvent' THEN ARRAY['actorIdentityRealmId', 'actorSubjectId']
      WHEN saved."tableName" IN ('Membership', 'PlatformGrant', 'AuthorityInvalidationOutbox', 'Media', 'Order', 'Cart', 'ProductComment')
        THEN ARRAY['identityRealmId', 'subjectId']
      ELSE ARRAY[]::text[] END;
    row_filter := CASE saved."tableName"
      WHEN 'AuthorityAuditEvent' THEN ' WHERE t."eventVersion" = 1'
      WHEN 'AuthorityInvalidationOutbox' THEN ' WHERE t."payloadVersion" = 1'
      ELSE '' END;
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(t) - $1 ORDER BY t."id"), ''[]''::jsonb) FROM %I t%s',
      saved."tableName", row_filter
    ) INTO actual USING added_columns;
    IF actual IS DISTINCT FROM saved."rows" THEN
      RAISE EXCEPTION 'r2_legacy_snapshot_changed: %', saved."tableName";
    END IF;
  END LOOP;
END $$;

-- A new legacy-only writer also receives its pair. These probe rows roll back.
DO $$
DECLARE table_name text; probe jsonb; actual jsonb;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ProductComment'] LOOP
    EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE %I IS NOT NULL LIMIT 1', table_name, 'userId') INTO probe;
    probe := probe || jsonb_build_object(
      'id', 'f1000000-0000-4000-8000-000000000001',
      'userId', 'd1000000-0000-4000-8000-000000000099',
      'identityRealmId', NULL, 'subjectId', NULL
    );
    IF table_name = 'Order' THEN probe := probe || '{"orderNumber":"R2-legacy-write"}'::jsonb; END IF;
    EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1) RETURNING to_jsonb(%I.*)', table_name, table_name, table_name) INTO actual USING probe;
    IF actual->>'identityRealmId' IS DISTINCT FROM 'b1000000-0000-4000-8000-000000000001'
      OR actual->>'subjectId' IS DISTINCT FROM actual->>'userId'
    THEN RAISE EXCEPTION 'r2_product_legacy_writer_pair_missing'; END IF;
  END LOOP;
END $$;
ROLLBACK;
