-- Clean disposable Authority-database evidence for the ordered F4 Batch 3 role seeds.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Membership") <> 4 OR
     (SELECT COUNT(*) FROM "Membership" WHERE "state" = 'ACTIVE' AND "currentEpochId" IS NOT NULL) <> 4 THEN
    RAISE EXCEPTION 'f4_batch3_membership_count_mismatch';
  END IF;

  IF (SELECT COUNT(*) FROM "MembershipEpoch" WHERE "generation" = 1 AND "closedAt" IS NULL) <> 4 OR
     EXISTS (
       SELECT 1
       FROM "Membership" membership
       JOIN "MembershipEpoch" epoch ON epoch."id" = membership."currentEpochId"
       WHERE epoch."membershipId" <> membership."id"
     ) THEN
    RAISE EXCEPTION 'f4_batch3_membership_epoch_mismatch';
  END IF;

  IF (SELECT COUNT(*) FROM "SiteRoleGrant" WHERE "state" = 'ACTIVE' AND "role" = 'USER') <> 1 OR
     (SELECT COUNT(*) FROM "SiteRoleGrant" WHERE "state" = 'ACTIVE' AND "role" = 'EDITOR') <> 1 OR
     (SELECT COUNT(*) FROM "SiteRoleGrant" WHERE "state" = 'ACTIVE' AND "role" = 'SITE_ADMIN') <> 1 OR
     (SELECT COUNT(*) FROM "SiteRoleGrant" WHERE "state" <> 'ACTIVE') <> 0 THEN
    RAISE EXCEPTION 'f4_batch3_site_role_grant_mismatch';
  END IF;

  IF (SELECT COUNT(*) FROM "TenantRoleGrant" WHERE "state" = 'ACTIVE' AND "role" = 'TENANT_ADMIN') <> 1 OR
     (SELECT COUNT(*) FROM "TenantRoleGrant" WHERE "role" = 'PARENT_MANAGER') <> 0 OR
     (SELECT COUNT(*) FROM "PlatformGrant" WHERE "state" = 'ACTIVE' AND "role" = 'PLATFORM_ADMIN') <> 1 THEN
    RAISE EXCEPTION 'f4_batch3_tenant_or_platform_grant_mismatch';
  END IF;

  IF (SELECT COUNT(*) FROM "AuthorityInvalidationOutbox" WHERE "aggregateKind" = 'MEMBERSHIP') <> 4 OR
     (SELECT COUNT(*) FROM "AuthorityAuditEvent" WHERE "operation" = 'LEGACY_ROLE.BACKFILL') <> 1 OR
     (SELECT COUNT(*) FROM "AuthorityAuditEvent" WHERE "operation" = 'DEFAULT_ROLE_FIXTURES.SEED') <> 1 THEN
    RAISE EXCEPTION 'f4_batch3_role_seed_evidence_mismatch';
  END IF;
END $$;

-- R2 earlier-seed regression: every byte of the captured legacy rows is unchanged.
DO $$
DECLARE saved record; actual jsonb; row_filter text;
BEGIN
  FOR saved IN SELECT * FROM "_r2_snapshot" LOOP
    row_filter := CASE saved."tableName"
      WHEN 'AuthorityAuditEvent' THEN ' WHERE t."eventVersion" = 1'
      WHEN 'AuthorityInvalidationOutbox' THEN ' WHERE t."payloadVersion" = 1'
      ELSE '' END;
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t%s',
      saved."tableName", row_filter
    ) INTO actual;
    IF actual IS DISTINCT FROM saved."rows" THEN
      RAISE EXCEPTION 'r2_legacy_snapshot_changed: %', saved."tableName";
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Membership"
    WHERE "identityRealmId" IS DISTINCT FROM 'b1000000-0000-4000-8000-000000000001'::uuid
      OR "subjectId" IS DISTINCT FROM "userId"
  ) OR EXISTS (
    SELECT 1 FROM "PlatformGrant"
    WHERE "identityRealmId" IS DISTINCT FROM 'b1000000-0000-4000-8000-000000000001'::uuid
      OR "subjectId" IS DISTINCT FROM "userId"
  ) THEN RAISE EXCEPTION 'f4_batch3_default_actor_pair_mismatch'; END IF;

  IF (SELECT count(*) FROM "AuthorityInvalidationOutbox" WHERE "payloadVersion" = 2) <> 5 OR
    (SELECT count(*) FROM "AuthorityInvalidationOutbox" WHERE "aggregateKind" = 'MEMBERSHIP_DEFAULT_ACTOR' AND "payloadVersion" = 2) <> 4 OR
    (SELECT count(*) FROM "AuthorityInvalidationOutbox" WHERE "aggregateKind" = 'PLATFORM_GRANT_DEFAULT_ACTOR' AND "payloadVersion" = 2) <> 1 OR
    (SELECT count(*) FROM "AuthorityAuditEvent" WHERE "operation" = 'DEFAULT_ACTOR.BACKFILL' AND "eventVersion" = 2 AND "schemaVersion" = 2) <> 1 OR
    NOT EXISTS (
      SELECT 1 FROM "AuthorityAuditEvent" WHERE "operation" = 'DEFAULT_ACTOR.BACKFILL'
        AND "change"->>'membershipCount' = '4' AND "change"->>'platformGrantCount' = '1'
    )
  THEN RAISE EXCEPTION 'f4_batch3_default_actor_evidence_count_mismatch'; END IF;

  IF EXISTS (
    SELECT 1 FROM "AuthorityInvalidationOutbox" o WHERE o."payloadVersion" = 2 AND (
      o."identityRealmId" IS DISTINCT FROM 'b1000000-0000-4000-8000-000000000001'::uuid
      OR o."subjectId" IS NULL OR o."state" <> 'PENDING'
      OR o."payload" IS DISTINCT FROM jsonb_build_object(
        'schemaVersion', 2, 'aggregateKind', o."aggregateKind", 'aggregateId', o."aggregateId",
        'tenantId', o."tenantId", 'identityRealmId', o."identityRealmId", 'subjectId', o."subjectId",
        'revision', o."revision"::text
      )
    )
  ) OR EXISTS (
    SELECT 1 FROM (
      SELECT "change" AS payload FROM "AuthorityAuditEvent" WHERE "eventVersion" = 2
      UNION ALL SELECT "payload" FROM "AuthorityInvalidationOutbox" WHERE "payloadVersion" = 2
    ) evidence WHERE payload::text ~* 'email|phone|password|credential|token|session|generation|profile|secret'
  ) THEN RAISE EXCEPTION 'f4_batch3_default_actor_payload_mismatch'; END IF;
END $$;
