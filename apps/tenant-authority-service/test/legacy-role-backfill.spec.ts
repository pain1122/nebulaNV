import {
  parseDefaultDevelopmentRoleFixture,
  parseLegacyRoleAuditManifest,
} from "../src/authority/legacy-role-backfill";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const ROOT_ID = "33333333-3333-4333-8333-333333333333";

function readyManifest() {
  return {
    compatibilityMode: "LEGACY_PRIMARY",
    backfillStatus: "READY",
    totalUsers: 3,
    roleCounts: { user: 1, admin: 1, "root-admin": 1, INVALID: 0 },
    candidates: [
      { userId: USER_ID, decision: { sourceRole: "user", siteRole: "USER" } },
      {
        userId: ADMIN_ID,
        decision: { sourceRole: "admin", siteRole: "SITE_ADMIN" },
      },
      {
        userId: ROOT_ID,
        decision: {
          sourceRole: "root-admin",
          platformRole: "PLATFORM_ADMIN",
          tenantRole: "TENANT_ADMIN",
        },
      },
    ],
    invalidRoles: [],
    invalidUserIds: [],
    blockers: [],
  };
}

describe("legacy role backfill manifest", () => {
  it("accepts only the exact ready User-owner export", () => {
    expect(parseLegacyRoleAuditManifest(readyManifest())).toEqual([
      { userId: USER_ID, sourceRole: "user" },
      { userId: ADMIN_ID, sourceRole: "admin" },
      { userId: ROOT_ID, sourceRole: "root-admin" },
    ]);
  });

  it.each([
    ["blocked audit", { backfillStatus: "BLOCKED" }],
    ["supplied blocker", { blockers: ["INVALID_LEGACY_ROLE"] }],
    ["count mismatch", { totalUsers: 2 }],
    ["invalid records", { invalidRoles: [{ valueSha256: "a".repeat(64) }] }],
  ])("rejects %s", (_name, replacement) => {
    expect(() =>
      parseLegacyRoleAuditManifest({ ...readyManifest(), ...replacement }),
    ).toThrow();
  });

  it("rejects a forged privilege mapping", () => {
    const manifest = readyManifest();
    manifest.candidates[0] = {
      userId: USER_ID,
      decision: {
        sourceRole: "root-admin",
        platformRole: "PLATFORM_ADMIN",
        tenantRole: "TENANT_ADMIN",
      },
    };
    expect(() => parseLegacyRoleAuditManifest(manifest)).toThrow(
      "legacy_role_audit_count_mismatch",
    );
  });
});

describe("default development role fixture", () => {
  const fixture = {
    version: 1,
    rootAdminUserId: ROOT_ID,
    siteAdminUserId: ADMIN_ID,
    editorUserId: "44444444-4444-4444-8444-444444444444",
    userId: USER_ID,
  } as const;

  it("accepts four distinct exact UUIDv4 identities", () => {
    expect(parseDefaultDevelopmentRoleFixture(fixture)).toEqual(fixture);
  });

  it("rejects identity reuse and malformed IDs", () => {
    expect(() =>
      parseDefaultDevelopmentRoleFixture({
        ...fixture,
        editorUserId: fixture.userId,
      }),
    ).toThrow("default_role_fixture_users_must_be_distinct");
    expect(() =>
      parseDefaultDevelopmentRoleFixture({
        ...fixture,
        editorUserId: "not-a-user-id",
      }),
    ).toThrow("default_role_fixture_user_id_invalid");
  });
});
