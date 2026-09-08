-- F4 Batch 3R R2: additive deterministic-default actor coordinates.
-- Legacy userId readers/writers remain primary. Existing v1 audit/outbox rows
-- are retained byte-for-byte and receive no realm/subject backfill.

BEGIN;

ALTER TABLE "Membership"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID;

ALTER TABLE "PlatformGrant"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID;

ALTER TABLE "AuthorityAuditEvent"
  ADD COLUMN "actorIdentityRealmId" UUID,
  ADD COLUMN "actorSubjectId" UUID;

ALTER TABLE "AuthorityInvalidationOutbox"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID;

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_identityRealmId_fkey"
  FOREIGN KEY ("identityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "Membership_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" = 'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" = "userId"
    )
  );

ALTER TABLE "PlatformGrant"
  ADD CONSTRAINT "PlatformGrant_identityRealmId_fkey"
  FOREIGN KEY ("identityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "PlatformGrant_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" = 'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" = "userId"
    )
  );

ALTER TABLE "AuthorityAuditEvent"
  ADD CONSTRAINT "AuthorityAuditEvent_actor_realm_fkey"
  FOREIGN KEY ("actorIdentityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "AuthorityAuditEvent_actor_pair_check" CHECK (
    ("actorIdentityRealmId" IS NULL AND "actorSubjectId" IS NULL)
    OR (
      "actorIdentityRealmId" IS NOT NULL
      AND "actorIdentityRealmId" = 'b1000000-0000-4000-8000-000000000001'::uuid
      AND "actorSubjectId" IS NOT NULL
      AND (
        "actorUserId" IS NULL
        OR "actorUserId" = "actorSubjectId"::text
      )
    )
  ),
  ADD CONSTRAINT "AuthorityAuditEvent_actor_version_check" CHECK (
    (
      "eventVersion" = 1
      AND "schemaVersion" = 1
      AND "actorIdentityRealmId" IS NULL
      AND "actorSubjectId" IS NULL
    )
    OR (
      "eventVersion" >= 2
      AND "schemaVersion" >= 2
    )
  );

ALTER TABLE "AuthorityInvalidationOutbox"
  ADD CONSTRAINT "AuthorityInvalidationOutbox_identity_realm_fkey"
  FOREIGN KEY ("identityRealmId") REFERENCES "IdentityRealm"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "AuthorityInvalidationOutbox_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "identityRealmId" IS NOT NULL
      AND "identityRealmId" = 'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "AuthorityInvalidationOutbox_actor_version_check" CHECK (
    (
      "payloadVersion" = 1
      AND "identityRealmId" IS NULL
      AND "subjectId" IS NULL
    )
    OR "payloadVersion" >= 2
  );

CREATE UNIQUE INDEX "Membership_tenantId_identityRealmId_subjectId_key"
  ON "Membership"("tenantId", "identityRealmId", "subjectId")
  WHERE "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL;
CREATE INDEX "Membership_realm_subject_state_idx"
  ON "Membership"("tenantId", "identityRealmId", "subjectId", "state");

CREATE UNIQUE INDEX "PlatformGrant_one_active_realm_subject_role_key"
  ON "PlatformGrant"("identityRealmId", "subjectId", "role")
  WHERE "state" = 'ACTIVE'
    AND "identityRealmId" IS NOT NULL
    AND "subjectId" IS NOT NULL;
CREATE INDEX "PlatformGrant_realm_subject_state_idx"
  ON "PlatformGrant"("identityRealmId", "subjectId", "state");

CREATE INDEX "AuthorityAuditEvent_actor_realm_subject_idx"
  ON "AuthorityAuditEvent"(
    "actorIdentityRealmId", "actorSubjectId", "occurredAt"
  );
CREATE INDEX "AuthorityInvalidationOutbox_actor_realm_subject_idx"
  ON "AuthorityInvalidationOutbox"(
    "identityRealmId", "subjectId", "state"
  );

CREATE FUNCTION "authority_default_actor_pair_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."identityRealmId" IS NULL AND NEW."subjectId" IS NULL THEN
    NEW."identityRealmId" :=
      'b1000000-0000-4000-8000-000000000001'::uuid;
    NEW."subjectId" := NEW."userId";
  ELSIF NEW."identityRealmId" IS NULL OR NEW."subjectId" IS NULL THEN
    RAISE EXCEPTION 'authority_default_actor_pair_partial';
  ELSIF NEW."identityRealmId" <>
      'b1000000-0000-4000-8000-000000000001'::uuid
    OR NEW."subjectId" <> NEW."userId"
  THEN
    RAISE EXCEPTION 'authority_default_actor_pair_mismatch';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "Membership_actor_pair_guard"
BEFORE INSERT OR UPDATE ON "Membership"
FOR EACH ROW EXECUTE FUNCTION "authority_default_actor_pair_guard"();
CREATE TRIGGER "PlatformGrant_actor_pair_guard"
BEFORE INSERT OR UPDATE ON "PlatformGrant"
FOR EACH ROW EXECUTE FUNCTION "authority_default_actor_pair_guard"();

CREATE OR REPLACE FUNCTION "authority_outbox_guard"()
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
    OR OLD."identityRealmId" IS DISTINCT FROM NEW."identityRealmId"
    OR OLD."subjectId" IS DISTINCT FROM NEW."subjectId"
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

DO $block$
BEGIN
  IF (
    EXISTS (SELECT 1 FROM "Membership")
    OR EXISTS (SELECT 1 FROM "PlatformGrant")
  ) AND NOT EXISTS (
    SELECT 1
    FROM "IdentityRealm"
    WHERE "id" = 'b1000000-0000-4000-8000-000000000001'::uuid
      AND "kind" = 'LICENSED_ROOT_CONSUMER'
      AND "owningCustomerTenantId" =
        'a1000000-0000-4000-8000-000000000001'::uuid
      AND "licensedRootTenantId" =
        'a1000000-0000-4000-8000-000000000001'::uuid
      AND "isRootDefault"
      AND "lifecycle" <> 'REVOKED'
  ) THEN
    RAISE EXCEPTION 'authority_default_actor_realm_missing';
  END IF;

  UPDATE "Membership"
  SET "userId" = "userId"
  WHERE "identityRealmId" IS NULL AND "subjectId" IS NULL;
  UPDATE "PlatformGrant"
  SET "userId" = "userId"
  WHERE "identityRealmId" IS NULL AND "subjectId" IS NULL;

  IF EXISTS (
    SELECT 1 FROM "Membership"
    WHERE "identityRealmId" IS NULL OR "subjectId" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "PlatformGrant"
    WHERE "identityRealmId" IS NULL OR "subjectId" IS NULL
  ) THEN
    RAISE EXCEPTION 'authority_default_actor_backfill_incomplete';
  END IF;
END
$block$;

COMMIT;
