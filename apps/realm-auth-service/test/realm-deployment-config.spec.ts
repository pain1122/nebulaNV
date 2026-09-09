import { envSchema } from "../src/config/env.validation";
import {
  REALM_AUTH_DEPLOYMENTS,
  realmAuthDeployment,
} from "../src/config/realm-deployments";

function envFor(name: "DEFAULT" | "OPERATOR") {
  const deployment = REALM_AUTH_DEPLOYMENTS[name];
  return {
    NODE_ENV: "test",
    REALM_AUTH_DEPLOYMENT: name,
    REALM_AUTH_IDENTITY_REALM_ID: deployment.identityRealmId,
    REALM_AUTH_ROUTE_REF: deployment.authRouteRef,
    REALM_AUTH_ISSUER: deployment.issuer,
    REALM_AUTH_REDIS_URL:
      name === "DEFAULT"
        ? "redis://127.0.0.1:6381/0"
        : "redis://127.0.0.1:6382/0",
    DATABASE_URL: `postgresql://${deployment.runtimeRole}:strong_runtime_password_123456789@127.0.0.1:15432/${deployment.databaseName}?schema=public`,
  };
}

describe("realm Auth deployment configuration", () => {
  it.each(["DEFAULT", "OPERATOR"] as const)(
    "accepts only the frozen %s tuple",
    (name) => {
      expect(envSchema.validate(envFor(name)).error).toBeUndefined();
    },
  );

  it("keeps database, runtime role, route, issuer, port, and every key ID isolated", () => {
    const values = [
      REALM_AUTH_DEPLOYMENTS.DEFAULT,
      REALM_AUTH_DEPLOYMENTS.OPERATOR,
    ] as const;
    for (const select of [
      (item: (typeof values)[number]) => item.identityRealmId,
      (item: (typeof values)[number]) => item.authRouteRef,
      (item: (typeof values)[number]) => item.databaseName,
      (item: (typeof values)[number]) => item.runtimeRole,
      (item: (typeof values)[number]) => item.issuer,
      (item: (typeof values)[number]) => item.defaultHttpPort,
    ]) {
      expect(new Set(values.map(select))).toHaveProperty("size", values.length);
    }
    const registrations = values.flatMap((item) => [
      item.keyRegistrations.jwtSigning,
      item.keyRegistrations.sessionReference,
      item.keyRegistrations.legacySessionBridge,
      item.keyRegistrations.artifactDecryption,
      item.keyRegistrations.migrationIntegrity,
      item.keyRegistrations.auditIntegrity,
    ]);
    const keyIds = registrations.map(([id]) => id);
    const keyReferences = registrations.map(([, reference]) => reference);
    expect(new Set(keyIds)).toHaveProperty("size", keyIds.length);
    expect(new Set(keyReferences)).toHaveProperty("size", keyReferences.length);
  });

  it.each([
    [
      "realm",
      {
        REALM_AUTH_IDENTITY_REALM_ID:
          REALM_AUTH_DEPLOYMENTS.OPERATOR.identityRealmId,
      },
    ],
    [
      "route",
      { REALM_AUTH_ROUTE_REF: REALM_AUTH_DEPLOYMENTS.OPERATOR.authRouteRef },
    ],
    ["issuer", { REALM_AUTH_ISSUER: REALM_AUTH_DEPLOYMENTS.OPERATOR.issuer }],
    [
      "database",
      {
        DATABASE_URL:
          "postgresql://nebula_realm_auth_operator_runtime:strong_runtime_password_123456789@127.0.0.1:15432/nebula_realm_auth_operator?schema=public",
      },
    ],
    [
      "shared Redis database",
      { REALM_AUTH_REDIS_URL: "redis://127.0.0.1:6381/1" },
    ],
    [
      "wrong Redis protocol",
      { REALM_AUTH_REDIS_URL: "https://127.0.0.1:6381/0" },
    ],
  ])("rejects a crossed or invalid %s", (_label, change) => {
    expect(
      envSchema.validate({ ...envFor("DEFAULT"), ...change }).error,
    ).toBeDefined();
  });

  it("fails an unknown deployment name", () => {
    expect(() => realmAuthDeployment("customer-input")).toThrow(
      "realm_auth_deployment_invalid",
    );
  });
});
