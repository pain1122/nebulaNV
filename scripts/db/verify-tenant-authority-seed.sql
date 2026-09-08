-- Batch 2 default-development seed evidence. This script is read-only and is
-- run only after the disposable verifier executes the seed twice.

DO $block$
DECLARE
  default_tenant UUID := 'a1000000-0000-4000-8000-000000000001';
  default_site UUID := 'a2000000-0000-4000-8000-000000000001';
  default_realm UUID := 'b1000000-0000-4000-8000-000000000001';
  operator_realm UUID := 'b1000000-0000-4000-8000-000000000002';
  default_provider UUID := 'b2000000-0000-4000-8000-000000000001';
  operator_provider UUID := 'b2000000-0000-4000-8000-000000000002';
BEGIN
  IF (SELECT count(*) FROM "Tenant" WHERE "id" = default_tenant
      AND "displayName" = 'Nebula Development Tenant'
      AND "lifecycle" = 'ACTIVE' AND "revision" = 1) <> 1 THEN
    RAISE EXCEPTION 'authority_default_seed_tenant_mismatch';
  END IF;

  IF (SELECT count(*) FROM "Site" WHERE "id" = default_site
      AND "tenantId" = default_tenant AND "isPrimary"
      AND "lifecycle" = 'ACTIVE' AND "revision" = 1) <> 1 THEN
    RAISE EXCEPTION 'authority_default_seed_site_mismatch';
  END IF;

  IF (SELECT count(*) FROM "Channel" WHERE "siteId" = default_site) <> 3
    OR (SELECT count(DISTINCT "kind") FROM "Channel"
        WHERE "siteId" = default_site AND "kind" IN ('WEB', 'ANDROID', 'IOS')) <> 3 THEN
    RAISE EXCEPTION 'authority_default_seed_channels_mismatch';
  END IF;

  IF (SELECT count(*) FROM "Application" WHERE "siteId" = default_site
      AND "lifecycle" = 'ACTIVE') <> 4
    OR (SELECT count(*) FROM "Application" WHERE "siteId" = default_site
        AND "profile" = 'storefront-web') <> 1
    OR (SELECT count(*) FROM "Application" WHERE "siteId" = default_site
        AND "profile" = 'admin-web') <> 1
    OR (SELECT count(*) FROM "Application" WHERE "siteId" = default_site
        AND "profile" = 'mobile') <> 2 THEN
    RAISE EXCEPTION 'authority_default_seed_applications_mismatch';
  END IF;

  IF (SELECT count(DISTINCT a."channelId")
      FROM "Application" a
      WHERE a."siteId" = default_site
        AND a."profile" IN ('storefront-web', 'admin-web')) <> 1 THEN
    RAISE EXCEPTION 'authority_default_seed_web_channel_split';
  END IF;

  IF (SELECT count(*) FROM "WebOrigin" WHERE "siteId" = default_site
      AND "verificationState" = 'VERIFIED'
      AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED'
      AND "isNonProductionSeed") <> 2
    OR (SELECT count(*) FROM "AndroidIdentity" WHERE "siteId" = default_site
        AND "verificationState" = 'VERIFIED'
        AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED'
        AND "isNonProductionSeed") <> 1
    OR (SELECT count(*) FROM "IosIdentity" WHERE "siteId" = default_site
        AND "verificationState" = 'VERIFIED'
        AND "evidenceType" = 'CONTROLLED_NON_PRODUCTION_SEED'
        AND "isNonProductionSeed") <> 1 THEN
    RAISE EXCEPTION 'authority_default_seed_identity_evidence_mismatch';
  END IF;

  IF (SELECT count(*) FROM "ApplicationClientHandle"
      WHERE "applicationId" IN (
        SELECT "id" FROM "Application" WHERE "siteId" = default_site
      ) AND "state" = 'ACTIVE') <> 8
    OR EXISTS (SELECT 1 FROM "ApplicationClientHandle" WHERE "handle" = 'mobile-local')
    OR NOT EXISTS (SELECT 1 FROM "ApplicationClientHandle" WHERE "handle" = 'storefront-web-local')
    OR NOT EXISTS (SELECT 1 FROM "ApplicationClientHandle" WHERE "handle" = 'admin-web-local')
    OR NOT EXISTS (SELECT 1 FROM "ApplicationClientHandle" WHERE "handle" = 'mobile-android-local')
    OR NOT EXISTS (SELECT 1 FROM "ApplicationClientHandle" WHERE "handle" = 'mobile-ios-local') THEN
    RAISE EXCEPTION 'authority_default_seed_handles_mismatch';
  END IF;

  IF (SELECT count(*) FROM "AuthorityInvalidationOutbox"
      WHERE "aggregateId" IN (
        default_tenant,
        default_site,
        'a3000000-0000-4000-8000-000000000001',
        'a3000000-0000-4000-8000-000000000002',
        'a3000000-0000-4000-8000-000000000003',
        'a4000000-0000-4000-8000-000000000001',
        'a4000000-0000-4000-8000-000000000002',
        'a4000000-0000-4000-8000-000000000003',
        'a4000000-0000-4000-8000-000000000004'
      ) AND "revision" = 1) <> 9 THEN
    RAISE EXCEPTION 'authority_default_seed_outbox_mismatch';
  END IF;

  IF (SELECT count(*) FROM "AuthorityAuditEvent"
      WHERE "operation" = 'DEFAULT_AUTHORITY.SEED'
        AND "targetResourceId" = default_tenant::text
        AND "result" = 'SUCCEEDED' AND "reasonCode" = 'CREATED') <> 1 THEN
    RAISE EXCEPTION 'authority_default_seed_rerun_not_idempotent';
  END IF;

  IF (SELECT count(*) FROM "IdentityRealm") <> 2
    OR (SELECT count(*) FROM "IdentityRealm"
        WHERE "id" = default_realm
          AND "kind" = 'LICENSED_ROOT_CONSUMER'
          AND "owningCustomerTenantId" = default_tenant
          AND "licensedRootTenantId" = default_tenant
          AND "isRootDefault"
          AND "lifecycle" = 'PROVISIONING'
          AND "revision" = 1) <> 1
    OR (SELECT count(*) FROM "IdentityRealm"
        WHERE "id" = operator_realm
          AND "kind" = 'PLATFORM_OPERATOR'
          AND "owningCustomerTenantId" IS NULL
          AND "licensedRootTenantId" IS NULL
          AND NOT "isRootDefault"
          AND "lifecycle" = 'PROVISIONING'
          AND "revision" = 1) <> 1 THEN
    RAISE EXCEPTION 'authority_identity_control_plane_realm_mismatch';
  END IF;

  IF (SELECT count(*) FROM "IdentityProviderRegistration") <> 2
    OR (SELECT count(*) FROM "IdentityProviderRegistration"
        WHERE "identityRealmId" IN (default_realm, operator_realm)
          AND "kind" = 'NEBULA_LOCAL'
          AND "lifecycle" = 'PENDING_VERIFICATION'
          AND "issuerReference" =
            'urn:nebula:local:' || "identityRealmId"::text) <> 2
    OR EXISTS (
      SELECT 1 FROM "IdentityProviderRegistration"
      WHERE "issuerReference" LIKE '%://%'
    ) THEN
    RAISE EXCEPTION 'authority_identity_control_plane_provider_mismatch';
  END IF;

  IF (SELECT count(*) FROM "ApplicationIdentityPolicy") <> 4
    OR (SELECT count(*) FROM "ApplicationIdentityPolicy"
        WHERE "applicationId" IN (
          'a4000000-0000-4000-8000-000000000001',
          'a4000000-0000-4000-8000-000000000002',
          'a4000000-0000-4000-8000-000000000003',
          'a4000000-0000-4000-8000-000000000004'
        )
          AND "policyVersion" = 1
          AND "isCurrent"
          AND "lifecycle" = 'DRAFT'
          AND "legacyDefaultUpgradeEligible"
          AND 'LOCAL_LOGIN' = ANY("loginModes")
          AND 'LEGACY_DEFAULT_UPGRADE' = ANY("loginModes")
          AND "audience" = 'urn:nebula:application:' || "applicationId"::text
        ) <> 4
    OR (SELECT count(*) FROM "ApplicationIdentityPolicy"
        WHERE 'PLATFORM_OPERATOR' = ANY("acceptedPrincipalClasses")) <> 1 THEN
    RAISE EXCEPTION 'authority_identity_control_plane_policy_mismatch';
  END IF;

  IF (SELECT count(*) FROM "FederationTrust") <> 5
    OR (SELECT count(*) FROM "FederationTrust"
        WHERE "identityRealmId" = default_realm
          AND "providerRegistrationId" = default_provider
          AND "principalClass" = 'CONSUMER'
          AND "mode" = 'LOCAL_LOGIN'
          AND "lifecycle" = 'PENDING_VERIFICATION') <> 4
    OR (SELECT count(*) FROM "FederationTrust"
        WHERE "identityRealmId" = operator_realm
          AND "providerRegistrationId" = operator_provider
          AND "applicationId" = 'a4000000-0000-4000-8000-000000000002'
          AND "principalClass" = 'PLATFORM_OPERATOR'
          AND "mode" = 'LOCAL_LOGIN'
          AND "lifecycle" = 'PENDING_VERIFICATION') <> 1 THEN
    RAISE EXCEPTION 'authority_identity_control_plane_trust_mismatch';
  END IF;

  IF EXISTS (SELECT 1 FROM "IdentityRealm" WHERE "lifecycle" = 'ACTIVE')
    OR EXISTS (SELECT 1 FROM "IdentityProviderRegistration"
               WHERE "lifecycle" = 'ACTIVE')
    OR EXISTS (SELECT 1 FROM "ApplicationIdentityPolicy"
               WHERE "lifecycle" = 'ACTIVE')
    OR EXISTS (SELECT 1 FROM "FederationTrust" WHERE "lifecycle" = 'ACTIVE')
  THEN
    RAISE EXCEPTION 'authority_identity_control_plane_admitting_record_present';
  END IF;

  IF (SELECT count(*) FROM "AuthorityInvalidationOutbox"
      WHERE "aggregateId" IN (
        SELECT "id" FROM "IdentityRealm"
        UNION ALL SELECT "id" FROM "IdentityProviderRegistration"
        UNION ALL SELECT "id" FROM "ApplicationIdentityPolicy"
        UNION ALL SELECT "id" FROM "FederationTrust"
      ) AND "revision" = 1 AND "state" = 'PENDING') <> 13 THEN
    RAISE EXCEPTION 'authority_identity_control_plane_outbox_mismatch';
  END IF;

  IF (SELECT count(*) FROM "AuthorityAuditEvent"
      WHERE "operation" = 'IDENTITY_CONTROL_PLANE.SEED'
        AND "targetResourceId" = default_realm::text
        AND "result" = 'SUCCEEDED'
        AND "reasonCode" = 'CREATED_INACTIVE') <> 1 THEN
    RAISE EXCEPTION 'authority_identity_control_plane_seed_not_idempotent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'IdentityRealm', 'IdentityProviderRegistration',
        'ApplicationIdentityPolicy', 'FederationTrust'
      )
      AND column_name ~* '(password|credential|session|endpoint|secret|private|token|email|phone|key)'
  ) THEN
    RAISE EXCEPTION 'authority_identity_control_plane_forbidden_column';
  END IF;
END
$block$;
