-- Batch 2 item 2: persistent tenant topology and application registrations.
-- This migration deliberately adds no memberships, grants, entitlements,
-- audit/outbox records, seed data, consumer contract, or traffic authority.

CREATE TYPE "TenantSiteLifecycle" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

CREATE TYPE "ChannelKind" AS ENUM ('WEB', 'ANDROID', 'IOS');

CREATE TYPE "ApplicationProfile" AS ENUM (
  'storefront-web',
  'admin-web',
  'mobile'
);

CREATE TYPE "ApplicationLifecycle" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'DISABLED',
  'REVOKED'
);

CREATE TYPE "WebOriginScheme" AS ENUM ('HTTP', 'HTTPS');

CREATE TYPE "IdentityVerificationState" AS ENUM (
  'PENDING',
  'VERIFIED',
  'REVOKED'
);

CREATE TYPE "VerificationEvidenceType" AS ENUM (
  'DNS_TXT',
  'PROVIDER_ACCOUNT',
  'SIGNED_ARTIFACT',
  'CONTROLLED_NON_PRODUCTION_SEED'
);

CREATE TYPE "ParentRelationshipState" AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);

CREATE TABLE "Tenant" (
  "id" UUID NOT NULL,
  "displayName" VARCHAR(120) NOT NULL,
  "lifecycle" "TenantSiteLifecycle" NOT NULL DEFAULT 'PROVISIONING',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Site" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "displayName" VARCHAR(120) NOT NULL,
  "lifecycle" "TenantSiteLifecycle" NOT NULL DEFAULT 'PROVISIONING',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Channel" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "kind" "ChannelKind" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "channelId" UUID NOT NULL,
  "displayName" VARCHAR(120) NOT NULL,
  "profile" "ApplicationProfile" NOT NULL,
  "lifecycle" "ApplicationLifecycle" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebOrigin" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "scheme" "WebOriginScheme" NOT NULL,
  "hostname" VARCHAR(253) NOT NULL,
  "port" INTEGER NOT NULL,
  "canonicalOrigin" VARCHAR(320) NOT NULL,
  "verificationState" "IdentityVerificationState" NOT NULL DEFAULT 'PENDING',
  "evidenceType" "VerificationEvidenceType",
  "evidenceReference" VARCHAR(512),
  "evidenceDigest" VARCHAR(128),
  "isNonProductionSeed" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "WebOrigin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AndroidIdentity" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "packageId" VARCHAR(255) NOT NULL,
  "signingCertificateSha256" CHAR(64) NOT NULL,
  "verificationState" "IdentityVerificationState" NOT NULL DEFAULT 'PENDING',
  "evidenceType" "VerificationEvidenceType",
  "evidenceReference" VARCHAR(512),
  "evidenceDigest" VARCHAR(128),
  "isNonProductionSeed" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AndroidIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IosIdentity" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  "teamId" VARCHAR(32) NOT NULL,
  "bundleId" VARCHAR(255) NOT NULL,
  "appStoreId" VARCHAR(32),
  "verificationState" "IdentityVerificationState" NOT NULL DEFAULT 'PENDING',
  "evidenceType" "VerificationEvidenceType",
  "evidenceReference" VARCHAR(512),
  "evidenceDigest" VARCHAR(128),
  "isNonProductionSeed" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "IosIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentRelationship" (
  "id" UUID NOT NULL,
  "parentTenantId" UUID NOT NULL,
  "subordinateTenantId" UUID NOT NULL,
  "state" "ParentRelationshipState" NOT NULL DEFAULT 'PENDING',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ParentRelationship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tenant_lifecycle_idx" ON "Tenant"("lifecycle");
CREATE INDEX "Site_tenantId_lifecycle_idx" ON "Site"("tenantId", "lifecycle");
CREATE INDEX "Site_tenantId_isPrimary_idx" ON "Site"("tenantId", "isPrimary");
CREATE UNIQUE INDEX "Site_id_tenantId_key" ON "Site"("id", "tenantId");
CREATE INDEX "Channel_tenantId_siteId_idx" ON "Channel"("tenantId", "siteId");
CREATE UNIQUE INDEX "Channel_siteId_kind_key" ON "Channel"("siteId", "kind");
CREATE UNIQUE INDEX "Channel_id_tenantId_siteId_key" ON "Channel"("id", "tenantId", "siteId");
CREATE UNIQUE INDEX "Application_clientId_key" ON "Application"("clientId");
CREATE INDEX "Application_lifecycle_idx" ON "Application"("lifecycle");
CREATE INDEX "Application_tenantId_siteId_lifecycle_idx" ON "Application"("tenantId", "siteId", "lifecycle");
CREATE INDEX "Application_tenantId_siteId_channelId_profile_idx" ON "Application"("tenantId", "siteId", "channelId", "profile");
CREATE UNIQUE INDEX "Application_id_tenantId_siteId_key" ON "Application"("id", "tenantId", "siteId");
CREATE INDEX "WebOrigin_applicationId_verificationState_idx" ON "WebOrigin"("applicationId", "verificationState");
CREATE INDEX "WebOrigin_tenantId_siteId_verificationState_idx" ON "WebOrigin"("tenantId", "siteId", "verificationState");
CREATE INDEX "WebOrigin_canonicalOrigin_idx" ON "WebOrigin"("canonicalOrigin");
CREATE INDEX "AndroidIdentity_applicationId_verificationState_idx" ON "AndroidIdentity"("applicationId", "verificationState");
CREATE INDEX "AndroidIdentity_tenantId_siteId_verificationState_idx" ON "AndroidIdentity"("tenantId", "siteId", "verificationState");
CREATE INDEX "AndroidIdentity_packageId_idx" ON "AndroidIdentity"("packageId");
CREATE INDEX "IosIdentity_applicationId_verificationState_idx" ON "IosIdentity"("applicationId", "verificationState");
CREATE INDEX "IosIdentity_tenantId_siteId_verificationState_idx" ON "IosIdentity"("tenantId", "siteId", "verificationState");
CREATE INDEX "IosIdentity_teamId_bundleId_idx" ON "IosIdentity"("teamId", "bundleId");
CREATE INDEX "ParentRelationship_parentTenantId_state_idx" ON "ParentRelationship"("parentTenantId", "state");
CREATE INDEX "ParentRelationship_subordinateTenantId_state_idx" ON "ParentRelationship"("subordinateTenantId", "state");

ALTER TABLE "Site"
  ADD CONSTRAINT "Site_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Channel"
  ADD CONSTRAINT "Channel_siteId_tenantId_fkey"
  FOREIGN KEY ("siteId", "tenantId") REFERENCES "Site"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_channelId_tenantId_siteId_fkey"
  FOREIGN KEY ("channelId", "tenantId", "siteId")
  REFERENCES "Channel"("id", "tenantId", "siteId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "WebOrigin"
  ADD CONSTRAINT "WebOrigin_applicationId_tenantId_siteId_fkey"
  FOREIGN KEY ("applicationId", "tenantId", "siteId")
  REFERENCES "Application"("id", "tenantId", "siteId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "AndroidIdentity"
  ADD CONSTRAINT "AndroidIdentity_applicationId_tenantId_siteId_fkey"
  FOREIGN KEY ("applicationId", "tenantId", "siteId")
  REFERENCES "Application"("id", "tenantId", "siteId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "IosIdentity"
  ADD CONSTRAINT "IosIdentity_applicationId_tenantId_siteId_fkey"
  FOREIGN KEY ("applicationId", "tenantId", "siteId")
  REFERENCES "Application"("id", "tenantId", "siteId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ParentRelationship"
  ADD CONSTRAINT "ParentRelationship_parentTenantId_fkey"
  FOREIGN KEY ("parentTenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ParentRelationship"
  ADD CONSTRAINT "ParentRelationship_subordinateTenantId_fkey"
  FOREIGN KEY ("subordinateTenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Prisma cannot express the checks and partial uniqueness below. Keep their
-- names stable so focused migration evidence can prove the real database
-- boundary instead of relying on application prechecks.

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "Tenant_displayName_check"
    CHECK ("displayName" = btrim("displayName") AND length("displayName") > 0),
  ADD CONSTRAINT "Tenant_revision_check" CHECK ("revision" >= 1);

ALTER TABLE "Site"
  ADD CONSTRAINT "Site_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "Site_displayName_check"
    CHECK ("displayName" = btrim("displayName") AND length("displayName") > 0),
  ADD CONSTRAINT "Site_revision_check" CHECK ("revision" >= 1);

ALTER TABLE "Channel"
  ADD CONSTRAINT "Channel_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

ALTER TABLE "Application"
  ADD CONSTRAINT "Application_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "Application_clientId_uuid_v4_check"
    CHECK ("clientId"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "Application_displayName_check"
    CHECK ("displayName" = btrim("displayName") AND length("displayName") > 0),
  ADD CONSTRAINT "Application_revision_check" CHECK ("revision" >= 1);

ALTER TABLE "WebOrigin"
  ADD CONSTRAINT "WebOrigin_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "WebOrigin_port_check" CHECK ("port" BETWEEN 1 AND 65535),
  ADD CONSTRAINT "WebOrigin_hostname_check" CHECK (
    "hostname" = lower("hostname")
    AND "hostname" !~ '[[:space:]*]'
    AND (
      "hostname" IN ('localhost', '127.0.0.1', '[::1]')
      OR "hostname" ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
    )
  ),
  ADD CONSTRAINT "WebOrigin_canonical_check" CHECK (
    "canonicalOrigin" = lower("scheme"::text) || '://' || "hostname" || ':' || "port"::text
  ),
  ADD CONSTRAINT "WebOrigin_environment_check" CHECK (
    (
      "isNonProductionSeed"
      AND "hostname" IN ('localhost', '127.0.0.1', '[::1]')
      AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED'
    )
    OR (
      NOT "isNonProductionSeed"
      AND "scheme" = 'HTTPS'
      AND "hostname" NOT IN ('localhost', '127.0.0.1', '[::1]')
      AND "evidenceType" IS DISTINCT FROM 'CONTROLLED_NON_PRODUCTION_SEED'
    )
  ),
  ADD CONSTRAINT "WebOrigin_verification_facts_check" CHECK (
    (
      "verificationState" = 'PENDING'
      AND "verifiedAt" IS NULL
      AND "revokedAt" IS NULL
    )
    OR (
      "verificationState" = 'VERIFIED'
      AND "verifiedAt" IS NOT NULL
      AND "revokedAt" IS NULL
      AND "evidenceType" IS NOT NULL
      AND ("evidenceReference" IS NOT NULL OR "evidenceDigest" IS NOT NULL)
    )
    OR (
      "verificationState" = 'REVOKED'
      AND "revokedAt" IS NOT NULL
    )
  );

ALTER TABLE "AndroidIdentity"
  ADD CONSTRAINT "AndroidIdentity_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "AndroidIdentity_packageId_check" CHECK (
    "packageId" = lower("packageId")
    AND "packageId" ~ '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$'
  ),
  ADD CONSTRAINT "AndroidIdentity_certificate_check"
    CHECK ("signingCertificateSha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "AndroidIdentity_environment_check" CHECK (
    ("isNonProductionSeed" AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED')
    OR (
      NOT "isNonProductionSeed"
      AND "evidenceType" IS DISTINCT FROM 'CONTROLLED_NON_PRODUCTION_SEED'
    )
  ),
  ADD CONSTRAINT "AndroidIdentity_verification_facts_check" CHECK (
    (
      "verificationState" = 'PENDING'
      AND "verifiedAt" IS NULL
      AND "revokedAt" IS NULL
    )
    OR (
      "verificationState" = 'VERIFIED'
      AND "verifiedAt" IS NOT NULL
      AND "revokedAt" IS NULL
      AND "evidenceType" IS NOT NULL
      AND ("evidenceReference" IS NOT NULL OR "evidenceDigest" IS NOT NULL)
    )
    OR (
      "verificationState" = 'REVOKED'
      AND "revokedAt" IS NOT NULL
    )
  );

ALTER TABLE "IosIdentity"
  ADD CONSTRAINT "IosIdentity_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "IosIdentity_teamId_check" CHECK (
    "teamId" = upper("teamId") AND "teamId" ~ '^[A-Z0-9]{1,32}$'
  ),
  ADD CONSTRAINT "IosIdentity_bundleId_check" CHECK (
    "bundleId" !~ '[[:space:]*]'
    AND "bundleId" ~ '^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+$'
  ),
  ADD CONSTRAINT "IosIdentity_appStoreId_check" CHECK (
    "appStoreId" IS NULL OR "appStoreId" ~ '^[0-9]+$'
  ),
  ADD CONSTRAINT "IosIdentity_environment_check" CHECK (
    ("isNonProductionSeed" AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED')
    OR (
      NOT "isNonProductionSeed"
      AND "evidenceType" IS DISTINCT FROM 'CONTROLLED_NON_PRODUCTION_SEED'
    )
  ),
  ADD CONSTRAINT "IosIdentity_verification_facts_check" CHECK (
    (
      "verificationState" = 'PENDING'
      AND "verifiedAt" IS NULL
      AND "revokedAt" IS NULL
    )
    OR (
      "verificationState" = 'VERIFIED'
      AND "verifiedAt" IS NOT NULL
      AND "revokedAt" IS NULL
      AND "evidenceType" IS NOT NULL
      AND ("evidenceReference" IS NOT NULL OR "evidenceDigest" IS NOT NULL)
    )
    OR (
      "verificationState" = 'REVOKED'
      AND "revokedAt" IS NOT NULL
    )
  );

ALTER TABLE "ParentRelationship"
  ADD CONSTRAINT "ParentRelationship_id_uuid_v4_check"
    CHECK ("id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  ADD CONSTRAINT "ParentRelationship_endpoints_check"
    CHECK ("parentTenantId" <> "subordinateTenantId"),
  ADD CONSTRAINT "ParentRelationship_revision_check" CHECK ("revision" >= 1);

CREATE UNIQUE INDEX "Site_one_primary_per_tenant_key"
  ON "Site"("tenantId")
  WHERE "isPrimary";

CREATE UNIQUE INDEX "WebOrigin_current_canonicalOrigin_key"
  ON "WebOrigin"("canonicalOrigin")
  WHERE "verificationState" <> 'REVOKED';

CREATE UNIQUE INDEX "AndroidIdentity_current_pair_key"
  ON "AndroidIdentity"("packageId", "signingCertificateSha256")
  WHERE "verificationState" <> 'REVOKED';

CREATE UNIQUE INDEX "IosIdentity_current_pair_key"
  ON "IosIdentity"("teamId", "bundleId")
  WHERE "verificationState" <> 'REVOKED';

CREATE UNIQUE INDEX "ParentRelationship_current_subordinate_key"
  ON "ParentRelationship"("subordinateTenantId")
  WHERE "state" IN ('PENDING', 'ACTIVE');

CREATE UNIQUE INDEX "ParentRelationship_current_pair_key"
  ON "ParentRelationship"("parentTenantId", "subordinateTenantId")
  WHERE "state" IN ('PENDING', 'ACTIVE');

CREATE FUNCTION "authority_tenant_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."id" <> NEW."id" THEN
    RAISE EXCEPTION 'authority_tenant_id_immutable';
  END IF;

  IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
    (OLD."lifecycle" = 'PROVISIONING' AND NEW."lifecycle" IN ('ACTIVE', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('SUSPENDED', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'SUSPENDED' AND NEW."lifecycle" IN ('ACTIVE', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'ARCHIVED' AND NEW."lifecycle" = 'SUSPENDED')
  ) THEN
    RAISE EXCEPTION 'authority_tenant_lifecycle_transition_invalid';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "Tenant_guard"
BEFORE UPDATE ON "Tenant"
FOR EACH ROW EXECUTE FUNCTION "authority_tenant_guard"();

CREATE FUNCTION "authority_site_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."id" <> NEW."id" OR OLD."tenantId" <> NEW."tenantId" THEN
    RAISE EXCEPTION 'authority_site_ownership_immutable';
  END IF;

  IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
    (OLD."lifecycle" = 'PROVISIONING' AND NEW."lifecycle" IN ('ACTIVE', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('SUSPENDED', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'SUSPENDED' AND NEW."lifecycle" IN ('ACTIVE', 'ARCHIVED'))
    OR (OLD."lifecycle" = 'ARCHIVED' AND NEW."lifecycle" = 'SUSPENDED')
  ) THEN
    RAISE EXCEPTION 'authority_site_lifecycle_transition_invalid';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "Site_guard"
BEFORE UPDATE ON "Site"
FOR EACH ROW EXECUTE FUNCTION "authority_site_guard"();

CREATE FUNCTION "authority_channel_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."id" <> NEW."id"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" <> NEW."siteId"
    OR OLD."kind" <> NEW."kind"
  THEN
    RAISE EXCEPTION 'authority_channel_identity_immutable';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "Channel_guard"
BEFORE UPDATE ON "Channel"
FOR EACH ROW EXECUTE FUNCTION "authority_channel_guard"();

CREATE FUNCTION "authority_application_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  channel_kind text;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD."id" <> NEW."id"
    OR OLD."clientId" <> NEW."clientId"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" <> NEW."siteId"
    OR OLD."channelId" <> NEW."channelId"
  ) THEN
    RAISE EXCEPTION 'authority_application_identity_or_ownership_immutable';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD."lifecycle" <> NEW."lifecycle"
    AND NOT (
      (OLD."lifecycle" = 'PENDING_VERIFICATION' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
      OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('PENDING_VERIFICATION', 'DISABLED', 'REVOKED'))
      OR (OLD."lifecycle" = 'DISABLED' AND NEW."lifecycle" IN ('PENDING_VERIFICATION', 'ACTIVE', 'REVOKED'))
    )
  THEN
    RAISE EXCEPTION 'authority_application_lifecycle_transition_invalid';
  END IF;

  SELECT "kind"::text
  INTO channel_kind
  FROM "Channel"
  WHERE "id" = NEW."channelId"
    AND "tenantId" = NEW."tenantId"
    AND "siteId" = NEW."siteId";

  IF channel_kind IS NULL THEN
    RAISE EXCEPTION 'authority_application_channel_scope_missing';
  END IF;

  IF (channel_kind = 'WEB' AND NEW."profile"::text NOT IN ('storefront-web', 'admin-web'))
    OR (channel_kind IN ('ANDROID', 'IOS') AND NEW."profile"::text <> 'mobile')
  THEN
    RAISE EXCEPTION 'authority_application_profile_channel_mismatch';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "Application_guard"
BEFORE INSERT OR UPDATE ON "Application"
FOR EACH ROW EXECUTE FUNCTION "authority_application_guard"();

CREATE FUNCTION "authority_identity_state_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."verificationState" <> NEW."verificationState" AND NOT (
    (OLD."verificationState" = 'PENDING' AND NEW."verificationState" IN ('VERIFIED', 'REVOKED'))
    OR (OLD."verificationState" = 'VERIFIED' AND NEW."verificationState" = 'REVOKED')
  ) THEN
    RAISE EXCEPTION 'authority_identity_verification_transition_invalid';
  END IF;

  RETURN NEW;
END
$function$;

CREATE FUNCTION "authority_web_origin_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  channel_kind text;
  current_origin_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD."id" <> NEW."id"
    OR OLD."applicationId" <> NEW."applicationId"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" <> NEW."siteId"
    OR OLD."scheme" <> NEW."scheme"
    OR OLD."hostname" <> NEW."hostname"
    OR OLD."port" <> NEW."port"
    OR OLD."canonicalOrigin" <> NEW."canonicalOrigin"
  ) THEN
    RAISE EXCEPTION 'authority_web_origin_identity_immutable';
  END IF;

  SELECT channel."kind"::text
  INTO channel_kind
  FROM "Application" AS application
  JOIN "Channel" AS channel
    ON channel."id" = application."channelId"
   AND channel."tenantId" = application."tenantId"
   AND channel."siteId" = application."siteId"
  WHERE application."id" = NEW."applicationId"
    AND application."tenantId" = NEW."tenantId"
    AND application."siteId" = NEW."siteId";

  IF channel_kind IS DISTINCT FROM 'WEB' THEN
    RAISE EXCEPTION 'authority_web_origin_requires_web_channel';
  END IF;

  IF NEW."verificationState" <> 'REVOKED' THEN
    SELECT count(*)
    INTO current_origin_count
    FROM "WebOrigin"
    WHERE "applicationId" = NEW."applicationId"
      AND "verificationState" <> 'REVOKED'
      AND "id" <> NEW."id";

    IF current_origin_count >= 8 THEN
      RAISE EXCEPTION 'authority_web_origin_limit_exceeded';
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "WebOrigin_guard"
BEFORE INSERT OR UPDATE ON "WebOrigin"
FOR EACH ROW EXECUTE FUNCTION "authority_web_origin_guard"();

CREATE TRIGGER "WebOrigin_state_guard"
BEFORE UPDATE ON "WebOrigin"
FOR EACH ROW EXECUTE FUNCTION "authority_identity_state_guard"();

CREATE FUNCTION "authority_android_identity_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  channel_kind text;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD."id" <> NEW."id"
    OR OLD."applicationId" <> NEW."applicationId"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" <> NEW."siteId"
    OR OLD."packageId" <> NEW."packageId"
    OR OLD."signingCertificateSha256" <> NEW."signingCertificateSha256"
  ) THEN
    RAISE EXCEPTION 'authority_android_identity_immutable';
  END IF;

  SELECT channel."kind"::text
  INTO channel_kind
  FROM "Application" AS application
  JOIN "Channel" AS channel
    ON channel."id" = application."channelId"
   AND channel."tenantId" = application."tenantId"
   AND channel."siteId" = application."siteId"
  WHERE application."id" = NEW."applicationId"
    AND application."tenantId" = NEW."tenantId"
    AND application."siteId" = NEW."siteId";

  IF channel_kind IS DISTINCT FROM 'ANDROID' THEN
    RAISE EXCEPTION 'authority_android_identity_requires_android_channel';
  END IF;

  IF NEW."verificationState" <> 'REVOKED' AND EXISTS (
    SELECT 1
    FROM "AndroidIdentity"
    WHERE "packageId" = NEW."packageId"
      AND "applicationId" <> NEW."applicationId"
      AND "verificationState" <> 'REVOKED'
      AND "id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'authority_android_package_claimed_by_other_application';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "AndroidIdentity_guard"
BEFORE INSERT OR UPDATE ON "AndroidIdentity"
FOR EACH ROW EXECUTE FUNCTION "authority_android_identity_guard"();

CREATE TRIGGER "AndroidIdentity_state_guard"
BEFORE UPDATE ON "AndroidIdentity"
FOR EACH ROW EXECUTE FUNCTION "authority_identity_state_guard"();

CREATE FUNCTION "authority_ios_identity_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  channel_kind text;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD."id" <> NEW."id"
    OR OLD."applicationId" <> NEW."applicationId"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" <> NEW."siteId"
    OR OLD."teamId" <> NEW."teamId"
    OR OLD."bundleId" <> NEW."bundleId"
  ) THEN
    RAISE EXCEPTION 'authority_ios_identity_immutable';
  END IF;

  SELECT channel."kind"::text
  INTO channel_kind
  FROM "Application" AS application
  JOIN "Channel" AS channel
    ON channel."id" = application."channelId"
   AND channel."tenantId" = application."tenantId"
   AND channel."siteId" = application."siteId"
  WHERE application."id" = NEW."applicationId"
    AND application."tenantId" = NEW."tenantId"
    AND application."siteId" = NEW."siteId";

  IF channel_kind IS DISTINCT FROM 'IOS' THEN
    RAISE EXCEPTION 'authority_ios_identity_requires_ios_channel';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "IosIdentity_guard"
BEFORE INSERT OR UPDATE ON "IosIdentity"
FOR EACH ROW EXECUTE FUNCTION "authority_ios_identity_guard"();

CREATE TRIGGER "IosIdentity_state_guard"
BEFORE UPDATE ON "IosIdentity"
FOR EACH ROW EXECUTE FUNCTION "authority_identity_state_guard"();

CREATE FUNCTION "authority_parent_relationship_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  creates_cycle boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD."id" <> NEW."id"
    OR OLD."parentTenantId" <> NEW."parentTenantId"
    OR OLD."subordinateTenantId" <> NEW."subordinateTenantId"
  ) THEN
    RAISE EXCEPTION 'authority_parent_relationship_endpoints_immutable';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD."state" <> NEW."state"
    AND NOT (
      (OLD."state" = 'PENDING' AND NEW."state" IN ('ACTIVE', 'REVOKED'))
      OR (OLD."state" = 'ACTIVE' AND NEW."state" IN ('SUSPENDED', 'REVOKED'))
      OR (OLD."state" = 'SUSPENDED' AND NEW."state" IN ('ACTIVE', 'REVOKED'))
    )
  THEN
    RAISE EXCEPTION 'authority_parent_relationship_transition_invalid';
  END IF;

  IF NEW."state" IN ('PENDING', 'ACTIVE') THEN
    WITH RECURSIVE descendants("tenantId") AS (
      SELECT relationship."subordinateTenantId"
      FROM "ParentRelationship" AS relationship
      WHERE relationship."parentTenantId" = NEW."subordinateTenantId"
        AND relationship."state" IN ('PENDING', 'ACTIVE')
        AND relationship."id" <> NEW."id"

      UNION

      SELECT relationship."subordinateTenantId"
      FROM "ParentRelationship" AS relationship
      JOIN descendants
        ON descendants."tenantId" = relationship."parentTenantId"
      WHERE relationship."state" IN ('PENDING', 'ACTIVE')
        AND relationship."id" <> NEW."id"
    )
    SELECT EXISTS (
      SELECT 1
      FROM descendants
      WHERE "tenantId" = NEW."parentTenantId"
    )
    INTO creates_cycle;

    IF creates_cycle THEN
      RAISE EXCEPTION 'authority_parent_relationship_cycle';
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "ParentRelationship_guard"
BEFORE INSERT OR UPDATE ON "ParentRelationship"
FOR EACH ROW EXECUTE FUNCTION "authority_parent_relationship_guard"();

CREATE FUNCTION "authority_assert_active_tenant_primary_site"(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  tenant_lifecycle text;
  primary_count integer;
BEGIN
  SELECT "lifecycle"::text
  INTO tenant_lifecycle
  FROM "Tenant"
  WHERE "id" = tenant_id;

  IF tenant_lifecycle = 'ACTIVE' THEN
    SELECT count(*)
    INTO primary_count
    FROM "Site"
    WHERE "tenantId" = tenant_id
      AND "isPrimary";

    IF primary_count <> 1 THEN
      RAISE EXCEPTION 'authority_active_tenant_requires_exactly_one_primary_site';
    END IF;
  END IF;
END
$function$;

CREATE FUNCTION "authority_active_tenant_primary_site_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'Tenant' THEN
    PERFORM "authority_assert_active_tenant_primary_site"(
      CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END
    );
  ELSE
    PERFORM "authority_assert_active_tenant_primary_site"(
      CASE WHEN TG_OP = 'DELETE' THEN OLD."tenantId" ELSE NEW."tenantId" END
    );
  END IF;

  RETURN NULL;
END
$function$;

CREATE CONSTRAINT TRIGGER "Tenant_active_primary_site_check"
AFTER INSERT OR UPDATE OR DELETE ON "Tenant"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_active_tenant_primary_site_trigger"();

CREATE CONSTRAINT TRIGGER "Site_active_primary_site_check"
AFTER INSERT OR UPDATE OR DELETE ON "Site"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_active_tenant_primary_site_trigger"();

CREATE FUNCTION "authority_assert_application_registration"(application_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  application_lifecycle text;
  application_profile text;
  channel_kind text;
  tenant_lifecycle text;
  site_lifecycle text;
  web_current_count integer;
  web_verified_count integer;
  android_current_count integer;
  android_verified_count integer;
  ios_current_count integer;
  ios_verified_count integer;
BEGIN
  SELECT
    application."lifecycle"::text,
    application."profile"::text,
    channel."kind"::text,
    tenant."lifecycle"::text,
    site."lifecycle"::text
  INTO
    application_lifecycle,
    application_profile,
    channel_kind,
    tenant_lifecycle,
    site_lifecycle
  FROM "Application" AS application
  JOIN "Channel" AS channel
    ON channel."id" = application."channelId"
   AND channel."tenantId" = application."tenantId"
   AND channel."siteId" = application."siteId"
  JOIN "Site" AS site
    ON site."id" = application."siteId"
   AND site."tenantId" = application."tenantId"
  JOIN "Tenant" AS tenant
    ON tenant."id" = application."tenantId"
  WHERE application."id" = application_id;

  IF application_lifecycle IS NULL THEN
    RETURN;
  END IF;

  SELECT
    count(*) FILTER (WHERE "verificationState" <> 'REVOKED'),
    count(*) FILTER (WHERE "verificationState" = 'VERIFIED')
  INTO web_current_count, web_verified_count
  FROM "WebOrigin"
  WHERE "applicationId" = application_id;

  SELECT
    count(*) FILTER (WHERE "verificationState" <> 'REVOKED'),
    count(*) FILTER (WHERE "verificationState" = 'VERIFIED')
  INTO android_current_count, android_verified_count
  FROM "AndroidIdentity"
  WHERE "applicationId" = application_id;

  SELECT
    count(*) FILTER (WHERE "verificationState" <> 'REVOKED'),
    count(*) FILTER (WHERE "verificationState" = 'VERIFIED')
  INTO ios_current_count, ios_verified_count
  FROM "IosIdentity"
  WHERE "applicationId" = application_id;

  IF web_current_count > 8 THEN
    RAISE EXCEPTION 'authority_web_origin_limit_exceeded';
  END IF;

  IF application_lifecycle = 'ACTIVE' AND (
    tenant_lifecycle <> 'ACTIVE'
    OR site_lifecycle <> 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'authority_active_application_requires_active_scope';
  END IF;

  IF application_lifecycle = 'ACTIVE' AND channel_kind = 'WEB' AND (
    application_profile NOT IN ('storefront-web', 'admin-web')
    OR web_verified_count < 1
    OR android_current_count <> 0
    OR ios_current_count <> 0
  ) THEN
    RAISE EXCEPTION 'authority_active_web_application_identity_invalid';
  END IF;

  IF application_lifecycle = 'ACTIVE' AND channel_kind = 'ANDROID' AND (
    application_profile <> 'mobile'
    OR android_verified_count < 1
    OR web_current_count <> 0
    OR ios_current_count <> 0
  ) THEN
    RAISE EXCEPTION 'authority_active_android_application_identity_invalid';
  END IF;

  IF application_lifecycle = 'ACTIVE' AND channel_kind = 'IOS' AND (
    application_profile <> 'mobile'
    OR ios_verified_count < 1
    OR web_current_count <> 0
    OR android_current_count <> 0
  ) THEN
    RAISE EXCEPTION 'authority_active_ios_application_identity_invalid';
  END IF;
END
$function$;

CREATE FUNCTION "authority_application_registration_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM "authority_assert_application_registration"(
    CASE WHEN TG_OP = 'DELETE' THEN OLD."applicationId" ELSE NEW."applicationId" END
  );

  IF TG_OP = 'UPDATE' AND OLD."applicationId" <> NEW."applicationId" THEN
    PERFORM "authority_assert_application_registration"(OLD."applicationId");
  END IF;

  RETURN NULL;
END
$function$;

CREATE FUNCTION "authority_application_row_registration_trigger"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM "authority_assert_application_registration"(
    CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END
  );
  RETURN NULL;
END
$function$;

CREATE CONSTRAINT TRIGGER "Application_registration_check"
AFTER INSERT OR UPDATE OR DELETE ON "Application"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_application_row_registration_trigger"();

CREATE CONSTRAINT TRIGGER "WebOrigin_application_registration_check"
AFTER INSERT OR UPDATE OR DELETE ON "WebOrigin"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_application_registration_trigger"();

CREATE CONSTRAINT TRIGGER "AndroidIdentity_application_registration_check"
AFTER INSERT OR UPDATE OR DELETE ON "AndroidIdentity"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_application_registration_trigger"();

CREATE CONSTRAINT TRIGGER "IosIdentity_application_registration_check"
AFTER INSERT OR UPDATE OR DELETE ON "IosIdentity"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_application_registration_trigger"();

-- The package ID belongs to one current application, while one application
-- may retain multiple current signing fingerprints during an evidenced key
-- rotation. btree_gist expresses that cross-row rule without blocking those
-- same-application fingerprints.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "AndroidIdentity"
  ADD CONSTRAINT "AndroidIdentity_current_package_application_excl"
  EXCLUDE USING gist (
    "packageId" WITH =,
    "applicationId" WITH <>
  )
  WHERE ("verificationState" <> 'REVOKED');

-- Runtime code has no hard-delete operation. Revocation/tombstones retain
-- identifiers and natural-identity history; the migration administrator keeps
-- rollback/recovery ownership.
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
  ) THEN
    EXECUTE 'REVOKE DELETE ON TABLE
      "Tenant",
      "Site",
      "Channel",
      "Application",
      "WebOrigin",
      "AndroidIdentity",
      "IosIdentity",
      "ParentRelationship"
      FROM nebula_authority_runtime';
  END IF;
END
$block$;
