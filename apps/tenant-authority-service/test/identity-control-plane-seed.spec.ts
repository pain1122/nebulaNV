import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { PrismaClient } from "../prisma/generated/client";
import type { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { DEFAULT_DEVELOPMENT_AUTHORITY } from "../src/authority/default-development-authority.manifest";
import { seedIdentityControlPlane } from "../src/authority/identity-control-plane.seed";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : entry.isFile() && entry.name.endsWith(".ts")
        ? [path]
        : [];
  });
}

describe("inactive identity control-plane seed", () => {
  it("freezes two realms, two providers, four policies, and five trusts", () => {
    const control = DEFAULT_DEVELOPMENT_AUTHORITY.identityControlPlane;

    expect(Object.values(control.realms)).toHaveLength(2);
    expect(Object.values(control.providers)).toHaveLength(2);
    expect(Object.values(control.policies)).toHaveLength(4);
    expect(Object.values(control.trusts)).toHaveLength(5);
    expect(
      Object.values(control.realms).every(
        (realm) => UUID_V4.test(realm.id) && UUID_V4.test(realm.authRouteRef),
      ),
    ).toBe(true);
    expect(
      Object.values(control.providers).every(
        (provider) =>
          UUID_V4.test(provider.id) &&
          provider.issuerReference.startsWith("urn:nebula:local:") &&
          !provider.issuerReference.includes("://"),
      ),
    ).toBe(true);
    expect(
      Object.values(control.policies).every(
        (policy) =>
          UUID_V4.test(policy.id) &&
          policy.audience.startsWith("urn:nebula:application:") &&
          !policy.audience.includes("*"),
      ),
    ).toBe(true);
  });

  it("is create-only, serializable, audited/outboxed, and production-refusing", async () => {
    const source = readFileSync(
      join(process.cwd(), "src/authority/identity-control-plane.seed.ts"),
      "utf8",
    );

    expect(source).toContain('isolationLevel: "Serializable"');
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("appendAuthorityAuditEvent");
    expect(source).toContain("authorityInvalidationOutbox.createMany");
    expect(source).toContain("identity_control_plane_seed_conflict");
    expect(source).not.toMatch(
      /\.(?:upsert|update|updateMany|delete|deleteMany)\(/,
    );

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const transaction = jest.fn();
    await expect(
      seedIdentityControlPlane(
        { $transaction: transaction } as unknown as PrismaClient,
        {} as AuthorityAuditSigner,
      ),
    ).rejects.toThrow("identity_control_plane_seed_refused_in_production");
    expect(transaction).not.toHaveBeenCalled();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("fails closed on partial state before writing any R1 record", async () => {
    const createMany = jest.fn();
    const transaction = jest.fn(
      async (work: (tx: unknown) => Promise<unknown>) =>
        work({
          $queryRaw: jest.fn(),
          identityRealm: {
            findMany: jest.fn().mockResolvedValue([{ id: "partial" }]),
            createMany,
          },
          identityProviderRegistration: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany,
          },
          applicationIdentityPolicy: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany,
          },
          federationTrust: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany,
          },
          authorityInvalidationOutbox: {
            findMany: jest.fn().mockResolvedValue([]),
            createMany,
          },
          authorityAuditEvent: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        }),
    );
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    await expect(
      seedIdentityControlPlane(
        { $transaction: transaction } as unknown as PrismaClient,
        {} as AuthorityAuditSigner,
      ),
    ).rejects.toThrow("identity_control_plane_seed_conflict");
    expect(createMany).not.toHaveBeenCalled();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("has no runtime reader, controller, route, or module wiring", () => {
    const authoritySource = join(process.cwd(), "src");
    const allowedEvidenceFiles = new Set([
      "authority-audit.repository.ts",
      "default-actor-backfill.ts",
      "default-development-authority.manifest.ts",
      "identity-control-plane.seed.ts",
    ]);
    const runtime = sourceFiles(authoritySource)
      .filter((path) => !allowedEvidenceFiles.has(basename(path)))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(runtime).not.toMatch(
      /IdentityRealm|IdentityProviderRegistration|ApplicationIdentityPolicy|FederationTrust|identityRealm|identityProviderRegistration|applicationIdentityPolicy|federationTrust/,
    );
  });
});
