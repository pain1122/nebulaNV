import { readFileSync } from "node:fs";
import path from "node:path";

const serviceRoot = path.resolve(__dirname, "..");
const migration = readFileSync(
  path.join(
    serviceRoot,
    "prisma",
    "migrations",
    "20260825000100_authority_registration_records",
    "migration.sql",
  ),
  "utf8",
);

describe("authority registration persistence boundary", () => {
  it("keeps the Batch 2 item 2 migration limited to its eight roots", () => {
    const migrationTables = [
      ...migration.matchAll(/^CREATE TABLE "(\w+)"/gm),
    ].map(([, table]) => table);

    expect(migrationTables).toEqual([
      "Tenant",
      "Site",
      "Channel",
      "Application",
      "WebOrigin",
      "AndroidIdentity",
      "IosIdentity",
      "ParentRelationship",
    ]);
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:Membership|AuthorityAuditEvent|AuthorityInvalidationOutbox)"/,
    );
  });

  it("enforces UUID, same-scope, lifecycle, identity, and relationship rules", () => {
    for (const evidence of [
      'CONSTRAINT "Tenant_id_uuid_v4_check"',
      'CONSTRAINT "Application_clientId_uuid_v4_check"',
      'CONSTRAINT "Channel_siteId_tenantId_fkey"',
      'CONSTRAINT "Application_channelId_tenantId_siteId_fkey"',
      'CONSTRAINT "WebOrigin_applicationId_tenantId_siteId_fkey"',
      '"Site_one_primary_per_tenant_key"',
      '"WebOrigin_current_canonicalOrigin_key"',
      '"AndroidIdentity_current_pair_key"',
      '"IosIdentity_current_pair_key"',
      '"ParentRelationship_current_subordinate_key"',
      '"authority_tenant_guard"',
      '"authority_site_guard"',
      '"authority_application_guard"',
      '"authority_identity_state_guard"',
      '"authority_parent_relationship_guard"',
      '"authority_assert_active_tenant_primary_site"',
      '"authority_assert_application_registration"',
      '"AndroidIdentity_current_package_application_excl"',
      "CREATE EXTENSION IF NOT EXISTS btree_gist",
    ]) {
      expect(migration).toContain(evidence);
    }
  });

  it("keeps later authority records, seed data, traffic, and hard deletes out", () => {
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:Membership|AuthorityAuditEvent|AuthorityInvalidationOutbox)"/,
    );
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bDROP\s+(?:TABLE|TYPE|DATABASE|ROLE)\b/i);
    expect(migration).toMatch(
      /REVOKE DELETE ON TABLE[\s\S]+FROM nebula_authority_runtime/,
    );
  });
});
