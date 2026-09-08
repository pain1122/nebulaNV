DO $$
BEGIN
  IF EXISTS (
    (SELECT * FROM "_r2_catalog" EXCEPT SELECT * FROM "_r2_schema_snapshot")
    UNION ALL
    (SELECT * FROM "_r2_schema_snapshot" EXCEPT SELECT * FROM "_r2_catalog")
  ) THEN RAISE EXCEPTION 'r2_rollback_ddl_changed'; END IF;
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

DO $$
BEGIN
  IF (SELECT count(*) FROM "ProductComment") <> 2 OR
    (SELECT count(*) FROM "ProductComment" WHERE "userId" = 'malformed-legacy-user') <> 1
  THEN RAISE EXCEPTION 'r2_product_rollback_fixture_changed'; END IF;
END $$;
