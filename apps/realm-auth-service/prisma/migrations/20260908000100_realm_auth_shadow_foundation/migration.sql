-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."RealmKind" AS ENUM ('PLATFORM_OPERATOR', 'LICENSED_ROOT_CONSUMER', 'LICENSED_ROOT_WORKFORCE', 'SUBORDINATE_CONSUMER', 'SUBORDINATE_WORKFORCE');

-- CreateEnum
CREATE TYPE "public"."PrincipalClass" AS ENUM ('PLATFORM_OPERATOR', 'CONSUMER', 'WORKFORCE');

-- CreateEnum
CREATE TYPE "public"."RealmLifecycle" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."RealmAdmissionMode" AS ENUM ('SHADOW', 'ACTIVE');

-- CreateEnum
CREATE TYPE "public"."LoginIdentifierKind" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "public"."LoginNormalizationVersion" AS ENUM ('EMAIL_LOWER_TRIM_V1', 'PHONE_PLUS_DIGITS_V1');

-- CreateEnum
CREATE TYPE "public"."LoginIdentifierState" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."CredentialAlgorithm" AS ENUM ('BCRYPT');

-- CreateEnum
CREATE TYPE "public"."IdentityProviderKind" AS ENUM ('NEBULA_LOCAL', 'OIDC', 'SAML');

-- CreateEnum
CREATE TYPE "public"."ExternalIdentityState" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."SessionLifecycle" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."LegacySessionBridgeState" AS ENUM ('PENDING', 'CONSUMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."RootSsoExchangeGrantState" AS ENUM ('PENDING', 'CONSUMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "public"."RealmKeyPurpose" AS ENUM ('JWT_SIGNING', 'SESSION_REFERENCE', 'LEGACY_SESSION_BRIDGE', 'ARTIFACT_DECRYPTION', 'MIGRATION_INTEGRITY', 'AUDIT_INTEGRITY');

-- CreateEnum
CREATE TYPE "public"."AuthAuditResult" AS ENUM ('SUCCEEDED', 'DENIED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AuthOutboxState" AS ENUM ('PENDING', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "public"."MigrationSourceOwner" AS ENUM ('USER_SERVICE', 'AUTH_SERVICE');

-- CreateEnum
CREATE TYPE "public"."MigrationImportState" AS ENUM ('IMPORTING', 'COMPLETE', 'REJECTED', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "public"."RealmBoundary" (
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "identityRealmId" UUID NOT NULL,
    "authRouteRef" UUID NOT NULL,
    "kind" "public"."RealmKind" NOT NULL,
    "principalClass" "public"."PrincipalClass" NOT NULL,
    "issuer" VARCHAR(512) NOT NULL,
    "lifecycle" "public"."RealmLifecycle" NOT NULL DEFAULT 'PROVISIONING',
    "admissionMode" "public"."RealmAdmissionMode" NOT NULL DEFAULT 'SHADOW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RealmBoundary_pkey" PRIMARY KEY ("singleton")
);

-- CreateTable
CREATE TABLE "public"."RealmKeyRegistration" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "purpose" "public"."RealmKeyPurpose" NOT NULL,
    "keyReference" VARCHAR(512) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMPTZ(3),

    CONSTRAINT "RealmKeyRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RealmSubject" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "principalClass" "public"."PrincipalClass" NOT NULL,
    "lifecycle" "public"."RealmLifecycle" NOT NULL DEFAULT 'PROVISIONING',
    "credentialGeneration" BIGINT NOT NULL DEFAULT 1,
    "sessionGeneration" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RealmSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoginIdentifier" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "kind" "public"."LoginIdentifierKind" NOT NULL,
    "normalizationVersion" "public"."LoginNormalizationVersion" NOT NULL,
    "normalizedValue" VARCHAR(512) NOT NULL,
    "state" "public"."LoginIdentifierState" NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LoginIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocalCredential" (
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "algorithm" "public"."CredentialAlgorithm" NOT NULL,
    "parameters" JSONB NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LocalCredential_pkey" PRIMARY KEY ("identityRealmId","subjectId")
);

-- CreateTable
CREATE TABLE "public"."ExternalIdentityLink" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "providerRegistrationId" UUID NOT NULL,
    "providerKind" "public"."IdentityProviderKind" NOT NULL,
    "exactIssuer" VARCHAR(2048) NOT NULL,
    "providerSubject" VARCHAR(1024) NOT NULL,
    "state" "public"."ExternalIdentityState" NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ExternalIdentityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthSession" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "sessionRef" VARCHAR(47) NOT NULL,
    "sessionRefKeyId" UUID NOT NULL,
    "observedCredentialGeneration" BIGINT NOT NULL,
    "observedSessionGeneration" BIGINT NOT NULL,
    "providerRegistrationId" UUID NOT NULL,
    "providerKind" "public"."IdentityProviderKind" NOT NULL,
    "applicationId" UUID NOT NULL,
    "audience" VARCHAR(512) NOT NULL,
    "familyId" UUID NOT NULL,
    "rotationSequence" BIGINT NOT NULL DEFAULT 0,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "refreshTokenId" UUID NOT NULL,
    "lifecycle" "public"."SessionLifecycle" NOT NULL,
    "deviceLabel" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacySessionBridge" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "legacySessionFingerprint" VARCHAR(48) NOT NULL,
    "legacySessionFingerprintKeyId" UUID NOT NULL,
    "observedCredentialGeneration" BIGINT NOT NULL,
    "observedSessionGeneration" BIGINT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "state" "public"."LegacySessionBridgeState" NOT NULL DEFAULT 'PENDING',
    "consumedAuthSessionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LegacySessionBridge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RootSsoExchangeGrant" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "sourceAuthSessionId" UUID NOT NULL,
    "codeDigest" CHAR(64) NOT NULL,
    "targetApplicationId" UUID NOT NULL,
    "targetAudience" VARCHAR(512) NOT NULL,
    "requestId" UUID NOT NULL,
    "registeredRedirect" VARCHAR(2048) NOT NULL,
    "pkceS256Challenge" VARCHAR(43) NOT NULL,
    "applicationPolicyRevision" BIGINT NOT NULL,
    "federationTrustId" UUID NOT NULL,
    "federationTrustRevision" BIGINT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "state" "public"."RootSsoExchangeGrantState" NOT NULL DEFAULT 'PENDING',
    "consumedAuthSessionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RootSsoExchangeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthAuditEvent" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "subjectId" UUID,
    "authSessionId" UUID,
    "applicationId" UUID,
    "purpose" VARCHAR(128) NOT NULL,
    "credentialGeneration" BIGINT,
    "sessionGeneration" BIGINT,
    "sequence" BIGINT,
    "eventVersion" INTEGER NOT NULL,
    "result" "public"."AuthAuditResult" NOT NULL,
    "reason" VARCHAR(256) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "previousHash" CHAR(64),
    "eventHash" CHAR(64) NOT NULL,
    "keyId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthOutboxEvent" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "aggregateKind" VARCHAR(64) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "subjectId" UUID,
    "authSessionId" UUID,
    "applicationId" UUID,
    "credentialGeneration" BIGINT,
    "sessionGeneration" BIGINT,
    "sequence" BIGINT,
    "eventVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "public"."AuthOutboxState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AuthOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MigrationManifest" (
    "id" UUID NOT NULL,
    "identityRealmId" UUID NOT NULL,
    "sourceOwner" "public"."MigrationSourceOwner" NOT NULL,
    "migrationId" UUID NOT NULL,
    "manifestVersion" INTEGER NOT NULL,
    "manifestDigest" CHAR(64) NOT NULL,
    "manifestHmacKeyId" UUID NOT NULL,
    "destinationKeyId" UUID NOT NULL,
    "sourceCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceRecordCount" INTEGER NOT NULL,
    "importedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateRecordCount" INTEGER NOT NULL DEFAULT 0,
    "orphanRecordCount" INTEGER NOT NULL DEFAULT 0,
    "state" "public"."MigrationImportState" NOT NULL DEFAULT 'IMPORTING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "rolledBackAt" TIMESTAMPTZ(3),

    CONSTRAINT "MigrationManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MigrationRecordReceipt" (
    "id" UUID NOT NULL,
    "manifestId" UUID NOT NULL,
    "sourceOwner" "public"."MigrationSourceOwner" NOT NULL,
    "migrationId" UUID NOT NULL,
    "recordHmac" CHAR(64) NOT NULL,
    "recordKind" VARCHAR(64) NOT NULL,
    "targetId" UUID,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationRecordReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RealmBoundary_identityRealmId_key" ON "public"."RealmBoundary"("identityRealmId");

-- CreateIndex
CREATE UNIQUE INDEX "RealmBoundary_authRouteRef_key" ON "public"."RealmBoundary"("authRouteRef");

-- CreateIndex
CREATE UNIQUE INDEX "RealmBoundary_issuer_key" ON "public"."RealmBoundary"("issuer");

-- CreateIndex
CREATE INDEX "RealmKeyRegistration_identityRealmId_purpose_retiredAt_idx" ON "public"."RealmKeyRegistration"("identityRealmId", "purpose", "retiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RealmKeyRegistration_identityRealmId_id_key" ON "public"."RealmKeyRegistration"("identityRealmId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RealmKeyRegistration_identityRealmId_purpose_keyReference_key" ON "public"."RealmKeyRegistration"("identityRealmId", "purpose", "keyReference");

-- CreateIndex
CREATE INDEX "RealmSubject_identityRealmId_lifecycle_idx" ON "public"."RealmSubject"("identityRealmId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "RealmSubject_identityRealmId_id_key" ON "public"."RealmSubject"("identityRealmId", "id");

-- CreateIndex
CREATE INDEX "LoginIdentifier_identityRealmId_subjectId_state_idx" ON "public"."LoginIdentifier"("identityRealmId", "subjectId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "LoginIdentifier_identityRealmId_kind_normalizedValue_key" ON "public"."LoginIdentifier"("identityRealmId", "kind", "normalizedValue");

-- CreateIndex
CREATE INDEX "ExternalIdentityLink_identityRealmId_subjectId_state_idx" ON "public"."ExternalIdentityLink"("identityRealmId", "subjectId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentityLink_identityRealmId_providerRegistrationId_key" ON "public"."ExternalIdentityLink"("identityRealmId", "providerRegistrationId", "exactIssuer", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionRef_key" ON "public"."AuthSession"("sessionRef");

-- CreateIndex
CREATE INDEX "AuthSession_identityRealmId_subjectId_lifecycle_expiresAt_idx" ON "public"."AuthSession"("identityRealmId", "subjectId", "lifecycle", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_identityRealmId_applicationId_audience_lifecycl_idx" ON "public"."AuthSession"("identityRealmId", "applicationId", "audience", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_identityRealmId_id_key" ON "public"."AuthSession"("identityRealmId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_identityRealmId_familyId_key" ON "public"."AuthSession"("identityRealmId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacySessionBridge_legacySessionFingerprint_key" ON "public"."LegacySessionBridge"("legacySessionFingerprint");

-- CreateIndex
CREATE INDEX "LegacySessionBridge_identityRealmId_subjectId_state_expires_idx" ON "public"."LegacySessionBridge"("identityRealmId", "subjectId", "state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RootSsoExchangeGrant_codeDigest_key" ON "public"."RootSsoExchangeGrant"("codeDigest");

-- CreateIndex
CREATE INDEX "RootSsoExchangeGrant_identityRealmId_sourceAuthSessionId_st_idx" ON "public"."RootSsoExchangeGrant"("identityRealmId", "sourceAuthSessionId", "state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RootSsoExchangeGrant_identityRealmId_requestId_key" ON "public"."RootSsoExchangeGrant"("identityRealmId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAuditEvent_eventHash_key" ON "public"."AuthAuditEvent"("eventHash");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_identityRealmId_subjectId_occurredAt_idx" ON "public"."AuthAuditEvent"("identityRealmId", "subjectId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_identityRealmId_authSessionId_occurredAt_idx" ON "public"."AuthAuditEvent"("identityRealmId", "authSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuthOutboxEvent_identityRealmId_state_availableAt_idx" ON "public"."AuthOutboxEvent"("identityRealmId", "state", "availableAt");

-- CreateIndex
CREATE INDEX "AuthOutboxEvent_identityRealmId_aggregateKind_aggregateId_idx" ON "public"."AuthOutboxEvent"("identityRealmId", "aggregateKind", "aggregateId");

-- CreateIndex
CREATE INDEX "MigrationManifest_identityRealmId_state_expiresAt_idx" ON "public"."MigrationManifest"("identityRealmId", "state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationManifest_sourceOwner_migrationId_key" ON "public"."MigrationManifest"("sourceOwner", "migrationId");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationManifest_identityRealmId_manifestDigest_key" ON "public"."MigrationManifest"("identityRealmId", "manifestDigest");

-- CreateIndex
CREATE INDEX "MigrationRecordReceipt_manifestId_recordKind_idx" ON "public"."MigrationRecordReceipt"("manifestId", "recordKind");

-- CreateIndex
CREATE UNIQUE INDEX "MigrationRecordReceipt_sourceOwner_migrationId_recordHmac_key" ON "public"."MigrationRecordReceipt"("sourceOwner", "migrationId", "recordHmac");

-- AddForeignKey
ALTER TABLE "public"."RealmKeyRegistration" ADD CONSTRAINT "RealmKeyRegistration_identityRealmId_fkey" FOREIGN KEY ("identityRealmId") REFERENCES "public"."RealmBoundary"("identityRealmId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."RealmSubject" ADD CONSTRAINT "RealmSubject_identityRealmId_fkey" FOREIGN KEY ("identityRealmId") REFERENCES "public"."RealmBoundary"("identityRealmId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."LoginIdentifier" ADD CONSTRAINT "LoginIdentifier_identityRealmId_subjectId_fkey" FOREIGN KEY ("identityRealmId", "subjectId") REFERENCES "public"."RealmSubject"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."LocalCredential" ADD CONSTRAINT "LocalCredential_identityRealmId_subjectId_fkey" FOREIGN KEY ("identityRealmId", "subjectId") REFERENCES "public"."RealmSubject"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentityLink" ADD CONSTRAINT "ExternalIdentityLink_identityRealmId_subjectId_fkey" FOREIGN KEY ("identityRealmId", "subjectId") REFERENCES "public"."RealmSubject"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_identityRealmId_subjectId_fkey" FOREIGN KEY ("identityRealmId", "subjectId") REFERENCES "public"."RealmSubject"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."AuthSession" ADD CONSTRAINT "AuthSession_identityRealmId_sessionRefKeyId_fkey" FOREIGN KEY ("identityRealmId", "sessionRefKeyId") REFERENCES "public"."RealmKeyRegistration"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."LegacySessionBridge" ADD CONSTRAINT "LegacySessionBridge_identityRealmId_subjectId_fkey" FOREIGN KEY ("identityRealmId", "subjectId") REFERENCES "public"."RealmSubject"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."LegacySessionBridge" ADD CONSTRAINT "LegacySessionBridge_identityRealmId_legacySessionFingerpri_fkey" FOREIGN KEY ("identityRealmId", "legacySessionFingerprintKeyId") REFERENCES "public"."RealmKeyRegistration"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."LegacySessionBridge" ADD CONSTRAINT "LegacySessionBridge_identityRealmId_consumedAuthSessionId_fkey" FOREIGN KEY ("identityRealmId", "consumedAuthSessionId") REFERENCES "public"."AuthSession"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."RootSsoExchangeGrant" ADD CONSTRAINT "RootSsoExchangeGrant_identityRealmId_sourceAuthSessionId_fkey" FOREIGN KEY ("identityRealmId", "sourceAuthSessionId") REFERENCES "public"."AuthSession"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."RootSsoExchangeGrant" ADD CONSTRAINT "RootSsoExchangeGrant_identityRealmId_consumedAuthSessionId_fkey" FOREIGN KEY ("identityRealmId", "consumedAuthSessionId") REFERENCES "public"."AuthSession"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."MigrationManifest" ADD CONSTRAINT "MigrationManifest_identityRealmId_fkey" FOREIGN KEY ("identityRealmId") REFERENCES "public"."RealmBoundary"("identityRealmId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."MigrationRecordReceipt" ADD CONSTRAINT "MigrationRecordReceipt_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "public"."MigrationManifest"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "public"."AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_identityRealmId_keyId_fkey" FOREIGN KEY ("identityRealmId", "keyId") REFERENCES "public"."RealmKeyRegistration"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "public"."MigrationManifest" ADD CONSTRAINT "MigrationManifest_identityRealmId_destinationKeyId_fkey" FOREIGN KEY ("identityRealmId", "destinationKeyId") REFERENCES "public"."RealmKeyRegistration"("identityRealmId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- R3 owns an isolated, non-authoritative shadow. Runtime grants are provisioned
-- outside migrations; PUBLIC cannot create objects in this owner schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
COMMENT ON SCHEMA public IS
  'Nebula realm-auth-service owned schema; one fixed identity realm per database';

ALTER TABLE "RealmBoundary"
  ADD CONSTRAINT "RealmBoundary_singleton_check" CHECK (singleton),
  ADD CONSTRAINT "RealmBoundary_kind_principal_check" CHECK (
    (kind = 'PLATFORM_OPERATOR' AND "principalClass" = 'PLATFORM_OPERATOR') OR
    (kind IN ('LICENSED_ROOT_CONSUMER', 'SUBORDINATE_CONSUMER') AND "principalClass" = 'CONSUMER') OR
    (kind IN ('LICENSED_ROOT_WORKFORCE', 'SUBORDINATE_WORKFORCE') AND "principalClass" = 'WORKFORCE')
  ),
  ADD CONSTRAINT "RealmBoundary_issuer_nonempty_check" CHECK (
    length(issuer) BETWEEN 1 AND 512 AND btrim(issuer) = issuer
  );

ALTER TABLE "RealmKeyRegistration"
  ADD CONSTRAINT "RealmKeyRegistration_reference_nonempty_check" CHECK (
    length("keyReference") BETWEEN 1 AND 512 AND btrim("keyReference") = "keyReference"
  ),
  ADD CONSTRAINT "RealmKeyRegistration_retired_after_created_check" CHECK (
    "retiredAt" IS NULL OR "retiredAt" >= "createdAt"
  );

ALTER TABLE "RealmSubject"
  ADD CONSTRAINT "RealmSubject_positive_generations_check" CHECK (
    "credentialGeneration" > 0 AND "sessionGeneration" > 0
  );

ALTER TABLE "LoginIdentifier"
  ADD CONSTRAINT "LoginIdentifier_kind_version_check" CHECK (
    (kind = 'EMAIL' AND "normalizationVersion" = 'EMAIL_LOWER_TRIM_V1') OR
    (kind = 'PHONE' AND "normalizationVersion" = 'PHONE_PLUS_DIGITS_V1')
  ),
  ADD CONSTRAINT "LoginIdentifier_value_check" CHECK (
    (kind = 'EMAIL' AND length("normalizedValue") BETWEEN 1 AND 512 AND
      "normalizedValue" = lower("normalizedValue") AND
      "normalizedValue" = btrim("normalizedValue")) OR
    (kind = 'PHONE' AND "normalizedValue" ~ '^\+[1-9][0-9]{1,14}$')
  ),
  ADD CONSTRAINT "LoginIdentifier_revision_check" CHECK (revision > 0),
  ADD CONSTRAINT "LoginIdentifier_state_time_check" CHECK (
    (state = 'REVOKED' AND "revokedAt" IS NOT NULL) OR
    (state <> 'REVOKED' AND "revokedAt" IS NULL)
  );

ALTER TABLE "LocalCredential"
  ADD CONSTRAINT "LocalCredential_bcrypt_check" CHECK (
    algorithm = 'BCRYPT' AND
    "passwordHash" ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' AND
    jsonb_typeof(parameters) = 'object'
  ),
  ADD CONSTRAINT "LocalCredential_revision_check" CHECK (revision > 0),
  ADD CONSTRAINT "LocalCredential_changed_time_check" CHECK ("changedAt" <= "updatedAt");

ALTER TABLE "ExternalIdentityLink"
  ADD CONSTRAINT "ExternalIdentityLink_external_provider_check" CHECK (
    "providerKind" IN ('OIDC', 'SAML')
  ),
  ADD CONSTRAINT "ExternalIdentityLink_values_check" CHECK (
    length("exactIssuer") BETWEEN 1 AND 2048 AND
    length("providerSubject") BETWEEN 1 AND 1024 AND
    btrim("exactIssuer") = "exactIssuer" AND
    btrim("providerSubject") = "providerSubject"
  ),
  ADD CONSTRAINT "ExternalIdentityLink_revision_check" CHECK (revision > 0),
  ADD CONSTRAINT "ExternalIdentityLink_state_time_check" CHECK (
    (state = 'REVOKED' AND "revokedAt" IS NOT NULL) OR
    (state <> 'REVOKED' AND "revokedAt" IS NULL)
  );

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_reference_check" CHECK (
    length("sessionRef") = 47 AND "sessionRef" ~ '^sr2_[A-Za-z0-9_-]{43}$'
  ),
  ADD CONSTRAINT "AuthSession_generations_sequence_check" CHECK (
    "observedCredentialGeneration" > 0 AND "observedSessionGeneration" > 0 AND
    "rotationSequence" >= 0
  ),
  ADD CONSTRAINT "AuthSession_refresh_evidence_check" CHECK (
    "refreshTokenHash" ~ '^[0-9a-f]{64}$'
  ),
  ADD CONSTRAINT "AuthSession_time_state_check" CHECK (
    "lastSeenAt" >= "createdAt" AND "expiresAt" > "createdAt" AND
    ((lifecycle = 'ACTIVE' AND "revokedAt" IS NULL) OR
     (lifecycle = 'REVOKED' AND "revokedAt" IS NOT NULL))
  ),
  ADD CONSTRAINT "AuthSession_audience_check" CHECK (
    length(audience) BETWEEN 1 AND 512 AND btrim(audience) = audience
  ),
  ADD CONSTRAINT "AuthSession_device_label_check" CHECK (
    "deviceLabel" IS NULL OR
    (length("deviceLabel") BETWEEN 1 AND 128 AND btrim("deviceLabel") = "deviceLabel")
  );

ALTER TABLE "LegacySessionBridge"
  ADD CONSTRAINT "LegacySessionBridge_fingerprint_check" CHECK (
    length("legacySessionFingerprint") = 48 AND
    "legacySessionFingerprint" ~ '^lsb1_[A-Za-z0-9_-]{43}$'
  ),
  ADD CONSTRAINT "LegacySessionBridge_generations_check" CHECK (
    "observedCredentialGeneration" > 0 AND "observedSessionGeneration" > 0
  ),
  ADD CONSTRAINT "LegacySessionBridge_time_state_check" CHECK (
    "expiresAt" > "createdAt" AND
    (state = 'PENDING' AND "consumedAuthSessionId" IS NULL AND "consumedAt" IS NULL AND "revokedAt" IS NULL OR
     state = 'CONSUMED' AND "consumedAuthSessionId" IS NOT NULL AND "consumedAt" IS NOT NULL AND "revokedAt" IS NULL OR
     state = 'REVOKED' AND "consumedAuthSessionId" IS NULL AND "consumedAt" IS NULL AND "revokedAt" IS NOT NULL)
  );

ALTER TABLE "RootSsoExchangeGrant"
  ADD CONSTRAINT "RootSsoExchangeGrant_digest_pkce_check" CHECK (
    "codeDigest" ~ '^[0-9a-f]{64}$' AND
    "pkceS256Challenge" ~ '^[A-Za-z0-9_-]{43}$'
  ),
  ADD CONSTRAINT "RootSsoExchangeGrant_revision_check" CHECK (
    "applicationPolicyRevision" > 0 AND "federationTrustRevision" > 0
  ),
  ADD CONSTRAINT "RootSsoExchangeGrant_time_state_check" CHECK (
    "expiresAt" > "createdAt" AND
    (state = 'PENDING' AND "consumedAuthSessionId" IS NULL AND "consumedAt" IS NULL AND "revokedAt" IS NULL OR
     state = 'CONSUMED' AND "consumedAuthSessionId" IS NOT NULL AND "consumedAt" IS NOT NULL AND "revokedAt" IS NULL OR
     state = 'REVOKED' AND "consumedAuthSessionId" IS NULL AND "consumedAt" IS NULL AND "revokedAt" IS NOT NULL)
  );

ALTER TABLE "AuthAuditEvent"
  ADD CONSTRAINT "AuthAuditEvent_hash_check" CHECK (
    "eventHash" ~ '^[0-9a-f]{64}$' AND
    ("previousHash" IS NULL OR "previousHash" ~ '^[0-9a-f]{64}$')
  ),
  ADD CONSTRAINT "AuthAuditEvent_version_values_check" CHECK (
    "eventVersion" > 0 AND
    ("credentialGeneration" IS NULL OR "credentialGeneration" > 0) AND
    ("sessionGeneration" IS NULL OR "sessionGeneration" > 0) AND
    (sequence IS NULL OR sequence >= 0) AND
    length(purpose) BETWEEN 1 AND 128 AND length(reason) BETWEEN 1 AND 256
  );

ALTER TABLE "AuthOutboxEvent"
  ADD CONSTRAINT "AuthOutboxEvent_values_check" CHECK (
    "eventVersion" > 0 AND attempts >= 0 AND
    ("credentialGeneration" IS NULL OR "credentialGeneration" > 0) AND
    ("sessionGeneration" IS NULL OR "sessionGeneration" > 0) AND
    (sequence IS NULL OR sequence >= 0) AND
    jsonb_typeof(payload) = 'object' AND
    length("aggregateKind") BETWEEN 1 AND 64
  ),
  ADD CONSTRAINT "AuthOutboxEvent_state_time_check" CHECK (
    (state = 'PENDING' AND "dispatchedAt" IS NULL) OR
    (state = 'DISPATCHED' AND "dispatchedAt" IS NOT NULL)
  );

ALTER TABLE "MigrationManifest"
  ADD CONSTRAINT "MigrationManifest_digest_check" CHECK (
    "manifestDigest" ~ '^[0-9a-f]{64}$'
  ),
  ADD CONSTRAINT "MigrationManifest_bounds_check" CHECK (
    "manifestVersion" > 0 AND "expiresAt" > "sourceCreatedAt" AND
    "sourceRecordCount" >= 0 AND "importedRecordCount" >= 0 AND
    "duplicateRecordCount" >= 0 AND "orphanRecordCount" >= 0 AND
    "importedRecordCount" + "duplicateRecordCount" + "orphanRecordCount" <= "sourceRecordCount"
  ),
  ADD CONSTRAINT "MigrationManifest_state_time_check" CHECK (
    (state = 'IMPORTING' AND "completedAt" IS NULL AND "rolledBackAt" IS NULL) OR
    (state IN ('COMPLETE', 'REJECTED') AND "completedAt" IS NOT NULL AND "rolledBackAt" IS NULL) OR
    (state = 'ROLLED_BACK' AND "completedAt" IS NOT NULL AND
      "rolledBackAt" IS NOT NULL AND "rolledBackAt" >= "completedAt")
  );

ALTER TABLE "MigrationRecordReceipt"
  ADD CONSTRAINT "MigrationRecordReceipt_hmac_kind_check" CHECK (
    "recordHmac" ~ '^[0-9a-f]{64}$' AND
    length("recordKind") BETWEEN 1 AND 64
  );

CREATE FUNCTION realm_auth_guard_boundary_and_shadow()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  configured "RealmBoundary"%ROWTYPE;
BEGIN
  SELECT * INTO configured FROM "RealmBoundary" LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'realm_auth_boundary_missing';
  END IF;
  IF NEW."identityRealmId" <> configured."identityRealmId" THEN
    RAISE EXCEPTION 'realm_auth_wrong_realm';
  END IF;
  -- Keep table dispatch separate from row-field expressions. PostgreSQL plans
  -- each PL/pgSQL expression for the trigger relation, so one AND expression
  -- that mentions a column absent from another attached table is invalid.
  IF TG_TABLE_NAME = 'RealmSubject' THEN
    IF NEW."principalClass" <> configured."principalClass" THEN
      RAISE EXCEPTION 'realm_auth_principal_class_mismatch';
    END IF;
    IF TG_OP = 'UPDATE' AND configured."admissionMode" = 'SHADOW' AND
       (NEW."credentialGeneration" <> OLD."credentialGeneration" OR
        NEW."sessionGeneration" <> OLD."sessionGeneration") THEN
      RAISE EXCEPTION 'realm_auth_shadow_generation_change_forbidden';
    END IF;
  ELSIF TG_TABLE_NAME IN ('LoginIdentifier', 'LocalCredential') THEN
    IF TG_OP = 'UPDATE' AND configured."admissionMode" = 'SHADOW' THEN
      RAISE EXCEPTION 'realm_auth_shadow_credential_mutation_forbidden';
    END IF;
  ELSIF TG_TABLE_NAME = 'AuthSession' THEN
    IF configured."admissionMode" = 'SHADOW' THEN
      RAISE EXCEPTION 'realm_auth_shadow_session_forbidden';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "RealmSubject_boundary_shadow_guard"
BEFORE INSERT OR UPDATE ON "RealmSubject"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "RealmKeyRegistration_boundary_guard"
BEFORE INSERT OR UPDATE ON "RealmKeyRegistration"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "LoginIdentifier_boundary_shadow_guard"
BEFORE INSERT OR UPDATE ON "LoginIdentifier"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "LocalCredential_boundary_shadow_guard"
BEFORE INSERT OR UPDATE ON "LocalCredential"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "AuthSession_boundary_shadow_guard"
BEFORE INSERT OR UPDATE ON "AuthSession"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "LegacySessionBridge_boundary_guard"
BEFORE INSERT OR UPDATE ON "LegacySessionBridge"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "ExternalIdentityLink_boundary_guard"
BEFORE INSERT OR UPDATE ON "ExternalIdentityLink"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "RootSsoExchangeGrant_boundary_guard"
BEFORE INSERT OR UPDATE ON "RootSsoExchangeGrant"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "AuthAuditEvent_boundary_guard"
BEFORE INSERT OR UPDATE ON "AuthAuditEvent"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "AuthOutboxEvent_boundary_guard"
BEFORE INSERT OR UPDATE ON "AuthOutboxEvent"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();
CREATE TRIGGER "MigrationManifest_boundary_guard"
BEFORE INSERT OR UPDATE ON "MigrationManifest"
FOR EACH ROW EXECUTE FUNCTION realm_auth_guard_boundary_and_shadow();

CREATE FUNCTION realm_auth_immutable_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'RealmBoundary' THEN
    IF (NEW.singleton, NEW."identityRealmId", NEW."authRouteRef", NEW.kind, NEW."principalClass", NEW.issuer) IS DISTINCT FROM
       (OLD.singleton, OLD."identityRealmId", OLD."authRouteRef", OLD.kind, OLD."principalClass", OLD.issuer) THEN
      RAISE EXCEPTION 'realm_auth_boundary_identity_immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'RealmKeyRegistration' THEN
    IF (NEW.id, NEW."identityRealmId", NEW.purpose, NEW."keyReference", NEW."createdAt") IS DISTINCT FROM
       (OLD.id, OLD."identityRealmId", OLD.purpose, OLD."keyReference", OLD."createdAt") THEN
      RAISE EXCEPTION 'realm_auth_key_identity_immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'RealmSubject' THEN
    IF (NEW.id, NEW."identityRealmId", NEW."principalClass", NEW."createdAt") IS DISTINCT FROM
       (OLD.id, OLD."identityRealmId", OLD."principalClass", OLD."createdAt") THEN
      RAISE EXCEPTION 'realm_auth_subject_identity_immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'AuthSession' THEN
    IF (NEW.id, NEW."identityRealmId", NEW."subjectId", NEW."sessionRef", NEW."sessionRefKeyId",
        NEW."observedCredentialGeneration", NEW."observedSessionGeneration", NEW."providerRegistrationId",
        NEW."providerKind", NEW."applicationId", NEW.audience, NEW."familyId", NEW."createdAt") IS DISTINCT FROM
       (OLD.id, OLD."identityRealmId", OLD."subjectId", OLD."sessionRef", OLD."sessionRefKeyId",
        OLD."observedCredentialGeneration", OLD."observedSessionGeneration", OLD."providerRegistrationId",
        OLD."providerKind", OLD."applicationId", OLD.audience, OLD."familyId", OLD."createdAt") THEN
      RAISE EXCEPTION 'realm_auth_session_identity_immutable';
    END IF;
  ELSIF TG_TABLE_NAME = 'LegacySessionBridge' THEN
    IF (NEW.id, NEW."identityRealmId", NEW."subjectId", NEW."legacySessionFingerprint",
        NEW."legacySessionFingerprintKeyId", NEW."observedCredentialGeneration",
        NEW."observedSessionGeneration", NEW."expiresAt", NEW."createdAt") IS DISTINCT FROM
       (OLD.id, OLD."identityRealmId", OLD."subjectId", OLD."legacySessionFingerprint",
        OLD."legacySessionFingerprintKeyId", OLD."observedCredentialGeneration",
        OLD."observedSessionGeneration", OLD."expiresAt", OLD."createdAt") THEN
      RAISE EXCEPTION 'realm_auth_legacy_bridge_identity_immutable';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "RealmBoundary_identity_immutable"
BEFORE UPDATE ON "RealmBoundary"
FOR EACH ROW EXECUTE FUNCTION realm_auth_immutable_identity();
CREATE TRIGGER "RealmKeyRegistration_identity_immutable"
BEFORE UPDATE ON "RealmKeyRegistration"
FOR EACH ROW EXECUTE FUNCTION realm_auth_immutable_identity();
CREATE TRIGGER "RealmSubject_identity_immutable"
BEFORE UPDATE ON "RealmSubject"
FOR EACH ROW EXECUTE FUNCTION realm_auth_immutable_identity();
CREATE TRIGGER "AuthSession_identity_immutable"
BEFORE UPDATE ON "AuthSession"
FOR EACH ROW EXECUTE FUNCTION realm_auth_immutable_identity();
CREATE TRIGGER "LegacySessionBridge_identity_immutable"
BEFORE UPDATE ON "LegacySessionBridge"
FOR EACH ROW EXECUTE FUNCTION realm_auth_immutable_identity();

CREATE FUNCTION realm_auth_reference_key_purpose()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  actual_purpose "RealmKeyPurpose";
BEGIN
  IF TG_TABLE_NAME = 'AuthSession' THEN
    SELECT purpose INTO actual_purpose FROM "RealmKeyRegistration"
      WHERE "identityRealmId" = NEW."identityRealmId" AND id = NEW."sessionRefKeyId";
    IF actual_purpose IS DISTINCT FROM 'SESSION_REFERENCE'::"RealmKeyPurpose" THEN
      RAISE EXCEPTION 'realm_auth_session_reference_key_invalid';
    END IF;
  ELSIF TG_TABLE_NAME = 'LegacySessionBridge' THEN
    SELECT purpose INTO actual_purpose FROM "RealmKeyRegistration"
      WHERE "identityRealmId" = NEW."identityRealmId" AND id = NEW."legacySessionFingerprintKeyId";
    IF actual_purpose IS DISTINCT FROM 'LEGACY_SESSION_BRIDGE'::"RealmKeyPurpose" THEN
      RAISE EXCEPTION 'realm_auth_legacy_bridge_key_invalid';
    END IF;
  ELSIF TG_TABLE_NAME = 'AuthAuditEvent' THEN
    SELECT purpose INTO actual_purpose FROM "RealmKeyRegistration"
      WHERE "identityRealmId" = NEW."identityRealmId" AND id = NEW."keyId";
    IF actual_purpose IS DISTINCT FROM 'AUDIT_INTEGRITY'::"RealmKeyPurpose" THEN
      RAISE EXCEPTION 'realm_auth_audit_key_invalid';
    END IF;
  ELSIF TG_TABLE_NAME = 'MigrationManifest' THEN
    SELECT purpose INTO actual_purpose FROM "RealmKeyRegistration"
      WHERE "identityRealmId" = NEW."identityRealmId" AND id = NEW."destinationKeyId";
    IF actual_purpose IS DISTINCT FROM 'ARTIFACT_DECRYPTION'::"RealmKeyPurpose" THEN
      RAISE EXCEPTION 'realm_auth_destination_key_invalid';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "AuthSession_reference_key_purpose"
BEFORE INSERT OR UPDATE ON "AuthSession"
FOR EACH ROW EXECUTE FUNCTION realm_auth_reference_key_purpose();
CREATE TRIGGER "LegacySessionBridge_key_purpose"
BEFORE INSERT OR UPDATE ON "LegacySessionBridge"
FOR EACH ROW EXECUTE FUNCTION realm_auth_reference_key_purpose();
CREATE TRIGGER "AuthAuditEvent_key_purpose"
BEFORE INSERT OR UPDATE ON "AuthAuditEvent"
FOR EACH ROW EXECUTE FUNCTION realm_auth_reference_key_purpose();
CREATE TRIGGER "MigrationManifest_key_purpose"
BEFORE INSERT OR UPDATE ON "MigrationManifest"
FOR EACH ROW EXECUTE FUNCTION realm_auth_reference_key_purpose();

CREATE FUNCTION realm_auth_terminal_state_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.state IN ('CONSUMED', 'REVOKED') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'realm_auth_terminal_record_immutable';
  END IF;
  IF OLD.state = 'PENDING' AND NEW.state NOT IN ('PENDING', 'CONSUMED', 'REVOKED') THEN
    RAISE EXCEPTION 'realm_auth_terminal_transition_invalid';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "LegacySessionBridge_terminal_state"
BEFORE UPDATE ON "LegacySessionBridge"
FOR EACH ROW EXECUTE FUNCTION realm_auth_terminal_state_guard();
CREATE TRIGGER "RootSsoExchangeGrant_terminal_state"
BEFORE UPDATE ON "RootSsoExchangeGrant"
FOR EACH ROW EXECUTE FUNCTION realm_auth_terminal_state_guard();

CREATE FUNCTION realm_auth_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'realm_auth_audit_append_only';
END
$function$;

CREATE TRIGGER "AuthAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuthAuditEvent"
FOR EACH ROW EXECUTE FUNCTION realm_auth_audit_append_only();

CREATE FUNCTION realm_auth_import_receipt_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'realm_auth_import_receipt_immutable';
END
$function$;

CREATE TRIGGER "MigrationRecordReceipt_immutable"
BEFORE UPDATE OR DELETE ON "MigrationRecordReceipt"
FOR EACH ROW EXECUTE FUNCTION realm_auth_import_receipt_immutable();

CREATE FUNCTION realm_auth_manifest_state_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  configured_mode "RealmAdmissionMode";
BEGIN
  IF OLD.state IN ('REJECTED', 'ROLLED_BACK') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'realm_auth_manifest_terminal';
  END IF;
  IF OLD."sourceOwner" <> NEW."sourceOwner" OR OLD."migrationId" <> NEW."migrationId" OR
     OLD."identityRealmId" <> NEW."identityRealmId" OR OLD."manifestDigest" <> NEW."manifestDigest" OR
     OLD."manifestHmacKeyId" <> NEW."manifestHmacKeyId" OR OLD."destinationKeyId" <> NEW."destinationKeyId" OR
     OLD."sourceCreatedAt" <> NEW."sourceCreatedAt" OR OLD."expiresAt" <> NEW."expiresAt" OR
     OLD."sourceRecordCount" <> NEW."sourceRecordCount" THEN
    RAISE EXCEPTION 'realm_auth_manifest_identity_immutable';
  END IF;
  IF OLD.state = 'COMPLETE' AND NEW IS DISTINCT FROM OLD THEN
    IF NEW.state <> 'ROLLED_BACK' OR NEW."rolledBackAt" IS NULL OR
       (NEW."manifestVersion", NEW."importedRecordCount", NEW."duplicateRecordCount",
        NEW."orphanRecordCount", NEW."createdAt", NEW."completedAt") IS DISTINCT FROM
       (OLD."manifestVersion", OLD."importedRecordCount", OLD."duplicateRecordCount",
        OLD."orphanRecordCount", OLD."createdAt", OLD."completedAt") THEN
      RAISE EXCEPTION 'realm_auth_manifest_terminal';
    END IF;
    SELECT "admissionMode" INTO configured_mode FROM "RealmBoundary"
      WHERE "identityRealmId" = OLD."identityRealmId";
    IF configured_mode IS DISTINCT FROM 'SHADOW'::"RealmAdmissionMode" THEN
      RAISE EXCEPTION 'realm_auth_rollback_requires_shadow';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "MigrationRecordReceipt" receipt
      JOIN "AuthSession" session
        ON session."identityRealmId" = OLD."identityRealmId"
       AND session."subjectId" = receipt."targetId"
      WHERE receipt."manifestId" = OLD.id
    ) THEN
      RAISE EXCEPTION 'realm_auth_rollback_session_exists';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "MigrationRecordReceipt" receipt
      JOIN "RealmSubject" subject
        ON subject."identityRealmId" = OLD."identityRealmId"
       AND subject.id = receipt."targetId"
      WHERE receipt."manifestId" = OLD.id
    ) THEN
      RAISE EXCEPTION 'realm_auth_rollback_subject_exists';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "MigrationManifest_state_guard"
BEFORE UPDATE ON "MigrationManifest"
FOR EACH ROW EXECUTE FUNCTION realm_auth_manifest_state_guard();
