export const REALM_AUTH_DEPLOYMENTS = Object.freeze({
  DEFAULT: {
    identityRealmId: "b1000000-0000-4000-8000-000000000001",
    authRouteRef: "b1100000-0000-4000-8000-000000000001",
    kind: "LICENSED_ROOT_CONSUMER",
    principalClass: "CONSUMER",
    databaseName: "nebula_realm_auth_default",
    runtimeRole: "nebula_realm_auth_default_runtime",
    issuer: "urn:nebula:realm-auth:b1000000-0000-4000-8000-000000000001",
    defaultHttpPort: 3012,
    keyRegistrations: {
      jwtSigning: [
        "b5000000-0000-4000-8000-000000000001",
        "secret://realm-auth/default/jwt-signing/v1",
      ],
      sessionReference: [
        "b5000000-0000-4000-8000-000000000002",
        "secret://realm-auth/default/session-reference/v1",
      ],
      legacySessionBridge: [
        "b5000000-0000-4000-8000-000000000003",
        "secret://realm-auth/default/legacy-session-bridge/v1",
      ],
      artifactDecryption: [
        "b5000000-0000-4000-8000-000000000004",
        "secret://realm-auth/default/artifact-decryption/v1",
      ],
      migrationIntegrity: [
        "b5000000-0000-4000-8000-000000000005",
        "secret://realm-auth/default/migration-integrity/v1",
      ],
      auditIntegrity: [
        "b5000000-0000-4000-8000-000000000006",
        "secret://realm-auth/default/audit-integrity/v1",
      ],
    },
  },
  OPERATOR: {
    identityRealmId: "b1000000-0000-4000-8000-000000000002",
    authRouteRef: "b1100000-0000-4000-8000-000000000002",
    kind: "PLATFORM_OPERATOR",
    principalClass: "PLATFORM_OPERATOR",
    databaseName: "nebula_realm_auth_operator",
    runtimeRole: "nebula_realm_auth_operator_runtime",
    issuer: "urn:nebula:realm-auth:b1000000-0000-4000-8000-000000000002",
    defaultHttpPort: 3013,
    keyRegistrations: {
      jwtSigning: [
        "b5100000-0000-4000-8000-000000000001",
        "secret://realm-auth/operator/jwt-signing/v1",
      ],
      sessionReference: [
        "b5100000-0000-4000-8000-000000000002",
        "secret://realm-auth/operator/session-reference/v1",
      ],
      legacySessionBridge: [
        "b5100000-0000-4000-8000-000000000003",
        "secret://realm-auth/operator/legacy-session-bridge/v1",
      ],
      artifactDecryption: [
        "b5100000-0000-4000-8000-000000000004",
        "secret://realm-auth/operator/artifact-decryption/v1",
      ],
      migrationIntegrity: [
        "b5100000-0000-4000-8000-000000000005",
        "secret://realm-auth/operator/migration-integrity/v1",
      ],
      auditIntegrity: [
        "b5100000-0000-4000-8000-000000000006",
        "secret://realm-auth/operator/audit-integrity/v1",
      ],
    },
  },
} as const);

export type RealmAuthDeploymentName = keyof typeof REALM_AUTH_DEPLOYMENTS;

export function realmAuthDeployment(name: string | undefined) {
  if (name !== "DEFAULT" && name !== "OPERATOR") {
    throw new Error("realm_auth_deployment_invalid");
  }
  return REALM_AUTH_DEPLOYMENTS[name];
}
