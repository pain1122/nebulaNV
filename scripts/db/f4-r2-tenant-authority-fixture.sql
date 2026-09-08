-- Current R1/default seed has already run on the exact six pre-R2 migrations.
BEGIN;
INSERT INTO "Membership" ("id", "tenantId", "userId", "state", "currentEpochId", "revision", "updatedAt") VALUES
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'd1000000-0000-4000-8000-000000000001', 'ACTIVE', 'c2000000-0000-4000-8000-000000000002', 7, '2026-09-01'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001',
   'd1000000-0000-4000-8000-000000000002', 'SUSPENDED', 'c2000000-0000-4000-8000-000000000003', 3, '2026-09-02');
-- Real HMAC-SHA256 refs over ["nebula-membership-epoch","1",membershipId,generation],
-- using only the verifier's fixed disposable key. Include a retained closed epoch.
INSERT INTO "MembershipEpoch" ("id", "membershipId", "generation", "membershipEpochRef", "integrityKeyId", "createdAt", "closedAt") VALUES
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 1,
   'meg1_myVZkRBCTnqYNHaLEZfzS5ffCpKlQbJBT2UwTPKsGvE', 'f4-r2-membership-v1', '2026-08-01', '2026-08-02'),
  ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 2,
   'meg1_pxdpgXduP0XzCnhTgxl9IcMyTsWuuH7015zSRd7Pg18', 'f4-r2-membership-v1', '2026-08-03', NULL),
  ('c2000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 1,
   'meg1_Q-h6QlvH23HOE81CZAX5r_SHsuAfZkPmhnqMb-8bXyg', 'f4-r2-membership-v1', '2026-08-03', NULL);
INSERT INTO "TenantRoleGrant" ("id", "membershipEpochId", "role", "state", "revokedAt") VALUES
  ('c3000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'TENANT_ADMIN', 'REVOKED', '2026-08-02'),
  ('c3000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'TENANT_ADMIN', 'ACTIVE', NULL);
INSERT INTO "SiteRoleGrant" ("id", "membershipEpochId", "tenantId", "siteId", "role")
SELECT 'c4000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000003',
  "tenantId", "id", 'USER' FROM "Site" WHERE "id" = 'a2000000-0000-4000-8000-000000000001';
INSERT INTO "PlatformGrant" ("id", "userId", "role", "revision", "updatedAt")
VALUES ('c5000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'PLATFORM_ADMIN', 5, '2026-09-01');
COMMIT;

-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Tenant', 'Site', 'Channel', 'Application', 'WebOrigin', 'AndroidIdentity', 'IosIdentity', 'ParentRelationship', 'EntitlementScopeRef', 'ApplicationClientHandle', 'IdentityRealm', 'IdentityProviderRegistration', 'ApplicationIdentityPolicy', 'FederationTrust', 'Membership', 'MembershipEpoch', 'TenantRoleGrant', 'SiteRoleGrant', 'PlatformGrant', 'AuthorityAuditEvent', 'AuthorityInvalidationOutbox'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;
