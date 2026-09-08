import { readFileSync } from "node:fs";
import path from "node:path";
import { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { RegistrationMutationRepository } from "../src/authority/registration-mutation.repository";
import { RegistrationMutationService } from "../src/authority/registration-mutation.service";
import { RegistrationMutationDeniedError } from "../src/authority/registration-mutation.types";

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
    "20260826000100_authority_registration_audit",
    "migration.sql",
  ),
  "utf8",
);

describe("auditable registration mutation foundation", () => {
  it("adds only retained handles, invalidation outbox, and append-only audit", () => {
    for (const model of [
      "ApplicationClientHandle",
      "AuthorityInvalidationOutbox",
      "AuthorityAuditEvent",
    ]) {
      expect(schema).toMatch(new RegExp(`model ${model} \\{`));
      expect(migration).toContain(`CREATE TABLE "${model}"`);
    }
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(
      /CREATE TABLE "(?:Membership|TenantRoleGrant|SiteRoleGrant|PlatformGrant)"/,
    );
  });

  it("enforces handle tombstones, immutable outbox identity, and audit append-only", () => {
    for (const evidence of [
      "ApplicationClientHandle_handle_key",
      "authority_client_handle_tombstone_terminal",
      "AuthorityInvalidationOutbox_aggregate_revision_key",
      "authority_outbox_event_immutable",
      "AuthorityAuditEvent_partition_sequence_key",
      "authority_audit_event_append_only",
      'REVOKE UPDATE ON TABLE "AuthorityAuditEvent"',
    ]) {
      expect(migration).toContain(evidence);
    }
  });

  it("keeps all three state changes in one transaction with audit and outbox", () => {
    const source = readFileSync(
      path.join(
        serviceRoot,
        "src",
        "authority",
        "registration-mutation.repository.ts",
      ),
      "utf8",
    );
    expect(source.match(/this\.prisma\.\$transaction/g)).toHaveLength(3);
    expect(source.match(/this\.appendAudit\(tx/g)).toHaveLength(8);
    expect(source.match(/this\.appendOutbox\(tx/g)).toHaveLength(3);
    const auditSource = readFileSync(
      path.join(
        serviceRoot,
        "src",
        "authority",
        "authority-audit.repository.ts",
      ),
      "utf8",
    );
    expect(source).toContain("appendAuthorityAuditEvent");
    expect(auditSource).toContain("pg_advisory_xact_lock");
    expect(source).not.toContain("tenantId: input.tenantId,\n        data:");
  });

  it("creates deterministic tamper-evident hashes without storing the key", () => {
    const previous = {
      AUTHORITY_AUDIT_HMAC_KEY_ID: process.env.AUTHORITY_AUDIT_HMAC_KEY_ID,
      AUTHORITY_AUDIT_HMAC_KEY: process.env.AUTHORITY_AUDIT_HMAC_KEY,
    };
    process.env.AUTHORITY_AUDIT_HMAC_KEY_ID = "audit-test-v1";
    process.env.AUTHORITY_AUDIT_HMAC_KEY =
      "audit-test-secret-000000000000000001";
    try {
      const signer = new AuthorityAuditSigner();
      const first = signer.sign({ b: 2, a: 1 });
      expect(first).toBe(signer.sign({ a: 1, b: 2 }));
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(schema).not.toContain("auditHmacKey");
    } finally {
      if (previous.AUTHORITY_AUDIT_HMAC_KEY_ID === undefined)
        delete process.env.AUTHORITY_AUDIT_HMAC_KEY_ID;
      else
        process.env.AUTHORITY_AUDIT_HMAC_KEY_ID =
          previous.AUTHORITY_AUDIT_HMAC_KEY_ID;
      if (previous.AUTHORITY_AUDIT_HMAC_KEY === undefined)
        delete process.env.AUTHORITY_AUDIT_HMAC_KEY;
      else
        process.env.AUTHORITY_AUDIT_HMAC_KEY =
          previous.AUTHORITY_AUDIT_HMAC_KEY;
    }
  });

  it("validates input and surfaces repository denials with stable reasons", async () => {
    const repository = {
      createPendingApplication: jest.fn().mockResolvedValue({
        ok: false,
        reasonCode: "SCOPE_MISMATCH",
      }),
    } as unknown as RegistrationMutationRepository;
    const service = new RegistrationMutationService(repository);

    await expect(
      service.createPendingApplication(
        { requestId: "registration-test" },
        {
          tenantId: "10000000-0000-4000-8000-000000000001",
          siteId: "20000000-0000-4000-8000-000000000001",
          channelId: "30000000-0000-4000-8000-000000000001",
          displayName: "Test app",
          profile: "storefront-web",
        },
      ),
    ).rejects.toMatchObject<Partial<RegistrationMutationDeniedError>>({
      reasonCode: "SCOPE_MISMATCH",
    });
  });
});
