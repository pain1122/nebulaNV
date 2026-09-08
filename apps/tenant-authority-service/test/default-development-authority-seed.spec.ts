import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "../prisma/generated/client";
import type { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { DEFAULT_DEVELOPMENT_AUTHORITY } from "../src/authority/default-development-authority.manifest";
import { seedDefaultDevelopmentAuthority } from "../src/authority/default-development-authority.seed";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("default development authority seed", () => {
  it("freezes unique opaque topology and application identifiers", () => {
    const applications = Object.values(
      DEFAULT_DEVELOPMENT_AUTHORITY.applications,
    );
    const control = DEFAULT_DEVELOPMENT_AUTHORITY.identityControlPlane;
    const controlPlaneIdentifiers = [
      ...Object.values(control.realms).flatMap((realm) => [
        realm.id,
        realm.authRouteRef,
      ]),
      ...Object.values(control.providers).map((provider) => provider.id),
      ...Object.values(control.policies).map((policy) => policy.id),
      ...Object.values(control.trusts),
    ];
    const identifiers = [
      DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
      DEFAULT_DEVELOPMENT_AUTHORITY.site.id,
      ...Object.values(DEFAULT_DEVELOPMENT_AUTHORITY.channels),
      ...applications.flatMap((application) => [
        application.id,
        application.clientId,
      ]),
      ...controlPlaneIdentifiers,
    ];

    expect(identifiers).toHaveLength(new Set(identifiers).size);
    expect(identifiers.every((identifier) => UUID_V4.test(identifier))).toBe(
      true,
    );
    expect(Object.keys(DEFAULT_DEVELOPMENT_AUTHORITY.channels)).toEqual([
      "web",
      "android",
      "ios",
    ]);
    expect(control.version).toBe(1);
  });

  it("preserves only unambiguous F3 aliases and separates native platforms", () => {
    const serialized = JSON.stringify(DEFAULT_DEVELOPMENT_AUTHORITY);

    expect(serialized).toContain("storefront-web-local");
    expect(serialized).toContain("admin-web-local");
    expect(serialized).toContain("mobile-android-local");
    expect(serialized).toContain("mobile-ios-local");
    expect(serialized).not.toContain('"mobile-local"');
    expect(
      DEFAULT_DEVELOPMENT_AUTHORITY.applications.android.clientId,
    ).not.toBe(DEFAULT_DEVELOPMENT_AUTHORITY.applications.ios.clientId);
  });

  it("uses a create-only atomic audited seed and refuses production", async () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/authority/default-development-authority.seed.ts",
      ),
      "utf8",
    );
    expect(source).toContain('isolationLevel: "Serializable"');
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("appendAuthorityAuditEvent");
    expect(source).toContain("authorityInvalidationOutbox.createMany");
    expect(source).toContain("default_development_authority_seed_conflict");
    expect(source).not.toMatch(
      /\.(?:upsert|update|updateMany|delete|deleteMany)\(/,
    );

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const transaction = jest.fn();
    await expect(
      seedDefaultDevelopmentAuthority(
        { $transaction: transaction } as unknown as PrismaClient,
        {} as AuthorityAuditSigner,
      ),
    ).rejects.toThrow("development_authority_seed_refused_in_production");
    expect(transaction).not.toHaveBeenCalled();
    process.env.NODE_ENV = previousNodeEnv;
  });
});
