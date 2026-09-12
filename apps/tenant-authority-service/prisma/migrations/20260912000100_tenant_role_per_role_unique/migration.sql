BEGIN;

-- R4 prepares the frozen administrator split. The existing index permits only
-- one active tenant role per epoch; the target permits one active row for each
-- exact role so TENANT_ADMIN and PARENT_MANAGER can coexist without role union.
DROP INDEX "TenantRoleGrant_one_active_epoch_key";

CREATE UNIQUE INDEX "TenantRoleGrant_one_active_epoch_role_key"
  ON "TenantRoleGrant"("membershipEpochId", "role")
  WHERE "state" = 'ACTIVE';

COMMIT;
