-- R2 Authority: preserve the old graph/history and bound new evidence exactly.
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
DECLARE table_name text; affected integer; bad boolean; probe jsonb; actual jsonb;
BEGIN
  IF (SELECT count(*) FROM "Membership") <> 2 OR
    (SELECT count(*) FROM "MembershipEpoch") <> 3 OR
    (SELECT count(*) FROM "TenantRoleGrant") <> 2 OR
    (SELECT count(*) FROM "SiteRoleGrant") <> 1 OR
    (SELECT count(*) FROM "PlatformGrant") <> 1
  THEN RAISE EXCEPTION 'r2_authority_fixture_count_mismatch'; END IF;
  FOREACH table_name IN ARRAY ARRAY['Membership', 'PlatformGrant'] LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I WHERE "identityRealmId" IS DISTINCT FROM %L::uuid OR "subjectId" IS DISTINCT FROM "userId")',
      table_name, 'b1000000-0000-4000-8000-000000000001'
    ) INTO bad;
    IF bad THEN RAISE EXCEPTION 'r2_authority_pair_mismatch'; END IF;
    EXECUTE format('UPDATE %I SET "userId" = "userId" WHERE "identityRealmId" IS NULL AND "subjectId" IS NULL', table_name);
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'r2_authority_rerun_wrote_rows'; END IF;
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "identityRealmId" = NULL', table_name), 'authority_default_actor_pair_partial');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "subjectId" = NULL', table_name), 'authority_default_actor_pair_partial');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "identityRealmId" = %L', table_name, 'b1000000-0000-4000-8000-000000000002'), 'authority_default_actor_pair_mismatch');
    PERFORM pg_temp.r2_reject(format('UPDATE %I SET "subjectId" = %L', table_name, 'd1000000-0000-4000-8000-000000000099'), 'authority_default_actor_pair_mismatch');
  END LOOP;

  IF (SELECT count(*) FROM "AuthorityInvalidationOutbox" WHERE "payloadVersion" <> 1) <> 3 OR
    (SELECT count(*) FROM "AuthorityAuditEvent" WHERE "eventVersion" <> 1) <> 1 OR
    EXISTS (
      SELECT 1 FROM "AuthorityInvalidationOutbox" o
      WHERE o."payloadVersion" = 2 AND (
        o."state" <> 'PENDING' OR o."attempts" <> 0 OR
        o."identityRealmId" IS DISTINCT FROM 'b1000000-0000-4000-8000-000000000001'::uuid OR
        o."subjectId" IS NULL OR
        o."payload" IS DISTINCT FROM jsonb_build_object(
          'schemaVersion', 2, 'aggregateKind', o."aggregateKind", 'aggregateId', o."aggregateId",
          'tenantId', o."tenantId", 'identityRealmId', o."identityRealmId", 'subjectId', o."subjectId",
          'revision', o."revision"::text
        )
      )
    ) OR EXISTS (
      SELECT 1 FROM (
        SELECT 'MEMBERSHIP_DEFAULT_ACTOR' AS kind, "id", "tenantId", "userId", "revision" FROM "Membership"
        UNION ALL
        SELECT 'PLATFORM_GRANT_DEFAULT_ACTOR', "id", NULL::uuid, "userId", "revision" FROM "PlatformGrant"
      ) a LEFT JOIN "AuthorityInvalidationOutbox" o
        ON o."aggregateKind" = a.kind AND o."aggregateId" = a."id" AND o."payloadVersion" = 2
      WHERE o."id" IS NULL OR o."subjectId" IS DISTINCT FROM a."userId" OR
        o."tenantId" IS DISTINCT FROM a."tenantId" OR o."revision" <> a."revision"
    )
  THEN RAISE EXCEPTION 'r2_authority_v2_outbox_mismatch'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "AuthorityAuditEvent" WHERE "eventVersion" = 2 AND "schemaVersion" = 2
      AND "operation" = 'DEFAULT_ACTOR.BACKFILL' AND "result" = 'SUCCEEDED'
      AND "reasonCode" = 'CREATED_V2' AND "actorUserId" IS NULL
      AND "actorIdentityRealmId" IS NULL AND "actorSubjectId" IS NULL
      AND "requestId" = 'default-actor-backfill-v2:' || ("change"->>'evidenceDigest')
      AND ("change"->>'evidenceDigest') ~ '^[0-9a-f]{64}$'
      AND "change" = jsonb_build_object(
        'identityRealmId', 'b1000000-0000-4000-8000-000000000001',
        'membershipCount', 2, 'platformGrantCount', 1, 'evidenceDigest', "change"->>'evidenceDigest')
  ) THEN RAISE EXCEPTION 'r2_authority_v2_audit_mismatch'; END IF;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT "change" AS payload FROM "AuthorityAuditEvent" WHERE "eventVersion" = 2
      UNION ALL SELECT "payload" FROM "AuthorityInvalidationOutbox" WHERE "payloadVersion" = 2
    ) evidence WHERE payload::text ~* 'email|phone|password|credential|token|session|generation|profile|secret'
  ) THEN RAISE EXCEPTION 'r2_authority_v2_sensitive_payload'; END IF;

  -- Audit v2 must continue its partition's existing hash chain.
  IF EXISTS (
    SELECT 1 FROM (
      SELECT "eventVersion", "partitionSequence", "previousEventHash",
        lag("eventHash") OVER (PARTITION BY "partitionKey" ORDER BY "partitionSequence") AS previous_hash
      FROM "AuthorityAuditEvent"
    ) chain WHERE "eventVersion" = 2 AND "previousEventHash" IS DISTINCT FROM previous_hash
  ) THEN RAISE EXCEPTION 'r2_authority_v2_chain_mismatch'; END IF;

  -- Exercise database constraints directly; the TypeScript writer is not the only guard.
  FOREACH table_name IN ARRAY ARRAY['AuthorityAuditEvent', 'AuthorityInvalidationOutbox'] LOOP
    EXECUTE format('SELECT to_jsonb(t) FROM %I t LIMIT 1', table_name) INTO probe;
    probe := probe || jsonb_build_object('id', 'f2000000-0000-4000-8000-000000000001');
    IF table_name = 'AuthorityAuditEvent' THEN
      probe := probe || jsonb_build_object('partitionSequence', 999, 'eventVersion', 2, 'schemaVersion', 2,
        'actorIdentityRealmId', NULL, 'actorSubjectId', 'd1000000-0000-4000-8000-000000000001');
    ELSE
      probe := probe || jsonb_build_object('aggregateKind', 'R2_DENIAL_PROBE', 'payloadVersion', 2,
        'identityRealmId', NULL, 'subjectId', 'd1000000-0000-4000-8000-000000000001');
    END IF;
    PERFORM pg_temp.r2_reject(format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L::jsonb)', table_name, table_name, probe), '23514');
    IF table_name = 'AuthorityAuditEvent' THEN
      probe := probe || jsonb_build_object('actorIdentityRealmId', 'b1000000-0000-4000-8000-000000000001', 'actorSubjectId', NULL);
    ELSE
      probe := probe || jsonb_build_object('identityRealmId', 'b1000000-0000-4000-8000-000000000001', 'subjectId', NULL);
    END IF;
    PERFORM pg_temp.r2_reject(format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L::jsonb)', table_name, table_name, probe), '23514');
    IF table_name = 'AuthorityAuditEvent' THEN
      probe := probe || jsonb_build_object('actorIdentityRealmId', 'b1000000-0000-4000-8000-000000000002', 'actorSubjectId', 'd1000000-0000-4000-8000-000000000001');
    ELSE
      probe := probe || jsonb_build_object('identityRealmId', 'b1000000-0000-4000-8000-000000000002', 'subjectId', 'd1000000-0000-4000-8000-000000000001');
    END IF;
    PERFORM pg_temp.r2_reject(format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L::jsonb)', table_name, table_name, probe), '23514');
    IF table_name = 'AuthorityAuditEvent' THEN
      probe := probe || jsonb_build_object('actorIdentityRealmId', 'b1000000-0000-4000-8000-000000000001',
        'actorUserId', 'd1000000-0000-4000-8000-000000000099');
      PERFORM pg_temp.r2_reject(format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L::jsonb)', table_name, table_name, probe), '23514');
      probe := probe || jsonb_build_object('actorUserId', 'd1000000-0000-4000-8000-000000000001');
    ELSE
      probe := probe || jsonb_build_object('identityRealmId', 'b1000000-0000-4000-8000-000000000001');
    END IF;
    -- An exact actor-bearing v2 fact is accepted; this whole probe rolls back.
    EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1)', table_name, table_name) USING probe;
    probe := probe || jsonb_build_object('id', 'f2000000-0000-4000-8000-000000000002');
    IF table_name = 'AuthorityAuditEvent' THEN
      probe := probe || jsonb_build_object('actorSubjectId', 'd1000000-0000-4000-8000-000000000001', 'eventVersion', 1, 'schemaVersion', 1);
    ELSE
      probe := probe || jsonb_build_object('subjectId', 'd1000000-0000-4000-8000-000000000001', 'payloadVersion', 1);
    END IF;
    PERFORM pg_temp.r2_reject(format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L::jsonb)', table_name, table_name, probe), '23514');
  END LOOP;
  PERFORM pg_temp.r2_reject('UPDATE "AuthorityAuditEvent" SET "actorSubjectId" = NULL WHERE "eventVersion" = 1', 'authority_audit_event_append_only');
  PERFORM pg_temp.r2_reject('UPDATE "AuthorityInvalidationOutbox" SET "subjectId" = NULL WHERE "payloadVersion" = 2', 'authority_outbox_event_immutable');
END $$;
ROLLBACK;
