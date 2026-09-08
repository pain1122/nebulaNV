-- Batch 2 item 3: the minimal F4-to-F6 entitlement scope anchor.
-- This migration deliberately adds no feature, plan, enabled, limit, license,
-- module, allocation, billing, seed, consumer, or traffic behavior.

CREATE TYPE "EntitlementScopeKind" AS ENUM ('TENANT', 'SITE');

CREATE TABLE "EntitlementScopeRef" (
  "id" UUID NOT NULL,
  "scopeKind" "EntitlementScopeKind" NOT NULL,
  "tenantId" UUID NOT NULL,
  "siteId" UUID,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "EntitlementScopeRef_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EntitlementScopeRef_tenantId_scopeKind_idx"
  ON "EntitlementScopeRef"("tenantId", "scopeKind");

CREATE INDEX "EntitlementScopeRef_tenantId_siteId_idx"
  ON "EntitlementScopeRef"("tenantId", "siteId");

ALTER TABLE "EntitlementScopeRef"
  ADD CONSTRAINT "EntitlementScopeRef_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "EntitlementScopeRef"
  ADD CONSTRAINT "EntitlementScopeRef_siteId_tenantId_fkey"
  FOREIGN KEY ("siteId", "tenantId") REFERENCES "Site"("id", "tenantId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "EntitlementScopeRef"
  ADD CONSTRAINT "EntitlementScopeRef_id_uuid_v4_check" CHECK (
    "id"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  ADD CONSTRAINT "EntitlementScopeRef_binding_check" CHECK (
    ("scopeKind" = 'TENANT' AND "siteId" IS NULL)
    OR ("scopeKind" = 'SITE' AND "siteId" IS NOT NULL)
  ),
  ADD CONSTRAINT "EntitlementScopeRef_revision_check" CHECK ("revision" >= 1);

CREATE UNIQUE INDEX "EntitlementScopeRef_one_tenant_ref_key"
  ON "EntitlementScopeRef"("tenantId")
  WHERE "scopeKind" = 'TENANT';

CREATE UNIQUE INDEX "EntitlementScopeRef_one_site_ref_key"
  ON "EntitlementScopeRef"("tenantId", "siteId")
  WHERE "scopeKind" = 'SITE';

CREATE FUNCTION "authority_entitlement_scope_ref_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."id" <> NEW."id"
    OR OLD."scopeKind" <> NEW."scopeKind"
    OR OLD."tenantId" <> NEW."tenantId"
    OR OLD."siteId" IS DISTINCT FROM NEW."siteId"
  THEN
    RAISE EXCEPTION 'authority_entitlement_scope_binding_immutable';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER "EntitlementScopeRef_guard"
BEFORE UPDATE ON "EntitlementScopeRef"
FOR EACH ROW EXECUTE FUNCTION "authority_entitlement_scope_ref_guard"();

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
  ) THEN
    EXECUTE 'REVOKE DELETE ON TABLE "EntitlementScopeRef"
      FROM nebula_authority_runtime';
  END IF;
END
$block$;
