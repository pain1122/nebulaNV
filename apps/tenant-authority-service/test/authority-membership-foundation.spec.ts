import { readFileSync } from "node:fs";
import path from "node:path";

const serviceRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(serviceRoot, "../..");
const authoritySchema = readFileSync(
  path.join(serviceRoot, "prisma", "schema.prisma"),
  "utf8",
);
const userSchema = readFileSync(
  path.join(repositoryRoot, "apps", "user-service", "prisma", "schema.prisma"),
  "utf8",
);
const migration = readFileSync(
  path.join(
    serviceRoot,
    "prisma",
    "migrations",
    "20260826000200_membership_authority_foundation",
    "migration.sql",
  ),
  "utf8",
);

describe("membership authority foundation", () => {
  it("keeps global identity and credentials exclusively in user-service", () => {
    const user = userSchema.match(/model User \{([\s\S]*?)^\}/m)?.[1];
    const membership = authoritySchema.match(
      /model Membership \{([\s\S]*?)^\}/m,
    )?.[1];

    expect(user).toBeDefined();
    expect(user).toMatch(/^\s*password\s/m);
    expect(user).not.toMatch(/tenantId|siteId|membershipEpoch/i);
    expect(membership).toBeDefined();
    expect(membership).toMatch(/^\s*userId\s+String\s+@db\.Uuid/m);
    expect(membership).not.toMatch(
      /email|phone|password|profile|token|session/i,
    );
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:User|Profile|Session|Token)"/i,
    );
  });

  it("adds only the frozen membership, epoch, and closed grant catalogs", () => {
    for (const model of [
      "Membership",
      "MembershipEpoch",
      "TenantRoleGrant",
      "SiteRoleGrant",
      "PlatformGrant",
    ]) {
      expect(authoritySchema).toContain(`model ${model} {`);
      expect(migration).toContain(`CREATE TABLE "${model}"`);
    }

    expect(authoritySchema).toMatch(
      /enum MembershipLifecycle \{[\s\S]*PENDING[\s\S]*ACTIVE[\s\S]*SUSPENDED[\s\S]*REVOKED[\s\S]*\}/,
    );
    expect(authoritySchema).toMatch(
      /enum TenantRole \{[\s\S]*TENANT_ADMIN[\s\S]*PARENT_MANAGER[\s\S]*\}/,
    );
    expect(authoritySchema).toMatch(
      /enum SiteRole \{[\s\S]*SITE_ADMIN[\s\S]*EDITOR[\s\S]*USER[\s\S]*\}/,
    );
    expect(authoritySchema).toMatch(
      /enum PlatformRole \{[\s\S]*PLATFORM_ADMIN[\s\S]*\}/,
    );
  });

  it("keeps generation internal behind an immutable HMAC-shaped epoch ref", () => {
    const epoch = authoritySchema.match(
      /model MembershipEpoch \{([\s\S]*?)^\}/m,
    )?.[1];

    expect(epoch).toMatch(/^\s*generation\s+Int\s*$/m);
    expect(epoch).toMatch(
      /^\s*membershipEpochRef\s+String\s+@unique\s+@db\.VarChar\(48\)/m,
    );
    expect(migration).toContain('"membershipEpochRef" ~ \'^meg1_');
    expect(migration).toContain("MembershipEpoch_generation_check");
    expect(migration).toContain("MembershipEpoch_membershipEpochRef_key");
    expect(migration).toContain("authority_membership_epoch_immutable");
    expect(migration).not.toMatch(/plain hash|sha256\([^)]*generation/i);
  });

  it("enforces same-scope, current-epoch, lifecycle, and retained-history rules", () => {
    for (const evidence of [
      "Membership_tenantId_userId_key",
      "Membership_currentEpochId_id_fkey",
      "MembershipEpoch_membershipId_generation_key",
      "TenantRoleGrant_one_active_epoch_key",
      "SiteRoleGrant_one_active_epoch_site_key",
      "SiteRoleGrant_siteId_tenantId_fkey",
      "PlatformGrant_one_active_user_role_key",
      "authority_site_role_grant_membership_scope_mismatch",
      "authority_active_grant_not_current",
      "authority_membership_reinvite_requires_new_epoch",
      "authority_membership_epoch_retained",
    ]) {
      expect(migration).toContain(evidence);
    }

    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).toMatch(
      /REVOKE DELETE ON TABLE[\s\S]*"Membership"[\s\S]*"MembershipEpoch"[\s\S]*"SiteRoleGrant"[\s\S]*FROM nebula_authority_runtime/,
    );
  });
});
