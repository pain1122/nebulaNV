-- F4 Batch 3R R1: inactive identity-realm control-plane records.
-- This migration adds no credentials, provider secrets, sessions, endpoints,
-- private keys, runtime reader, Auth/gateway integration, or traffic change.

CREATE TYPE "IdentityRealmKind" AS ENUM (
  'PLATFORM_OPERATOR',
  'LICENSED_ROOT_CONSUMER',
  'LICENSED_ROOT_WORKFORCE',
  'SUBORDINATE_CONSUMER',
  'SUBORDINATE_WORKFORCE'
);
CREATE TYPE "PrincipalClass" AS ENUM (
  'PLATFORM_OPERATOR',
  'CONSUMER',
  'WORKFORCE'
);
CREATE TYPE "IdentityProviderKind" AS ENUM ('NEBULA_LOCAL', 'OIDC', 'SAML');
CREATE TYPE "IdentityRealmLifecycle" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);
CREATE TYPE "ProviderTrustLifecycle" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);
CREATE TYPE "ApplicationIdentityPolicyLifecycle" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'DISABLED',
  'RETIRED'
);
CREATE TYPE "ApplicationLoginMode" AS ENUM (
  'LOCAL_LOGIN',
  'EXTERNAL_LOGIN',
  'ROOT_SSO_EXCHANGE',
  'LEGACY_DEFAULT_UPGRADE'
);
CREATE TYPE "FederationTrustMode" AS ENUM (
  'LOCAL_LOGIN',
  'EXTERNAL_LOGIN',
  'ROOT_SSO_EXCHANGE'
);

CREATE TABLE "IdentityRealm" (
  "id" UUID NOT NULL,
  "kind" "IdentityRealmKind" NOT NULL,
  "owningCustomerTenantId" UUID,
  "licensedRootTenantId" UUID,
  "isRootDefault" BOOLEAN NOT NULL DEFAULT false,
  "authRouteRef" CHAR(36) NOT NULL,
  "lifecycle" "IdentityRealmLifecycle" NOT NULL DEFAULT 'PROVISIONING',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "IdentityRealm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdentityRealm_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "IdentityRealm_authRouteRef_uuid_v4_check" CHECK (
    "authRouteRef" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "IdentityRealm_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "IdentityRealm_owner_shape_check" CHECK (
    (
      "kind" = 'PLATFORM_OPERATOR'
      AND "owningCustomerTenantId" IS NULL
      AND "licensedRootTenantId" IS NULL
      AND NOT "isRootDefault"
    )
    OR (
      "kind" IN ('LICENSED_ROOT_CONSUMER', 'LICENSED_ROOT_WORKFORCE')
      AND "owningCustomerTenantId" IS NOT NULL
      AND "licensedRootTenantId" = "owningCustomerTenantId"
      AND (NOT "isRootDefault" OR "kind" = 'LICENSED_ROOT_CONSUMER')
    )
    OR (
      "kind" IN ('SUBORDINATE_CONSUMER', 'SUBORDINATE_WORKFORCE')
      AND "owningCustomerTenantId" IS NOT NULL
      AND "licensedRootTenantId" IS NOT NULL
      AND "licensedRootTenantId" <> "owningCustomerTenantId"
      AND NOT "isRootDefault"
    )
  )
);

CREATE UNIQUE INDEX "IdentityRealm_authRouteRef_key"
  ON "IdentityRealm"("authRouteRef");
CREATE UNIQUE INDEX "IdentityRealm_id_licensedRootTenantId_key"
  ON "IdentityRealm"("id", "licensedRootTenantId");
CREATE UNIQUE INDEX "IdentityRealm_one_operator_key"
  ON "IdentityRealm" ((true))
  WHERE "kind" = 'PLATFORM_OPERATOR' AND "lifecycle" <> 'REVOKED';
CREATE UNIQUE INDEX "IdentityRealm_one_root_default_key"
  ON "IdentityRealm"("licensedRootTenantId")
  WHERE "isRootDefault" AND "lifecycle" <> 'REVOKED';
CREATE INDEX "IdentityRealm_owningCustomerTenantId_lifecycle_idx"
  ON "IdentityRealm"("owningCustomerTenantId", "lifecycle");
CREATE INDEX "IdentityRealm_licensedRootTenantId_lifecycle_idx"
  ON "IdentityRealm"("licensedRootTenantId", "lifecycle");
CREATE INDEX "IdentityRealm_kind_lifecycle_idx"
  ON "IdentityRealm"("kind", "lifecycle");

ALTER TABLE "IdentityRealm"
  ADD CONSTRAINT "IdentityRealm_owningCustomerTenantId_fkey"
  FOREIGN KEY ("owningCustomerTenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "IdentityRealm"
  ADD CONSTRAINT "IdentityRealm_licensedRootTenantId_fkey"
  FOREIGN KEY ("licensedRootTenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "IdentityProviderRegistration" (
  "id" UUID NOT NULL,
  "identityRealmId" UUID NOT NULL,
  "kind" "IdentityProviderKind" NOT NULL,
  "issuerReference" VARCHAR(512) NOT NULL,
  "lifecycle" "ProviderTrustLifecycle" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "IdentityProviderRegistration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdentityProviderRegistration_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "IdentityProviderRegistration_reference_check" CHECK (
    "issuerReference" = btrim("issuerReference")
    AND "issuerReference" <> ''
    AND "issuerReference" !~ '[[:space:]]'
    AND position('*' in "issuerReference") = 0
  ),
  CONSTRAINT "IdentityProviderRegistration_local_reference_check" CHECK (
    "kind" <> 'NEBULA_LOCAL'
    OR "issuerReference" = 'urn:nebula:local:' || "identityRealmId"::text
  ),
  CONSTRAINT "IdentityProviderRegistration_revision_check" CHECK (
    "revision" > 0
  )
);

CREATE UNIQUE INDEX "IdentityProviderRegistration_id_identityRealmId_key"
  ON "IdentityProviderRegistration"("id", "identityRealmId");
CREATE UNIQUE INDEX "IdentityProviderRegistration_nonrevoked_identity_key"
  ON "IdentityProviderRegistration"(
    "identityRealmId", "kind", "issuerReference"
  ) WHERE "lifecycle" <> 'REVOKED';
CREATE UNIQUE INDEX "IdentityProviderRegistration_one_local_key"
  ON "IdentityProviderRegistration"("identityRealmId")
  WHERE "kind" = 'NEBULA_LOCAL' AND "lifecycle" <> 'REVOKED';
CREATE INDEX "IdentityProviderRegistration_identityRealmId_lifecycle_idx"
  ON "IdentityProviderRegistration"("identityRealmId", "lifecycle");
CREATE INDEX "IdentityProviderRegistration_kind_lifecycle_idx"
  ON "IdentityProviderRegistration"("kind", "lifecycle");

ALTER TABLE "IdentityProviderRegistration"
  ADD CONSTRAINT "IdentityProviderRegistration_identityRealmId_fkey"
  FOREIGN KEY ("identityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "ApplicationIdentityPolicy" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "policyVersion" INTEGER NOT NULL,
  "audience" VARCHAR(255) NOT NULL,
  "acceptedPrincipalClasses" "PrincipalClass"[] NOT NULL,
  "loginModes" "ApplicationLoginMode"[] NOT NULL,
  "legacyDefaultUpgradeEligible" BOOLEAN NOT NULL DEFAULT false,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "lifecycle" "ApplicationIdentityPolicyLifecycle" NOT NULL DEFAULT 'DRAFT',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ApplicationIdentityPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationIdentityPolicy_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "ApplicationIdentityPolicy_version_check" CHECK (
    "policyVersion" > 0
  ),
  CONSTRAINT "ApplicationIdentityPolicy_revision_check" CHECK (
    "revision" > 0
  ),
  CONSTRAINT "ApplicationIdentityPolicy_audience_check" CHECK (
    "audience" = btrim("audience")
    AND "audience" <> ''
    AND "audience" !~ '[[:space:]]'
    AND position('*' in "audience") = 0
  ),
  CONSTRAINT "ApplicationIdentityPolicy_principal_classes_check" CHECK (
    cardinality("acceptedPrincipalClasses") > 0
    AND array_position("acceptedPrincipalClasses", NULL) IS NULL
  ),
  CONSTRAINT "ApplicationIdentityPolicy_login_modes_check" CHECK (
    cardinality("loginModes") > 0
    AND array_position("loginModes", NULL) IS NULL
  ),
  CONSTRAINT "ApplicationIdentityPolicy_legacy_mode_check" CHECK (
    "legacyDefaultUpgradeEligible" =
      ('LEGACY_DEFAULT_UPGRADE' = ANY("loginModes"))
  )
);

CREATE UNIQUE INDEX "ApplicationIdentityPolicy_applicationId_policyVersion_key"
  ON "ApplicationIdentityPolicy"("applicationId", "policyVersion");
CREATE UNIQUE INDEX "ApplicationIdentityPolicy_id_applicationId_audience_key"
  ON "ApplicationIdentityPolicy"("id", "applicationId", "audience");
CREATE UNIQUE INDEX "ApplicationIdentityPolicy_one_current_key"
  ON "ApplicationIdentityPolicy"("applicationId") WHERE "isCurrent";
CREATE INDEX "ApplicationIdentityPolicy_applicationId_lifecycle_isCurrent_idx"
  ON "ApplicationIdentityPolicy"("applicationId", "lifecycle", "isCurrent");

ALTER TABLE "ApplicationIdentityPolicy"
  ADD CONSTRAINT "ApplicationIdentityPolicy_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "FederationTrust" (
  "id" UUID NOT NULL,
  "applicationIdentityPolicyId" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "identityRealmId" UUID NOT NULL,
  "providerRegistrationId" UUID,
  "principalClass" "PrincipalClass" NOT NULL,
  "audience" VARCHAR(255) NOT NULL,
  "mode" "FederationTrustMode" NOT NULL,
  "lifecycle" "ProviderTrustLifecycle" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FederationTrust_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FederationTrust_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "FederationTrust_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "FederationTrust_audience_check" CHECK (
    "audience" = btrim("audience")
    AND "audience" <> ''
    AND "audience" !~ '[[:space:]]'
    AND position('*' in "audience") = 0
  )
);

CREATE UNIQUE INDEX "FederationTrust_exact_tuple_key"
  ON "FederationTrust"(
    "applicationIdentityPolicyId", "applicationId", "identityRealmId",
    "providerRegistrationId", "principalClass", "audience", "mode"
  ) NULLS NOT DISTINCT;
CREATE INDEX "FederationTrust_applicationId_lifecycle_idx"
  ON "FederationTrust"("applicationId", "lifecycle");
CREATE INDEX "FederationTrust_identityRealmId_lifecycle_idx"
  ON "FederationTrust"("identityRealmId", "lifecycle");
CREATE INDEX "FederationTrust_providerRegistrationId_lifecycle_idx"
  ON "FederationTrust"("providerRegistrationId", "lifecycle");
CREATE INDEX "FederationTrust_applicationIdentityPolicyId_lifecycle_idx"
  ON "FederationTrust"("applicationIdentityPolicyId", "lifecycle");

ALTER TABLE "FederationTrust"
  ADD CONSTRAINT "FederationTrust_policy_fkey"
  FOREIGN KEY (
    "applicationIdentityPolicyId", "applicationId", "audience"
  ) REFERENCES "ApplicationIdentityPolicy"("id", "applicationId", "audience")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FederationTrust"
  ADD CONSTRAINT "FederationTrust_identityRealmId_fkey"
  FOREIGN KEY ("identityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FederationTrust"
  ADD CONSTRAINT "FederationTrust_providerRegistrationId_fkey"
  FOREIGN KEY ("providerRegistrationId")
  REFERENCES "IdentityProviderRegistration"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "authority_identity_realm_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  owner_lifecycle "TenantSiteLifecycle";
  root_lifecycle "TenantSiteLifecycle";
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_identity_realm_retained';
  END IF;

  IF NEW."kind" IN ('SUBORDINATE_CONSUMER', 'SUBORDINATE_WORKFORCE')
    AND NOT EXISTS (
      SELECT 1 FROM "ParentRelationship" relationship
      WHERE relationship."parentTenantId" = NEW."licensedRootTenantId"
        AND relationship."subordinateTenantId" = NEW."owningCustomerTenantId"
    )
  THEN
    RAISE EXCEPTION 'authority_identity_realm_direct_parent_required';
  END IF;

  IF NEW."lifecycle" = 'ACTIVE' AND NEW."kind" <> 'PLATFORM_OPERATOR' THEN
    SELECT "lifecycle" INTO owner_lifecycle
    FROM "Tenant" WHERE "id" = NEW."owningCustomerTenantId";
    SELECT "lifecycle" INTO root_lifecycle
    FROM "Tenant" WHERE "id" = NEW."licensedRootTenantId";
    IF owner_lifecycle <> 'ACTIVE' OR root_lifecycle <> 'ACTIVE' THEN
      RAISE EXCEPTION 'authority_identity_realm_active_owner_required';
    END IF;
    IF NEW."kind" IN ('SUBORDINATE_CONSUMER', 'SUBORDINATE_WORKFORCE')
      AND NOT EXISTS (
        SELECT 1 FROM "ParentRelationship" relationship
        WHERE relationship."parentTenantId" = NEW."licensedRootTenantId"
          AND relationship."subordinateTenantId" = NEW."owningCustomerTenantId"
          AND relationship."state" = 'ACTIVE'
      )
    THEN
      RAISE EXCEPTION 'authority_identity_realm_active_parent_required';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."id" <> NEW."id"
      OR OLD."kind" <> NEW."kind"
      OR OLD."owningCustomerTenantId" IS DISTINCT FROM NEW."owningCustomerTenantId"
      OR OLD."licensedRootTenantId" IS DISTINCT FROM NEW."licensedRootTenantId"
      OR OLD."isRootDefault" <> NEW."isRootDefault"
      OR OLD."authRouteRef" <> NEW."authRouteRef"
      OR OLD."createdAt" <> NEW."createdAt"
    THEN
      RAISE EXCEPTION 'authority_identity_realm_identity_immutable';
    END IF;

    IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
      (OLD."lifecycle" = 'PROVISIONING' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
      OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('SUSPENDED', 'REVOKED'))
      OR (OLD."lifecycle" = 'SUSPENDED' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
    ) THEN
      RAISE EXCEPTION 'authority_identity_realm_lifecycle_transition_invalid';
    END IF;

    IF OLD."lifecycle" IS DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision" + 1
    THEN
      RAISE EXCEPTION 'authority_identity_realm_revision_must_advance_once';
    END IF;
    IF OLD."lifecycle" IS NOT DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision"
    THEN
      RAISE EXCEPTION 'authority_identity_realm_revision_without_change';
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "IdentityRealm_row_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "IdentityRealm"
FOR EACH ROW EXECUTE FUNCTION "authority_identity_realm_row_guard"();

CREATE FUNCTION "authority_assert_identity_realm_cardinality"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (SELECT count(*) FROM "IdentityRealm"
      WHERE "kind" = 'PLATFORM_OPERATOR' AND "lifecycle" <> 'REVOKED') <> 1
  THEN
    RAISE EXCEPTION 'authority_identity_realm_operator_cardinality';
  END IF;

  IF EXISTS (
    SELECT root."licensedRootTenantId"
    FROM "IdentityRealm" root
    WHERE root."licensedRootTenantId" IS NOT NULL
      AND root."kind" IN ('LICENSED_ROOT_CONSUMER', 'LICENSED_ROOT_WORKFORCE')
      AND root."lifecycle" <> 'REVOKED'
    GROUP BY root."licensedRootTenantId"
    HAVING count(*) FILTER (
      WHERE root."kind" = 'LICENSED_ROOT_CONSUMER'
        AND root."isRootDefault"
        AND root."lifecycle" <> 'REVOKED'
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'authority_identity_realm_root_default_cardinality';
  END IF;
  RETURN NULL;
END
$function$;

CREATE CONSTRAINT TRIGGER "IdentityRealm_cardinality"
AFTER INSERT OR UPDATE ON "IdentityRealm"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_assert_identity_realm_cardinality"();

CREATE FUNCTION "authority_provider_registration_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  realm_lifecycle "IdentityRealmLifecycle";
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_provider_registration_retained';
  END IF;
  SELECT "lifecycle" INTO realm_lifecycle
  FROM "IdentityRealm" WHERE "id" = NEW."identityRealmId";
  IF NEW."lifecycle" = 'ACTIVE' AND realm_lifecycle <> 'ACTIVE' THEN
    RAISE EXCEPTION 'authority_provider_registration_active_realm_required';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."id" <> NEW."id"
      OR OLD."identityRealmId" <> NEW."identityRealmId"
      OR OLD."kind" <> NEW."kind"
      OR OLD."issuerReference" <> NEW."issuerReference"
      OR OLD."createdAt" <> NEW."createdAt"
    THEN
      RAISE EXCEPTION 'authority_provider_registration_identity_immutable';
    END IF;
    IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
      (OLD."lifecycle" = 'PENDING_VERIFICATION' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
      OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('SUSPENDED', 'REVOKED'))
      OR (OLD."lifecycle" = 'SUSPENDED' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
    ) THEN
      RAISE EXCEPTION 'authority_provider_registration_lifecycle_transition_invalid';
    END IF;
    IF OLD."lifecycle" IS DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision" + 1
    THEN
      RAISE EXCEPTION 'authority_provider_registration_revision_must_advance_once';
    END IF;
    IF OLD."lifecycle" IS NOT DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision"
    THEN
      RAISE EXCEPTION 'authority_provider_registration_revision_without_change';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "IdentityProviderRegistration_row_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "IdentityProviderRegistration"
FOR EACH ROW EXECUTE FUNCTION "authority_provider_registration_row_guard"();

CREATE FUNCTION "authority_application_identity_policy_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  principal_count INTEGER;
  login_mode_count INTEGER;
  application_lifecycle "ApplicationLifecycle";
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_application_identity_policy_retained';
  END IF;

  SELECT count(DISTINCT value) INTO principal_count
  FROM unnest(NEW."acceptedPrincipalClasses") AS value;
  SELECT count(DISTINCT value) INTO login_mode_count
  FROM unnest(NEW."loginModes") AS value;
  IF principal_count <> cardinality(NEW."acceptedPrincipalClasses")
    OR login_mode_count <> cardinality(NEW."loginModes")
  THEN
    RAISE EXCEPTION 'authority_application_identity_policy_duplicate_mode';
  END IF;
  SELECT "lifecycle" INTO application_lifecycle
  FROM "Application" WHERE "id" = NEW."applicationId";
  IF NEW."lifecycle" = 'ACTIVE' AND application_lifecycle <> 'ACTIVE' THEN
    RAISE EXCEPTION 'authority_application_identity_policy_active_application_required';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."id" <> NEW."id"
      OR OLD."applicationId" <> NEW."applicationId"
      OR OLD."policyVersion" <> NEW."policyVersion"
      OR OLD."audience" <> NEW."audience"
      OR OLD."acceptedPrincipalClasses" <> NEW."acceptedPrincipalClasses"
      OR OLD."loginModes" <> NEW."loginModes"
      OR OLD."legacyDefaultUpgradeEligible" <> NEW."legacyDefaultUpgradeEligible"
      OR OLD."createdAt" <> NEW."createdAt"
    THEN
      RAISE EXCEPTION 'authority_application_identity_policy_identity_immutable';
    END IF;
    IF NOT OLD."isCurrent" AND NEW."isCurrent" THEN
      RAISE EXCEPTION 'authority_application_identity_policy_current_terminal';
    END IF;
    IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
      (OLD."lifecycle" = 'DRAFT' AND NEW."lifecycle" IN ('ACTIVE', 'DISABLED', 'RETIRED'))
      OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('DISABLED', 'RETIRED'))
      OR (OLD."lifecycle" = 'DISABLED' AND NEW."lifecycle" IN ('ACTIVE', 'RETIRED'))
    ) THEN
      RAISE EXCEPTION 'authority_application_identity_policy_lifecycle_transition_invalid';
    END IF;
    IF (
      OLD."lifecycle" IS DISTINCT FROM NEW."lifecycle"
      OR OLD."isCurrent" IS DISTINCT FROM NEW."isCurrent"
    ) AND NEW."revision" <> OLD."revision" + 1 THEN
      RAISE EXCEPTION 'authority_application_identity_policy_revision_must_advance_once';
    END IF;
    IF OLD."lifecycle" IS NOT DISTINCT FROM NEW."lifecycle"
      AND OLD."isCurrent" IS NOT DISTINCT FROM NEW."isCurrent"
      AND NEW."revision" <> OLD."revision"
    THEN
      RAISE EXCEPTION 'authority_application_identity_policy_revision_without_change';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "ApplicationIdentityPolicy_row_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ApplicationIdentityPolicy"
FOR EACH ROW EXECUTE FUNCTION "authority_application_identity_policy_row_guard"();

CREATE FUNCTION "authority_assert_application_identity_policy_cardinality"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT policy."applicationId"
    FROM "ApplicationIdentityPolicy" policy
    GROUP BY policy."applicationId"
    HAVING count(*) FILTER (WHERE policy."isCurrent") <> 1
  ) THEN
    RAISE EXCEPTION 'authority_application_identity_policy_current_cardinality';
  END IF;
  RETURN NULL;
END
$function$;

CREATE CONSTRAINT TRIGGER "ApplicationIdentityPolicy_cardinality"
AFTER INSERT OR UPDATE ON "ApplicationIdentityPolicy"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "authority_assert_application_identity_policy_cardinality"();

CREATE FUNCTION "authority_federation_trust_row_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  policy_principals "PrincipalClass"[];
  policy_modes "ApplicationLoginMode"[];
  policy_lifecycle "ApplicationIdentityPolicyLifecycle";
  application_tenant_id UUID;
  application_lifecycle "ApplicationLifecycle";
  realm_kind "IdentityRealmKind";
  realm_owner_id UUID;
  realm_root_id UUID;
  realm_lifecycle "IdentityRealmLifecycle";
  provider_realm_id UUID;
  provider_kind "IdentityProviderKind";
  provider_lifecycle "ProviderTrustLifecycle";
  expected_principal "PrincipalClass";
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'authority_federation_trust_retained';
  END IF;

  SELECT policy."acceptedPrincipalClasses", policy."loginModes",
         policy."lifecycle", application."tenantId", application."lifecycle"
  INTO policy_principals, policy_modes, policy_lifecycle,
       application_tenant_id, application_lifecycle
  FROM "ApplicationIdentityPolicy" policy
  JOIN "Application" application ON application."id" = policy."applicationId"
  WHERE policy."id" = NEW."applicationIdentityPolicyId"
    AND policy."applicationId" = NEW."applicationId"
    AND policy."audience" = NEW."audience";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'authority_federation_trust_policy_mismatch';
  END IF;

  SELECT realm."kind", realm."owningCustomerTenantId",
         realm."licensedRootTenantId", realm."lifecycle"
  INTO realm_kind, realm_owner_id, realm_root_id, realm_lifecycle
  FROM "IdentityRealm" realm
  WHERE realm."id" = NEW."identityRealmId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'authority_federation_trust_realm_missing';
  END IF;

  expected_principal := CASE
    WHEN realm_kind = 'PLATFORM_OPERATOR' THEN 'PLATFORM_OPERATOR'::"PrincipalClass"
    WHEN realm_kind IN ('LICENSED_ROOT_CONSUMER', 'SUBORDINATE_CONSUMER') THEN 'CONSUMER'::"PrincipalClass"
    ELSE 'WORKFORCE'::"PrincipalClass"
  END;
  IF NEW."principalClass" <> expected_principal
    OR NOT (NEW."principalClass" = ANY(policy_principals))
    OR NOT EXISTS (
      SELECT 1 FROM unnest(policy_modes) AS login_mode
      WHERE login_mode::text = NEW."mode"::text
    )
  THEN
    RAISE EXCEPTION 'authority_federation_trust_policy_capability_mismatch';
  END IF;

  IF NEW."providerRegistrationId" IS NOT NULL THEN
    SELECT provider."identityRealmId", provider."kind", provider."lifecycle"
    INTO provider_realm_id, provider_kind, provider_lifecycle
    FROM "IdentityProviderRegistration" provider
    WHERE provider."id" = NEW."providerRegistrationId";
    IF NOT FOUND OR provider_realm_id <> NEW."identityRealmId" THEN
      RAISE EXCEPTION 'authority_federation_trust_provider_realm_mismatch';
    END IF;
  END IF;

  IF NEW."mode" = 'LOCAL_LOGIN'
    AND (NEW."providerRegistrationId" IS NULL OR provider_kind <> 'NEBULA_LOCAL')
  THEN
    RAISE EXCEPTION 'authority_federation_trust_local_provider_required';
  END IF;
  IF NEW."mode" = 'EXTERNAL_LOGIN'
    AND (
      NEW."providerRegistrationId" IS NULL
      OR provider_kind NOT IN ('OIDC', 'SAML')
    )
  THEN
    RAISE EXCEPTION 'authority_federation_trust_external_provider_required';
  END IF;

  IF realm_kind <> 'PLATFORM_OPERATOR'
    AND application_tenant_id <> realm_owner_id
    AND NOT (
      realm_kind IN ('LICENSED_ROOT_CONSUMER', 'LICENSED_ROOT_WORKFORCE')
      AND EXISTS (
        SELECT 1 FROM "ParentRelationship" relationship
        WHERE relationship."parentTenantId" = realm_root_id
          AND relationship."subordinateTenantId" = application_tenant_id
      )
    )
  THEN
    RAISE EXCEPTION 'authority_federation_trust_license_boundary_mismatch';
  END IF;

  IF NEW."lifecycle" = 'ACTIVE' AND (
    policy_lifecycle <> 'ACTIVE'
    OR application_lifecycle <> 'ACTIVE'
    OR realm_lifecycle <> 'ACTIVE'
    OR (
      NEW."providerRegistrationId" IS NOT NULL
      AND provider_lifecycle <> 'ACTIVE'
    )
    OR (
      application_tenant_id <> realm_owner_id
      AND realm_kind <> 'PLATFORM_OPERATOR'
      AND NOT EXISTS (
        SELECT 1 FROM "ParentRelationship" relationship
        WHERE relationship."parentTenantId" = realm_root_id
          AND relationship."subordinateTenantId" = application_tenant_id
          AND relationship."state" = 'ACTIVE'
      )
    )
  ) THEN
    RAISE EXCEPTION 'authority_federation_trust_activation_prerequisite';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."id" <> NEW."id"
      OR OLD."applicationIdentityPolicyId" <> NEW."applicationIdentityPolicyId"
      OR OLD."applicationId" <> NEW."applicationId"
      OR OLD."identityRealmId" <> NEW."identityRealmId"
      OR OLD."providerRegistrationId" IS DISTINCT FROM NEW."providerRegistrationId"
      OR OLD."principalClass" <> NEW."principalClass"
      OR OLD."audience" <> NEW."audience"
      OR OLD."mode" <> NEW."mode"
      OR OLD."createdAt" <> NEW."createdAt"
    THEN
      RAISE EXCEPTION 'authority_federation_trust_identity_immutable';
    END IF;
    IF OLD."lifecycle" <> NEW."lifecycle" AND NOT (
      (OLD."lifecycle" = 'PENDING_VERIFICATION' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
      OR (OLD."lifecycle" = 'ACTIVE' AND NEW."lifecycle" IN ('SUSPENDED', 'REVOKED'))
      OR (OLD."lifecycle" = 'SUSPENDED' AND NEW."lifecycle" IN ('ACTIVE', 'REVOKED'))
    ) THEN
      RAISE EXCEPTION 'authority_federation_trust_lifecycle_transition_invalid';
    END IF;
    IF OLD."lifecycle" IS DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision" + 1
    THEN
      RAISE EXCEPTION 'authority_federation_trust_revision_must_advance_once';
    END IF;
    IF OLD."lifecycle" IS NOT DISTINCT FROM NEW."lifecycle"
      AND NEW."revision" <> OLD."revision"
    THEN
      RAISE EXCEPTION 'authority_federation_trust_revision_without_change';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "FederationTrust_row_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "FederationTrust"
FOR EACH ROW EXECUTE FUNCTION "authority_federation_trust_row_guard"();

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
  ) THEN
    EXECUTE 'REVOKE DELETE ON TABLE
      "IdentityRealm",
      "IdentityProviderRegistration",
      "ApplicationIdentityPolicy",
      "FederationTrust"
      FROM nebula_authority_runtime';
  END IF;
END
$block$;
