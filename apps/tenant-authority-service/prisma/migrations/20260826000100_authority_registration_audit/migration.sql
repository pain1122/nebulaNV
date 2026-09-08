-- Batch 2 item 5: retained client handles plus atomic authority audit/outbox.
-- This migration adds no seed, membership, grant, public API, F6 behavior,
-- consumer, or traffic-authority change.

CREATE TYPE "ApplicationClientHandleKind" AS ENUM (
  'CANONICAL',
  'LEGACY_ALIAS',
  'ROTATED'
);
CREATE TYPE "ApplicationClientHandleState" AS ENUM ('ACTIVE', 'TOMBSTONED');
CREATE TYPE "AuthorityAuthorizationPath" AS ENUM (
  'SERVICE_OPERATION',
  'TENANT_MANAGEMENT',
  'PARENT_MANAGEMENT',
  'PLATFORM_MANAGEMENT',
  'RECOVERY'
);
CREATE TYPE "AuthorityAuditResult" AS ENUM ('SUCCEEDED', 'DENIED', 'FAILED');
CREATE TYPE "AuthorityInvalidationState" AS ENUM ('PENDING', 'DISPATCHED');

CREATE TABLE "ApplicationClientHandle" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "handle" VARCHAR(128) NOT NULL,
  "kind" "ApplicationClientHandleKind" NOT NULL,
  "state" "ApplicationClientHandleState" NOT NULL DEFAULT 'ACTIVE',
  "activeFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeUntil" TIMESTAMPTZ(3),
  "tombstonedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ApplicationClientHandle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicationClientHandle_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "ApplicationClientHandle_handle_check" CHECK (
    "handle" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  CONSTRAINT "ApplicationClientHandle_window_check" CHECK (
    "activeUntil" IS NULL OR "activeUntil" > "activeFrom"
  ),
  CONSTRAINT "ApplicationClientHandle_state_time_check" CHECK (
    ("state" = 'ACTIVE' AND "tombstonedAt" IS NULL)
    OR ("state" = 'TOMBSTONED' AND "tombstonedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ApplicationClientHandle_handle_key"
  ON "ApplicationClientHandle"("handle");
CREATE INDEX "ApplicationClientHandle_applicationId_state_idx"
  ON "ApplicationClientHandle"("applicationId", "state");
CREATE INDEX "ApplicationClientHandle_state_activeUntil_idx"
  ON "ApplicationClientHandle"("state", "activeUntil");

ALTER TABLE "ApplicationClientHandle"
  ADD CONSTRAINT "ApplicationClientHandle_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "AuthorityInvalidationOutbox" (
  "id" UUID NOT NULL,
  "aggregateKind" VARCHAR(64) NOT NULL,
  "aggregateId" UUID NOT NULL,
  "tenantId" UUID,
  "siteId" UUID,
  "referenceId" UUID,
  "revision" BIGINT NOT NULL,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "state" "AuthorityInvalidationState" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AuthorityInvalidationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityInvalidationOutbox_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "AuthorityInvalidationOutbox_values_check" CHECK (
    "aggregateKind" ~ '^[A-Z][A-Z0-9_]{0,63}$'
    AND "revision" > 0
    AND "payloadVersion" > 0
    AND "attempts" >= 0
  ),
  CONSTRAINT "AuthorityInvalidationOutbox_state_time_check" CHECK (
    ("state" = 'PENDING' AND "dispatchedAt" IS NULL)
    OR ("state" = 'DISPATCHED' AND "dispatchedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "AuthorityInvalidationOutbox_aggregate_revision_key"
  ON "AuthorityInvalidationOutbox"("aggregateKind", "aggregateId", "revision");
CREATE INDEX "AuthorityInvalidationOutbox_dispatch_idx"
  ON "AuthorityInvalidationOutbox"("state", "nextAttemptAt", "createdAt");
CREATE INDEX "AuthorityInvalidationOutbox_aggregate_idx"
  ON "AuthorityInvalidationOutbox"("aggregateKind", "aggregateId", "revision");

CREATE TABLE "AuthorityAuditEvent" (
  "id" UUID NOT NULL,
  "partitionKey" CHAR(7) NOT NULL,
  "partitionSequence" BIGINT NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "eventVersion" INTEGER NOT NULL DEFAULT 1,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "actorUserId" VARCHAR(128),
  "actorAuthorityRef" VARCHAR(128),
  "authorizationPath" "AuthorityAuthorizationPath" NOT NULL,
  "operation" VARCHAR(128) NOT NULL,
  "applicationId" UUID,
  "channelId" UUID,
  "callerService" VARCHAR(128) NOT NULL,
  "targetService" VARCHAR(128) NOT NULL,
  "targetTenantId" UUID,
  "targetSiteId" UUID,
  "targetResourceType" VARCHAR(64) NOT NULL,
  "targetResourceId" VARCHAR(128) NOT NULL,
  "requestId" VARCHAR(128) NOT NULL,
  "result" "AuthorityAuditResult" NOT NULL,
  "reasonCode" VARCHAR(128) NOT NULL,
  "authorityRevision" VARCHAR(128) NOT NULL,
  "change" JSONB NOT NULL,
  "previousEventHash" CHAR(64),
  "eventHash" CHAR(64) NOT NULL,
  "integrityKeyId" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthorityAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorityAuditEvent_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  CONSTRAINT "AuthorityAuditEvent_partition_check" CHECK (
    "partitionKey" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    AND "partitionKey" = to_char("occurredAt" AT TIME ZONE 'UTC', 'YYYY-MM')
    AND "partitionSequence" > 0
  ),
  CONSTRAINT "AuthorityAuditEvent_version_check" CHECK (
    "eventVersion" > 0 AND "schemaVersion" > 0
  ),
  CONSTRAINT "AuthorityAuditEvent_safe_text_check" CHECK (
    "operation" ~ '^[A-Z][A-Z0-9_.:-]{0,127}$'
    AND "callerService" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
    AND "targetService" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
    AND "targetResourceType" ~ '^[A-Z][A-Z0-9_]{0,63}$'
    AND "targetResourceId" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
    AND "requestId" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
    AND "reasonCode" ~ '^[A-Z][A-Z0-9_.:-]{0,127}$'
    AND "authorityRevision" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
    AND "integrityKeyId" ~ '^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$'
  ),
  CONSTRAINT "AuthorityAuditEvent_hash_check" CHECK (
    ("previousEventHash" IS NULL OR "previousEventHash" ~ '^[0-9a-f]{64}$')
    AND "eventHash" ~ '^[0-9a-f]{64}$'
  )
);

CREATE UNIQUE INDEX "AuthorityAuditEvent_partition_sequence_key"
  ON "AuthorityAuditEvent"("partitionKey", "partitionSequence");
CREATE INDEX "AuthorityAuditEvent_requestId_idx"
  ON "AuthorityAuditEvent"("requestId");
CREATE INDEX "AuthorityAuditEvent_actorUserId_occurredAt_idx"
  ON "AuthorityAuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "AuthorityAuditEvent_target_occurredAt_idx"
  ON "AuthorityAuditEvent"("targetTenantId", "targetSiteId", "occurredAt");
CREATE INDEX "AuthorityAuditEvent_operation_result_occurredAt_idx"
  ON "AuthorityAuditEvent"("operation", "result", "occurredAt");

CREATE FUNCTION "authority_client_handle_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."applicationId" <> NEW."applicationId"
      OR OLD."handle" <> NEW."handle"
      OR OLD."kind" <> NEW."kind"
      OR OLD."activeFrom" <> NEW."activeFrom"
      OR OLD."createdAt" <> NEW."createdAt"
    THEN
      RAISE EXCEPTION 'authority_client_handle_identity_immutable';
    END IF;
    IF OLD."state" = 'TOMBSTONED' AND NEW."state" <> 'TOMBSTONED' THEN
      RAISE EXCEPTION 'authority_client_handle_tombstone_terminal';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "ApplicationClientHandle_guard"
BEFORE UPDATE ON "ApplicationClientHandle"
FOR EACH ROW EXECUTE FUNCTION "authority_client_handle_guard"();

CREATE FUNCTION "authority_outbox_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."id" <> NEW."id"
    OR OLD."aggregateKind" <> NEW."aggregateKind"
    OR OLD."aggregateId" <> NEW."aggregateId"
    OR OLD."tenantId" IS DISTINCT FROM NEW."tenantId"
    OR OLD."siteId" IS DISTINCT FROM NEW."siteId"
    OR OLD."referenceId" IS DISTINCT FROM NEW."referenceId"
    OR OLD."revision" <> NEW."revision"
    OR OLD."payloadVersion" <> NEW."payloadVersion"
    OR OLD."payload" <> NEW."payload"
    OR OLD."createdAt" <> NEW."createdAt"
  THEN
    RAISE EXCEPTION 'authority_outbox_event_immutable';
  END IF;
  IF OLD."state" = 'DISPATCHED' AND NEW."state" <> 'DISPATCHED' THEN
    RAISE EXCEPTION 'authority_outbox_dispatch_terminal';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "AuthorityInvalidationOutbox_guard"
BEFORE UPDATE ON "AuthorityInvalidationOutbox"
FOR EACH ROW EXECUTE FUNCTION "authority_outbox_guard"();

CREATE FUNCTION "authority_audit_append_only_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'authority_audit_event_append_only';
END
$function$;

CREATE TRIGGER "AuthorityAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuthorityAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "authority_audit_append_only_guard"();

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
  ) THEN
    EXECUTE 'REVOKE DELETE ON TABLE
      "ApplicationClientHandle",
      "AuthorityInvalidationOutbox",
      "AuthorityAuditEvent"
      FROM nebula_authority_runtime';
    EXECUTE 'REVOKE UPDATE ON TABLE "AuthorityAuditEvent"
      FROM nebula_authority_runtime';
  END IF;
END
$block$;
