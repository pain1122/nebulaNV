-- Disposable evidence for F4 Batch 2 records and the additive Batch 3
-- membership foundation. The caller runs this only after
-- applying tenant-authority-service migrations to an empty verification DB.
BEGIN;

DO $evidence$
DECLARE
  tenant_a uuid := '00000000-0000-4000-8000-000000000001';
  tenant_b uuid := '00000000-0000-4000-8000-000000000002';
  tenant_c uuid := '00000000-0000-4000-8000-000000000003';
  site_a uuid := '00000000-0000-4000-8000-000000000011';
  site_b uuid := '00000000-0000-4000-8000-000000000012';
  site_c uuid := '00000000-0000-4000-8000-000000000013';
  site_cross_scope_fixture uuid := '00000000-0000-4000-8000-000000000014';
  web_channel uuid := '00000000-0000-4000-8000-000000000021';
  android_channel uuid := '00000000-0000-4000-8000-000000000022';
  ios_channel uuid := '00000000-0000-4000-8000-000000000023';
  web_app uuid := '00000000-0000-4000-8000-000000000031';
  android_app uuid := '00000000-0000-4000-8000-000000000032';
  second_android_app uuid := '00000000-0000-4000-8000-000000000033';
  ios_app uuid := '00000000-0000-4000-8000-000000000034';
  user_a uuid := '00000000-0000-4000-8000-000000000101';
  membership_a uuid := '00000000-0000-4000-8000-000000000111';
  membership_epoch_a uuid := '00000000-0000-4000-8000-000000000121';
BEGIN
  IF EXISTS (SELECT 1 FROM "Tenant") THEN
    RAISE EXCEPTION 'authority_registration_evidence_requires_empty_database';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('Tenant'), ('Site'), ('Channel'), ('Application'),
      ('WebOrigin'), ('AndroidIdentity'), ('IosIdentity'),
      ('ParentRelationship'), ('EntitlementScopeRef'), ('Membership'),
      ('MembershipEpoch'), ('TenantRoleGrant'), ('SiteRoleGrant'),
      ('PlatformGrant'), ('IdentityRealm'),
      ('IdentityProviderRegistration'), ('ApplicationIdentityPolicy'),
      ('FederationTrust')
    ) AS expected(table_name)
    WHERE to_regclass(format('public.%I', expected.table_name)) IS NULL
  ) THEN
    RAISE EXCEPTION 'authority_registration_table_missing';
  END IF;

  INSERT INTO "Tenant" ("id", "displayName", "updatedAt") VALUES
    (tenant_a, 'Tenant A', now()),
    (tenant_b, 'Tenant B', now()),
    (tenant_c, 'Tenant C', now());

  -- R2 compatibility writers deterministically attach the default realm to
  -- legacy userId writes. This rollback-only fixture establishes that local
  -- FK prerequisite without invoking or mutating the real development seed.
  INSERT INTO "IdentityRealm" (
    "id", "kind", "owningCustomerTenantId", "licensedRootTenantId",
    "isRootDefault", "authRouteRef", "updatedAt"
  ) VALUES (
    'b1000000-0000-4000-8000-000000000001',
    'LICENSED_ROOT_CONSUMER', tenant_a, tenant_a, true,
    '00000000-0000-4000-8000-000000000230', now()
  );

  INSERT INTO "Site" (
    "id", "tenantId", "displayName", "isPrimary", "updatedAt"
  ) VALUES
    (site_a, tenant_a, 'Site A', true, now()),
    (site_b, tenant_b, 'Site B', true, now()),
    (site_c, tenant_c, 'Site C', true, now()),
    (site_cross_scope_fixture, tenant_a, 'Cross-scope Fixture', false, now());

  INSERT INTO "Membership" (
    "id", "tenantId", "userId", "updatedAt"
  ) VALUES (
    membership_a, tenant_a, user_a, now()
  );

  INSERT INTO "MembershipEpoch" (
    "id", "membershipId", "generation", "membershipEpochRef",
    "integrityKeyId"
  ) VALUES (
    membership_epoch_a, membership_a, 1,
    'meg1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'membership-epoch-evidence-v1'
  );

  UPDATE "Membership"
  SET "currentEpochId" = membership_epoch_a, "revision" = 2,
      "updatedAt" = now()
  WHERE "id" = membership_a;
  UPDATE "Membership"
  SET "state" = 'ACTIVE', "revision" = 3, "updatedAt" = now()
  WHERE "id" = membership_a;

  INSERT INTO "SiteRoleGrant" (
    "id", "membershipEpochId", "tenantId", "siteId", "role"
  ) VALUES (
    '00000000-0000-4000-8000-000000000131', membership_epoch_a,
    tenant_a, site_a, 'USER'
  );

  INSERT INTO "PlatformGrant" (
    "id", "userId", "role", "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000132', user_a,
    'PLATFORM_ADMIN', now()
  );

  BEGIN
    INSERT INTO "SiteRoleGrant" (
      "id", "membershipEpochId", "tenantId", "siteId", "role"
    ) VALUES (
      '00000000-0000-4000-8000-000000000133', membership_epoch_a,
      tenant_b, site_b, 'EDITOR'
    );
    RAISE EXCEPTION 'authority_cross_tenant_site_grant_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_site_role_grant_membership_scope_mismatch' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO "SiteRoleGrant" (
      "id", "membershipEpochId", "tenantId", "siteId", "role"
    ) VALUES (
      '00000000-0000-4000-8000-000000000134', membership_epoch_a,
      tenant_a, site_a, 'EDITOR'
    );
    RAISE EXCEPTION 'authority_duplicate_active_site_grant_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "MembershipEpoch" (
      "id", "membershipId", "generation", "membershipEpochRef",
      "integrityKeyId"
    ) VALUES (
      '00000000-0000-4000-8000-000000000122', membership_a, 2,
      'generation-2', 'membership-epoch-evidence-v1'
    );
    RAISE EXCEPTION 'authority_plain_membership_generation_was_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE "MembershipEpoch"
    SET "membershipEpochRef" =
      'meg1_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
    WHERE "id" = membership_epoch_a;
    RAISE EXCEPTION 'authority_membership_epoch_ref_was_mutated';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_membership_epoch_immutable' THEN RAISE; END IF;
  END;

  INSERT INTO "Channel" (
    "id", "tenantId", "siteId", "kind", "updatedAt"
  ) VALUES
    (web_channel, tenant_a, site_a, 'WEB', now()),
    (android_channel, tenant_a, site_a, 'ANDROID', now()),
    (ios_channel, tenant_a, site_a, 'IOS', now());

  INSERT INTO "EntitlementScopeRef" (
    "id", "scopeKind", "tenantId", "siteId", "updatedAt"
  ) VALUES
    ('00000000-0000-4000-8000-000000000091', 'TENANT', tenant_a, NULL, now()),
    ('00000000-0000-4000-8000-000000000092', 'SITE', tenant_a, site_a, now());

  BEGIN
    INSERT INTO "EntitlementScopeRef" (
      "id", "scopeKind", "tenantId", "siteId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000093', 'TENANT', tenant_b,
      site_b, now()
    );
    RAISE EXCEPTION 'authority_tenant_entitlement_site_was_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "EntitlementScopeRef" (
      "id", "scopeKind", "tenantId", "siteId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000094', 'SITE', tenant_b,
      site_a, now()
    );
    RAISE EXCEPTION 'authority_cross_scope_entitlement_was_not_rejected';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "EntitlementScopeRef" (
      "id", "scopeKind", "tenantId", "siteId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000095', 'TENANT', tenant_a,
      NULL, now()
    );
    RAISE EXCEPTION 'authority_duplicate_tenant_entitlement_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE "EntitlementScopeRef"
    SET "tenantId" = tenant_b, "updatedAt" = now()
    WHERE "id" = '00000000-0000-4000-8000-000000000091';
    RAISE EXCEPTION 'authority_entitlement_rebinding_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_entitlement_scope_binding_immutable' THEN RAISE; END IF;
  END;

  INSERT INTO "Application" (
    "id", "clientId", "tenantId", "siteId", "channelId",
    "displayName", "profile", "updatedAt"
  ) VALUES
    (web_app, '00000000-0000-4000-8000-000000000041', tenant_a,
      site_a, web_channel, 'Web App', 'storefront-web', now()),
    (android_app, '00000000-0000-4000-8000-000000000042', tenant_a,
      site_a, android_channel, 'Android App', 'mobile', now()),
    (second_android_app, '00000000-0000-4000-8000-000000000043',
      tenant_a, site_a, android_channel, 'Second Android App', 'mobile', now()),
    (ios_app, '00000000-0000-4000-8000-000000000044', tenant_a,
      site_a, ios_channel, 'iOS App', 'mobile', now());

  INSERT INTO "WebOrigin" (
    "id", "applicationId", "tenantId", "siteId", "scheme", "hostname",
    "port", "canonicalOrigin", "evidenceType", "isNonProductionSeed",
    "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000051', web_app, tenant_a, site_a,
    'HTTP', 'localhost', 3000, 'http://localhost:3000',
    'CONTROLLED_NON_PRODUCTION_SEED', true, now()
  );

  INSERT INTO "AndroidIdentity" (
    "id", "applicationId", "tenantId", "siteId", "packageId",
    "signingCertificateSha256", "evidenceType", "isNonProductionSeed",
    "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000061', android_app, tenant_a, site_a,
    'com.nebula.app', repeat('a', 64),
    'CONTROLLED_NON_PRODUCTION_SEED', true, now()
  );

  INSERT INTO "IosIdentity" (
    "id", "applicationId", "tenantId", "siteId", "teamId", "bundleId",
    "evidenceType", "isNonProductionSeed", "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000071', ios_app, tenant_a, site_a,
    'NEBULA1', 'com.nebula.ios', 'CONTROLLED_NON_PRODUCTION_SEED', true, now()
  );

  BEGIN
    INSERT INTO "Tenant" ("id", "displayName", "updatedAt")
    VALUES ('00000000-0000-7000-8000-000000000099', 'Wrong UUID', now());
    RAISE EXCEPTION 'authority_uuid_v4_was_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "Site" (
      "id", "tenantId", "displayName", "isPrimary", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000015', tenant_a,
      'Duplicate Primary', true, now()
    );
    RAISE EXCEPTION 'authority_duplicate_primary_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "Channel" (
      "id", "tenantId", "siteId", "kind", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000024', tenant_b,
      site_cross_scope_fixture, 'IOS', now()
    );
    RAISE EXCEPTION 'authority_cross_scope_channel_was_not_rejected';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "Application" (
      "id", "clientId", "tenantId", "siteId", "channelId",
      "displayName", "profile", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000035',
      '00000000-0000-4000-8000-000000000045', tenant_a, site_a,
      web_channel, 'Wrong Profile', 'mobile', now()
    );
    RAISE EXCEPTION 'authority_profile_channel_mismatch_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_application_profile_channel_mismatch' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO "WebOrigin" (
      "id", "applicationId", "tenantId", "siteId", "scheme", "hostname",
      "port", "canonicalOrigin", "evidenceType", "isNonProductionSeed",
      "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000052', web_app, tenant_a, site_a,
      'HTTP', '*.example.com', 80, 'http://*.example.com:80',
      'CONTROLLED_NON_PRODUCTION_SEED', true, now()
    );
    RAISE EXCEPTION 'authority_wildcard_origin_was_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "WebOrigin" (
      "id", "applicationId", "tenantId", "siteId", "scheme", "hostname",
      "port", "canonicalOrigin", "evidenceType", "isNonProductionSeed",
      "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000053', web_app, tenant_a, site_a,
      'HTTP', 'localhost', 3000, 'http://localhost:3000',
      'CONTROLLED_NON_PRODUCTION_SEED', true, now()
    );
    RAISE EXCEPTION 'authority_duplicate_origin_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "AndroidIdentity" (
      "id", "applicationId", "tenantId", "siteId", "packageId",
      "signingCertificateSha256", "evidenceType", "isNonProductionSeed",
      "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000062', second_android_app,
      tenant_a, site_a, 'com.nebula.app', repeat('b', 64),
      'CONTROLLED_NON_PRODUCTION_SEED', true, now()
    );
    RAISE EXCEPTION 'authority_android_package_reassignment_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_android_package_claimed_by_other_application' THEN RAISE; END IF;
  WHEN exclusion_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "IosIdentity" (
      "id", "applicationId", "tenantId", "siteId", "teamId", "bundleId",
      "evidenceType", "isNonProductionSeed", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000072', ios_app, tenant_a, site_a,
      'NEBULA1', 'com.nebula.ios', 'CONTROLLED_NON_PRODUCTION_SEED', true, now()
    );
    RAISE EXCEPTION 'authority_duplicate_ios_identity_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  INSERT INTO "ApplicationClientHandle" (
    "id", "applicationId", "handle", "kind", "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000091', web_app,
    'storefront-web-evidence', 'LEGACY_ALIAS', now()
  );

  BEGIN
    INSERT INTO "ApplicationClientHandle" (
      "id", "applicationId", "handle", "kind", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000092', second_android_app,
      'storefront-web-evidence', 'LEGACY_ALIAS', now()
    );
    RAISE EXCEPTION 'authority_client_handle_reassignment_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  UPDATE "ApplicationClientHandle"
  SET "state" = 'TOMBSTONED', "tombstonedAt" = now(), "updatedAt" = now()
  WHERE "id" = '00000000-0000-4000-8000-000000000091';

  BEGIN
    UPDATE "ApplicationClientHandle"
    SET "state" = 'ACTIVE', "tombstonedAt" = NULL, "updatedAt" = now()
    WHERE "id" = '00000000-0000-4000-8000-000000000091';
    RAISE EXCEPTION 'authority_client_handle_tombstone_was_reactivated';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_client_handle_tombstone_terminal' THEN RAISE; END IF;
  END;

  INSERT INTO "AuthorityInvalidationOutbox" (
    "id", "aggregateKind", "aggregateId", "tenantId", "siteId",
    "referenceId", "revision", "payload"
  ) VALUES (
    '00000000-0000-4000-8000-000000000093', 'APPLICATION', web_app,
    tenant_a, site_a, web_app, 1, '{"version":1}'
  );

  INSERT INTO "AuthorityAuditEvent" (
    "id", "partitionKey", "partitionSequence", "occurredAt",
    "authorizationPath", "operation", "applicationId", "channelId",
    "callerService", "targetService", "targetTenantId", "targetSiteId",
    "targetResourceType", "targetResourceId", "requestId", "result",
    "reasonCode", "authorityRevision", "change", "eventHash",
    "integrityKeyId"
  ) VALUES (
    '00000000-0000-4000-8000-000000000094',
    to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM'), 1, now(),
    'SERVICE_OPERATION', 'APPLICATION.CREATE_PENDING', web_app, web_channel,
    'tenant-authority-service', 'tenant-authority-service', tenant_a, site_a,
    'APPLICATION', web_app::text, 'authority-evidence-request', 'SUCCEEDED',
    'CREATED', '1', '{}', repeat('a', 64), 'authority-audit-evidence-v1'
  );

  BEGIN
    UPDATE "AuthorityAuditEvent"
    SET "reasonCode" = 'ALTERED'
    WHERE "id" = '00000000-0000-4000-8000-000000000094';
    RAISE EXCEPTION 'authority_audit_update_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_audit_event_append_only' THEN RAISE; END IF;
  END;

  INSERT INTO "ParentRelationship" (
    "id", "parentTenantId", "subordinateTenantId", "updatedAt"
  ) VALUES (
    '00000000-0000-4000-8000-000000000081', tenant_a, tenant_b, now()
  );

  BEGIN
    INSERT INTO "ParentRelationship" (
      "id", "parentTenantId", "subordinateTenantId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000082', tenant_c, tenant_b, now()
    );
    RAISE EXCEPTION 'authority_second_parent_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "ParentRelationship" (
      "id", "parentTenantId", "subordinateTenantId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000083', tenant_b, tenant_a, now()
    );
    RAISE EXCEPTION 'authority_parent_cycle_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_parent_relationship_cycle' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE "Application"
    SET "lifecycle" = 'REVOKED', "updatedAt" = now()
    WHERE "id" = web_app;
    UPDATE "Application"
    SET "lifecycle" = 'ACTIVE', "updatedAt" = now()
    WHERE "id" = web_app;
    RAISE EXCEPTION 'authority_terminal_application_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_application_lifecycle_transition_invalid' THEN RAISE; END IF;
  END;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('Tenant'), ('Site'), ('Channel'), ('Application'),
      ('WebOrigin'), ('AndroidIdentity'), ('IosIdentity'),
      ('ParentRelationship'), ('EntitlementScopeRef'),
      ('ApplicationClientHandle'), ('AuthorityInvalidationOutbox'),
      ('AuthorityAuditEvent'), ('Membership'), ('MembershipEpoch'),
      ('TenantRoleGrant'), ('SiteRoleGrant'), ('PlatformGrant'),
      ('IdentityRealm'), ('IdentityProviderRegistration'),
      ('ApplicationIdentityPolicy'), ('FederationTrust')
    ) AS protected(table_name)
    WHERE has_table_privilege(
      'nebula_authority_runtime',
      format('public.%I', protected.table_name),
      'DELETE'
    )
  ) THEN
    RAISE EXCEPTION 'authority_runtime_delete_privilege_present';
  END IF;

  IF has_table_privilege(
    'nebula_authority_runtime',
    'public."AuthorityAuditEvent"',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION 'authority_runtime_audit_update_privilege_present';
  END IF;
END
$evidence$;

DO $identity_control_plane$
DECLARE
  tenant_a uuid := '00000000-0000-4000-8000-000000000001';
  web_app uuid := '00000000-0000-4000-8000-000000000031';
  default_realm uuid := 'b1000000-0000-4000-8000-000000000001';
  operator_realm uuid := '00000000-0000-4000-8000-000000000202';
  default_provider uuid := '00000000-0000-4000-8000-000000000211';
  operator_provider uuid := '00000000-0000-4000-8000-000000000212';
  policy_id uuid := '00000000-0000-4000-8000-000000000221';
  audience text := 'urn:nebula:application:00000000-0000-4000-8000-000000000031';
BEGIN
  INSERT INTO "IdentityRealm" (
    "id", "kind", "owningCustomerTenantId", "licensedRootTenantId",
    "isRootDefault", "authRouteRef", "updatedAt"
  ) VALUES (
    operator_realm, 'PLATFORM_OPERATOR', NULL, NULL, false,
    '00000000-0000-4000-8000-000000000232', now()
  );

  INSERT INTO "IdentityProviderRegistration" (
    "id", "identityRealmId", "kind", "issuerReference", "updatedAt"
  ) VALUES
    (
      default_provider, default_realm, 'NEBULA_LOCAL',
      'urn:nebula:local:' || default_realm::text, now()
    ),
    (
      operator_provider, operator_realm, 'NEBULA_LOCAL',
      'urn:nebula:local:' || operator_realm::text, now()
    );

  INSERT INTO "ApplicationIdentityPolicy" (
    "id", "applicationId", "policyVersion", "audience",
    "acceptedPrincipalClasses", "loginModes",
    "legacyDefaultUpgradeEligible", "updatedAt"
  ) VALUES (
    policy_id, web_app, 1, audience,
    ARRAY['CONSUMER', 'PLATFORM_OPERATOR']::"PrincipalClass"[],
    ARRAY['LOCAL_LOGIN', 'LEGACY_DEFAULT_UPGRADE']::"ApplicationLoginMode"[],
    true, now()
  );

  INSERT INTO "FederationTrust" (
    "id", "applicationIdentityPolicyId", "applicationId",
    "identityRealmId", "providerRegistrationId", "principalClass",
    "audience", "mode", "updatedAt"
  ) VALUES
    (
      '00000000-0000-4000-8000-000000000241', policy_id, web_app,
      default_realm, default_provider, 'CONSUMER', audience,
      'LOCAL_LOGIN', now()
    ),
    (
      '00000000-0000-4000-8000-000000000242', policy_id, web_app,
      operator_realm, operator_provider, 'PLATFORM_OPERATOR', audience,
      'LOCAL_LOGIN', now()
    );

  BEGIN
    INSERT INTO "IdentityRealm" (
      "id", "kind", "owningCustomerTenantId", "licensedRootTenantId",
      "authRouteRef", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000203',
      'LICENSED_ROOT_WORKFORCE', tenant_a,
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000233', now()
    );
    RAISE EXCEPTION 'authority_identity_realm_wrong_owner_was_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "IdentityRealm" (
      "id", "kind", "authRouteRef", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000204', 'PLATFORM_OPERATOR',
      '00000000-0000-4000-8000-000000000234', now()
    );
    RAISE EXCEPTION 'authority_second_operator_realm_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "IdentityRealm" (
      "id", "kind", "owningCustomerTenantId", "licensedRootTenantId",
      "isRootDefault", "authRouteRef", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000205',
      'LICENSED_ROOT_CONSUMER', tenant_a, tenant_a, true,
      '00000000-0000-4000-8000-000000000235', now()
    );
    RAISE EXCEPTION 'authority_second_root_default_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE "IdentityRealm"
    SET "authRouteRef" = '00000000-0000-4000-8000-000000000236',
        "updatedAt" = now()
    WHERE "id" = default_realm;
    RAISE EXCEPTION 'authority_identity_realm_route_was_rebound';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_identity_realm_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO "ApplicationIdentityPolicy" (
      "id", "applicationId", "policyVersion", "audience",
      "acceptedPrincipalClasses", "loginModes", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000222', web_app, 2,
      'urn:nebula:application:empty', ARRAY[]::"PrincipalClass"[],
      ARRAY['LOCAL_LOGIN']::"ApplicationLoginMode"[], now()
    );
    RAISE EXCEPTION 'authority_empty_policy_principals_were_not_rejected';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "ApplicationIdentityPolicy" (
      "id", "applicationId", "policyVersion", "audience",
      "acceptedPrincipalClasses", "loginModes", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000223', web_app, 2,
      'urn:nebula:application:second', ARRAY['CONSUMER']::"PrincipalClass"[],
      ARRAY['LOCAL_LOGIN']::"ApplicationLoginMode"[], now()
    );
    RAISE EXCEPTION 'authority_second_current_policy_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO "FederationTrust" (
      "id", "applicationIdentityPolicyId", "applicationId",
      "identityRealmId", "providerRegistrationId", "principalClass",
      "audience", "mode", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000243', policy_id, web_app,
      default_realm, operator_provider, 'CONSUMER', audience,
      'LOCAL_LOGIN', now()
    );
    RAISE EXCEPTION 'authority_cross_realm_provider_was_not_rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_federation_trust_provider_realm_mismatch' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO "FederationTrust" (
      "id", "applicationIdentityPolicyId", "applicationId",
      "identityRealmId", "providerRegistrationId", "principalClass",
      "audience", "mode", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000000244', policy_id, web_app,
      default_realm, default_provider, 'CONSUMER', audience,
      'LOCAL_LOGIN', now()
    );
    RAISE EXCEPTION 'authority_duplicate_exact_trust_was_not_rejected';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    UPDATE "FederationTrust"
    SET "lifecycle" = 'ACTIVE', "revision" = 2, "updatedAt" = now()
    WHERE "id" = '00000000-0000-4000-8000-000000000241';
    RAISE EXCEPTION 'authority_trust_activated_with_inactive_dependencies';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_federation_trust_activation_prerequisite' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE "ApplicationIdentityPolicy"
    SET "lifecycle" = 'RETIRED', "revision" = 2, "updatedAt" = now()
    WHERE "id" = policy_id;
    UPDATE "ApplicationIdentityPolicy"
    SET "lifecycle" = 'DRAFT', "revision" = 3, "updatedAt" = now()
    WHERE "id" = policy_id;
    RAISE EXCEPTION 'authority_retired_policy_was_reactivated';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_application_identity_policy_lifecycle_transition_invalid' THEN RAISE; END IF;
  END;

  BEGIN
    DELETE FROM "FederationTrust"
    WHERE "id" = '00000000-0000-4000-8000-000000000241';
    RAISE EXCEPTION 'authority_federation_trust_was_deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'authority_federation_trust_retained' THEN RAISE; END IF;
  END;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('IdentityRealm'), ('IdentityProviderRegistration'),
      ('ApplicationIdentityPolicy'), ('FederationTrust')
    ) AS protected(table_name)
    WHERE has_table_privilege(
      'nebula_authority_runtime',
      format('public.%I', protected.table_name),
      'DELETE'
    )
  ) THEN
    RAISE EXCEPTION 'authority_identity_control_runtime_delete_privilege_present';
  END IF;
END
$identity_control_plane$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
