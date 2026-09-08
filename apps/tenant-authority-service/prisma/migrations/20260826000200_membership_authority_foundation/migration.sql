-- F4 Batch 3 item 1: separate global User identity from tenant membership.
-- This migration adds no user/profile/password/session/token data, no legacy
-- role backfill, no seed, no transport, and no authorization consumer.

CREATE TYPE "MembershipLifecycle" AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);
CREATE TYPE "RoleGrantLifecycle" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "TenantRole" AS ENUM ('TENANT_ADMIN', 'PARENT_MANAGER');
CREATE TYPE "SiteRole" AS ENUM ('SITE_ADMIN', 'EDITOR', 'USER');
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');

CREATE TABLE "Membership" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "state" "MembershipLifecycle" NOT NULL DEFAULT 'PENDING',
  "currentEpochId" UUID,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Membership_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "Membership_userId_uuid_v4_check" CHECK (
    "userId"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "Membership_revision_check" CHECK ("revision" > 0)
);

CREATE UNIQUE INDEX "Membership_tenantId_userId_key"
  ON "Membership"("tenantId", "userId");
CREATE UNIQUE INDEX "Membership_currentEpochId_key"
  ON "Membership"("currentEpochId");
CREATE UNIQUE INDEX "Membership_id_tenantId_key"
  ON "Membership"("id", "tenantId");
CREATE UNIQUE INDEX "Membership_currentEpochId_id_key"
  ON "Membership"("currentEpochId", "id");
CREATE INDEX "Membership_userId_state_idx"
  ON "Membership"("userId", "state");
CREATE INDEX "Membership_tenantId_state_idx"
  ON "Membership"("tenantId", "state");

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "MembershipEpoch" (
  "id" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "generation" INTEGER NOT NULL,
  "membershipEpochRef" VARCHAR(48) NOT NULL,
  "integrityKeyId" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMPTZ(3),
  CONSTRAINT "MembershipEpoch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MembershipEpoch_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "MembershipEpoch_generation_check" CHECK ("generation" >= 1),
  CONSTRAINT "MembershipEpoch_ref_check" CHECK (
    "membershipEpochRef" ~ '^meg1_[A-Za-z0-9_-]{43}$'
  ),
  CONSTRAINT "MembershipEpoch_key_id_check" CHECK (
    "integrityKeyId" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
  ),
  CONSTRAINT "MembershipEpoch_close_time_check" CHECK (
    "closedAt" IS NULL OR "closedAt" >= "createdAt"
  )
);

CREATE UNIQUE INDEX "MembershipEpoch_membershipEpochRef_key"
  ON "MembershipEpoch"("membershipEpochRef");
CREATE UNIQUE INDEX "MembershipEpoch_id_membershipId_key"
  ON "MembershipEpoch"("id", "membershipId");
CREATE UNIQUE INDEX "MembershipEpoch_membershipId_generation_key"
  ON "MembershipEpoch"("membershipId", "generation");
CREATE INDEX "MembershipEpoch_membershipId_closedAt_idx"
  ON "MembershipEpoch"("membershipId", "closedAt");

ALTER TABLE "MembershipEpoch"
  ADD CONSTRAINT "MembershipEpoch_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_currentEpochId_id_fkey"
  FOREIGN KEY ("currentEpochId", "id")
  REFERENCES "MembershipEpoch"("id", "membershipId")
  ON DELETE RESTRICT ON UPDATE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "TenantRoleGrant" (
  "id" UUID NOT NULL,
  "membershipEpochId" UUID NOT NULL,
  "role" "TenantRole" NOT NULL,
  "state" "RoleGrantLifecycle" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "TenantRoleGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantRoleGrant_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "TenantRoleGrant_state_time_check" CHECK (
    ("state" = 'ACTIVE' AND "revokedAt" IS NULL)
    OR ("state" = 'REVOKED' AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "TenantRoleGrant_one_active_epoch_key"
  ON "TenantRoleGrant"("membershipEpochId") WHERE "state" = 'ACTIVE';
CREATE INDEX "TenantRoleGrant_role_state_idx"
  ON "TenantRoleGrant"("role", "state");
CREATE INDEX "TenantRoleGrant_membershipEpochId_state_idx"
  ON "TenantRoleGrant"("membershipEpochId", "state");

ALTER TABLE "TenantRoleGrant"
  ADD CONSTRAINT "TenantRoleGrant_membershipEpochId_fkey"
  FOREIGN KEY ("membershipEpochId") REFERENCES "MembershipEpoch"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "SiteRoleGrant" (
  "id" UUID NOT NULL,
  "membershipEpochId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "role" "SiteRole" NOT NULL,
  "state" "RoleGrantLifecycle" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "SiteRoleGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteRoleGrant_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "SiteRoleGrant_state_time_check" CHECK (
    ("state" = 'ACTIVE' AND "revokedAt" IS NULL)
    OR ("state" = 'REVOKED' AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "SiteRoleGrant_one_active_epoch_site_key"
  ON "SiteRoleGrant"("membershipEpochId", "siteId")
  WHERE "state" = 'ACTIVE';
CREATE INDEX "SiteRoleGrant_siteId_role_state_idx"
  ON "SiteRoleGrant"("siteId", "role", "state");
CREATE INDEX "SiteRoleGrant_membershipEpochId_state_idx"
  ON "SiteRoleGrant"("membershipEpochId", "state");
CREATE INDEX "SiteRoleGrant_tenantId_siteId_state_idx"
  ON "SiteRoleGrant"("tenantId", "siteId", "state");

ALTER TABLE "SiteRoleGrant"
  ADD CONSTRAINT "SiteRoleGrant_membershipEpochId_fkey"
  FOREIGN KEY ("membershipEpochId") REFERENCES "MembershipEpoch"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "SiteRoleGrant"
  ADD CONSTRAINT "SiteRoleGrant_siteId_tenantId_fkey"
  FOREIGN KEY ("siteId", "tenantId") REFERENCES "Site"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "PlatformGrant" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "PlatformRole" NOT NULL,
  "state" "RoleGrantLifecycle" NOT NULL DEFAULT 'ACTIVE',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "PlatformGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformGrant_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "PlatformGrant_userId_uuid_v4_check" CHECK (
    "userId"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "PlatformGrant_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "PlatformGrant_state_time_check" CHECK (
    ("state" = 'ACTIVE' AND "revokedAt" IS NULL)
    OR ("state" = 'REVOKED' AND "revokedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "PlatformGrant_one_active_user_role_key"
  ON "PlatformGrant"("userId", "role") WHERE "state" = 'ACTIVE';
CREATE INDEX "PlatformGrant_userId_state_idx"
  ON "PlatformGrant"("userId", "state");
CREATE INDEX "PlatformGrant_role_state_idx"
  ON "PlatformGrant"("role", "state");

CREATE FUNCTION "authority_membership_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_membership_retained';
  END IF;

  IF OLD."id" <> NEW."id"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."userId" <> NEW."userId"
    OR OLD."createdAt" <> NEW."createdAt"
  THEN
    RAISE EXCEPTION 'authority_membership_identity_immutable';
  END IF;

  IF OLD."state" <> NEW."state" AND NOT (
    (OLD."state" = 'PENDING' AND NEW."state" IN ('ACTIVE', 'REVOKED'))
    OR (OLD."state" = 'ACTIVE' AND NEW."state" IN ('SUSPENDED', 'REVOKED'))
    OR (OLD."state" = 'SUSPENDED' AND NEW."state" IN ('ACTIVE', 'REVOKED'))
    OR (OLD."state" = 'REVOKED' AND NEW."state" = 'PENDING')
  ) THEN
    RAISE EXCEPTION 'authority_membership_lifecycle_transition_invalid';
  END IF;

  IF OLD."state" = 'REVOKED' AND NEW."state" = 'PENDING'
    AND (
      NEW."currentEpochId" IS NULL
      OR NEW."currentEpochId" IS NOT DISTINCT FROM OLD."currentEpochId"
    )
  THEN
    RAISE EXCEPTION 'authority_membership_reinvite_requires_new_epoch';
  END IF;

  IF (
    OLD."state" IS DISTINCT FROM NEW."state"
    OR OLD."currentEpochId" IS DISTINCT FROM NEW."currentEpochId"
  ) AND NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION 'authority_membership_revision_must_advance_once';
  END IF;

  IF OLD."state" IS NOT DISTINCT FROM NEW."state"
    AND OLD."currentEpochId" IS NOT DISTINCT FROM NEW."currentEpochId"
    AND NEW."revision" <> OLD."revision"
  THEN
    RAISE EXCEPTION 'authority_membership_revision_without_change';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "Membership_row_guard"
BEFORE UPDATE OR DELETE ON "Membership"
FOR EACH ROW EXECUTE FUNCTION "authority_membership_row_guard"();

CREATE FUNCTION "authority_membership_epoch_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_membership_epoch_retained';
  END IF;

  IF OLD."id" <> NEW."id"
    OR OLD."membershipId" <> NEW."membershipId"
    OR OLD."generation" <> NEW."generation"
    OR OLD."membershipEpochRef" <> NEW."membershipEpochRef"
    OR OLD."integrityKeyId" <> NEW."integrityKeyId"
    OR OLD."createdAt" <> NEW."createdAt"
  THEN
    RAISE EXCEPTION 'authority_membership_epoch_immutable';
  END IF;

  IF OLD."closedAt" IS NOT NULL
    AND NEW."closedAt" IS DISTINCT FROM OLD."closedAt"
  THEN
    RAISE EXCEPTION 'authority_membership_epoch_close_terminal';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "MembershipEpoch_row_guard"
BEFORE UPDATE OR DELETE ON "MembershipEpoch"
FOR EACH ROW EXECUTE FUNCTION "authority_membership_epoch_row_guard"();

CREATE FUNCTION "authority_role_grant_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_role_grant_retained';
  END IF;

  IF OLD."id" <> NEW."id"
    OR OLD."membershipEpochId" <> NEW."membershipEpochId"
    OR OLD."role" <> NEW."role"
    OR OLD."createdAt" <> NEW."createdAt"
  THEN
    RAISE EXCEPTION 'authority_role_grant_identity_immutable';
  END IF;

  IF TG_TABLE_NAME = 'SiteRoleGrant' AND (
    OLD."tenantId" <> NEW."tenantId" OR OLD."siteId" <> NEW."siteId"
  ) THEN
    RAISE EXCEPTION 'authority_site_role_grant_target_immutable';
  END IF;

  IF OLD."state" = 'REVOKED' AND NEW."state" <> 'REVOKED' THEN
    RAISE EXCEPTION 'authority_role_grant_revocation_terminal';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "TenantRoleGrant_row_guard"
BEFORE UPDATE OR DELETE ON "TenantRoleGrant"
FOR EACH ROW EXECUTE FUNCTION "authority_role_grant_row_guard"();
CREATE TRIGGER "SiteRoleGrant_row_guard"
BEFORE UPDATE OR DELETE ON "SiteRoleGrant"
FOR EACH ROW EXECUTE FUNCTION "authority_role_grant_row_guard"();

CREATE FUNCTION "authority_platform_grant_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_platform_grant_retained';
  END IF;

  IF OLD."id" <> NEW."id"
    OR OLD."userId" <> NEW."userId"
    OR OLD."role" <> NEW."role"
    OR OLD."createdAt" <> NEW."createdAt"
  THEN
    RAISE EXCEPTION 'authority_platform_grant_identity_immutable';
  END IF;

  IF OLD."state" = 'REVOKED' AND NEW."state" <> 'REVOKED' THEN
    RAISE EXCEPTION 'authority_platform_grant_revocation_terminal';
  END IF;

  IF OLD."state" IS DISTINCT FROM NEW."state"
    AND NEW."revision" <> OLD."revision" + 1
  THEN
    RAISE EXCEPTION 'authority_platform_grant_revision_must_advance_once';
  END IF;

  IF OLD."state" IS NOT DISTINCT FROM NEW."state"
    AND NEW."revision" <> OLD."revision"
  THEN
    RAISE EXCEPTION 'authority_platform_grant_revision_without_change';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "PlatformGrant_row_guard"
BEFORE UPDATE OR DELETE ON "PlatformGrant"
FOR EACH ROW EXECUTE FUNCTION "authority_platform_grant_row_guard"();

CREATE FUNCTION "authority_site_role_grant_scope_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  membership_tenant_id UUID;
BEGIN
  SELECT membership."tenantId"
  INTO membership_tenant_id
  FROM "MembershipEpoch" epoch
  JOIN "Membership" membership ON membership."id" = epoch."membershipId"
  WHERE epoch."id" = NEW."membershipEpochId";

  IF membership_tenant_id IS NULL
    OR membership_tenant_id <> NEW."tenantId"
  THEN
    RAISE EXCEPTION 'authority_site_role_grant_membership_scope_mismatch';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "SiteRoleGrant_scope_guard"
BEFORE INSERT OR UPDATE ON "SiteRoleGrant"
FOR EACH ROW EXECUTE FUNCTION "authority_site_role_grant_scope_guard"();

CREATE FUNCTION "authority_assert_membership_consistency"(membership_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  membership_row "Membership"%ROWTYPE;
  current_closed_at TIMESTAMPTZ(3);
BEGIN
  SELECT * INTO membership_row
  FROM "Membership"
  WHERE "id" = membership_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF membership_row."state" IN ('ACTIVE', 'SUSPENDED')
    AND membership_row."currentEpochId" IS NULL
  THEN
    RAISE EXCEPTION 'authority_membership_current_epoch_required';
  END IF;

  IF membership_row."currentEpochId" IS NOT NULL THEN
    SELECT "closedAt" INTO current_closed_at
    FROM "MembershipEpoch"
    WHERE "id" = membership_row."currentEpochId"
      AND "membershipId" = membership_row."id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'authority_membership_current_epoch_mismatch';
    END IF;

    IF membership_row."state" = 'REVOKED' AND current_closed_at IS NULL THEN
      RAISE EXCEPTION 'authority_revoked_membership_epoch_open';
    END IF;

    IF membership_row."state" <> 'REVOKED' AND current_closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'authority_current_membership_epoch_closed';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "MembershipEpoch" epoch
    WHERE epoch."membershipId" = membership_row."id"
      AND epoch."id" IS DISTINCT FROM membership_row."currentEpochId"
      AND epoch."closedAt" IS NULL
  ) THEN
    RAISE EXCEPTION 'authority_noncurrent_membership_epoch_open';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "MembershipEpoch" epoch
    LEFT JOIN "TenantRoleGrant" tenant_grant
      ON tenant_grant."membershipEpochId" = epoch."id"
      AND tenant_grant."state" = 'ACTIVE'
    LEFT JOIN "SiteRoleGrant" site_grant
      ON site_grant."membershipEpochId" = epoch."id"
      AND site_grant."state" = 'ACTIVE'
    WHERE epoch."membershipId" = membership_row."id"
      AND (tenant_grant."id" IS NOT NULL OR site_grant."id" IS NOT NULL)
      AND (
        epoch."id" IS DISTINCT FROM membership_row."currentEpochId"
        OR epoch."closedAt" IS NOT NULL
        OR membership_row."state" = 'REVOKED'
      )
  ) THEN
    RAISE EXCEPTION 'authority_active_grant_not_current';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "SiteRoleGrant" site_grant
    JOIN "MembershipEpoch" epoch
      ON epoch."id" = site_grant."membershipEpochId"
    WHERE epoch."membershipId" = membership_row."id"
      AND site_grant."tenantId" <> membership_row."tenantId"
  ) THEN
    RAISE EXCEPTION 'authority_site_role_grant_membership_scope_mismatch';
  END IF;
END
$function$;

CREATE FUNCTION "authority_membership_constraint_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  affected_membership_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'Membership' THEN
    affected_membership_id := NEW."id";
  ELSIF TG_TABLE_NAME = 'MembershipEpoch' THEN
    affected_membership_id := NEW."membershipId";
  ELSE
    SELECT "membershipId" INTO affected_membership_id
    FROM "MembershipEpoch"
    WHERE "id" = NEW."membershipEpochId";
  END IF;

  PERFORM "authority_assert_membership_consistency"(affected_membership_id);
  RETURN NULL;
END
$function$;

CREATE CONSTRAINT TRIGGER "Membership_consistency"
AFTER INSERT OR UPDATE ON "Membership"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_membership_constraint_guard"();
CREATE CONSTRAINT TRIGGER "MembershipEpoch_consistency"
AFTER INSERT OR UPDATE ON "MembershipEpoch"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_membership_constraint_guard"();
CREATE CONSTRAINT TRIGGER "TenantRoleGrant_consistency"
AFTER INSERT OR UPDATE ON "TenantRoleGrant"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_membership_constraint_guard"();
CREATE CONSTRAINT TRIGGER "SiteRoleGrant_consistency"
AFTER INSERT OR UPDATE ON "SiteRoleGrant"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_membership_constraint_guard"();

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
  ) THEN
    EXECUTE 'REVOKE DELETE ON TABLE
      "Membership",
      "MembershipEpoch",
      "TenantRoleGrant",
      "SiteRoleGrant",
      "PlatformGrant"
      FROM nebula_authority_runtime';
  END IF;
END
$block$;
