import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    root,
    "prisma/migrations/20260908000100_realm_auth_shadow_foundation/migration.sql",
  ),
  "utf8",
);

describe("Realm Auth shadow foundation", () => {
  it.each([
    "RealmBoundary",
    "RealmKeyRegistration",
    "RealmSubject",
    "LoginIdentifier",
    "LocalCredential",
    "ExternalIdentityLink",
    "AuthSession",
    "LegacySessionBridge",
    "RootSsoExchangeGrant",
    "AuthAuditEvent",
    "AuthOutboxEvent",
    "MigrationManifest",
    "MigrationRecordReceipt",
  ])("declares durable %s storage", (model) => {
    expect(schema).toContain(`model ${model} {`);
    expect(migration).toContain(`CREATE TABLE "public"."${model}"`);
  });

  it("enforces fixed-realm shadow boundaries in the database", () => {
    expect(migration).toContain("realm_auth_wrong_realm");
    expect(migration).toContain("realm_auth_principal_class_mismatch");
    expect(migration).toContain("realm_auth_shadow_session_forbidden");
    expect(migration).toContain(
      "realm_auth_shadow_generation_change_forbidden",
    );
    expect(migration).toContain(
      "realm_auth_shadow_credential_mutation_forbidden",
    );
    expect(migration).toContain("LoginIdentifier_boundary_shadow_guard");
    expect(migration).toContain("LocalCredential_boundary_shadow_guard");
    expect(migration).toContain("RealmBoundary_singleton_check");
    expect(migration).toContain("IF TG_TABLE_NAME = 'RealmSubject' THEN");
    expect(migration).not.toMatch(/TG_TABLE_NAME = '[^']+'\s+AND\s+NEW\./);
  });

  it("freezes references, terminal records, and import idempotency", () => {
    expect(migration).toContain("realm_auth_session_identity_immutable");
    expect(migration).toContain("realm_auth_legacy_bridge_identity_immutable");
    expect(migration).toContain("realm_auth_terminal_record_immutable");
    expect(migration).toContain("realm_auth_audit_append_only");
    expect(schema).toContain(
      "@@unique([sourceOwner, migrationId, recordHmac])",
    );
    expect(migration).toContain("realm_auth_import_receipt_immutable");
    expect(schema).toContain("ROLLED_BACK");
    expect(schema).toContain("rolledBackAt");
    expect(migration).toContain("realm_auth_rollback_requires_shadow");
    expect(migration).toContain("realm_auth_rollback_subject_exists");
  });

  it("uses the exact frozen reference shapes and dedicated key purposes", () => {
    expect(migration).toContain("^sr2_[A-Za-z0-9_-]{43}$");
    expect(migration).toContain("^lsb1_[A-Za-z0-9_-]{43}$");
    expect(migration).toContain("realm_auth_session_reference_key_invalid");
    expect(migration).toContain("realm_auth_legacy_bridge_key_invalid");
  });

  it("keeps credentials and raw token values out of bridge and audit columns", () => {
    const bridge = schema.slice(
      schema.indexOf("model LegacySessionBridge"),
      schema.indexOf("model RootSsoExchangeGrant"),
    );
    const audit = schema.slice(
      schema.indexOf("model AuthAuditEvent"),
      schema.indexOf("model AuthOutboxEvent"),
    );
    expect(bridge).not.toMatch(
      /password|email|phone|rawToken|legacySessionId/i,
    );
    expect(audit).not.toMatch(/password|email|phone|rawToken|refreshToken/i);
  });
});
