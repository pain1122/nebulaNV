import { readFileSync } from "node:fs";
import path from "node:path";

const serviceRoot = path.resolve(__dirname, "..");
const schema = readFileSync(
  path.join(serviceRoot, "prisma", "schema.prisma"),
  "utf8",
);
const migration = readFileSync(
  path.join(
    serviceRoot,
    "prisma",
    "migrations",
    "20260825000200_entitlement_scope_reference",
    "migration.sql",
  ),
  "utf8",
);

describe("minimal entitlement scope reference", () => {
  it("stores only the frozen tenant/site binding facts", () => {
    const model = schema.match(
      /model EntitlementScopeRef \{([\s\S]*?)^\}/m,
    )?.[1];

    expect(model).toBeDefined();
    for (const field of [
      "id",
      "scopeKind",
      "tenantId",
      "siteId",
      "revision",
      "createdAt",
      "updatedAt",
    ]) {
      expect(model).toMatch(new RegExp(`^\\s*${field}\\s`, "m"));
    }
    expect(model).not.toMatch(
      /feature|plan|enabled|limit|license|module|allocation|billing/i,
    );
  });

  it("enforces opaque UUID, exact binding, cardinality, and immutability", () => {
    for (const evidence of [
      'CONSTRAINT "EntitlementScopeRef_id_uuid_v4_check"',
      'CONSTRAINT "EntitlementScopeRef_binding_check"',
      'CONSTRAINT "EntitlementScopeRef_tenantId_fkey"',
      'CONSTRAINT "EntitlementScopeRef_siteId_tenantId_fkey"',
      '"EntitlementScopeRef_one_tenant_ref_key"',
      '"EntitlementScopeRef_one_site_ref_key"',
      '"authority_entitlement_scope_ref_guard"',
      "authority_entitlement_scope_binding_immutable",
    ]) {
      expect(migration).toContain(evidence);
    }
  });

  it("adds no F6 behavior, data, destructive rollback, or runtime delete", () => {
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|TYPE|DATABASE|ROLE)\b/i);
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:Feature|Plan|License|Module)/,
    );
    expect(migration).toMatch(
      /REVOKE DELETE ON TABLE "EntitlementScopeRef"[\s\S]+FROM nebula_authority_runtime/,
    );
  });
});
