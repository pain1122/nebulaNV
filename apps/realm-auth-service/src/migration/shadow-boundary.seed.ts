import type {
  Prisma,
  PrismaClient,
  RealmKeyPurpose,
} from "../../prisma/generated/client";
import {
  realmAuthDeployment,
  type RealmAuthDeploymentName,
} from "../config/realm-deployments";

const SEED_LOCK = "realm-auth:shadow-boundary:v1";

export type ShadowBoundarySeedResult = "CREATED" | "ALREADY_CURRENT";

export function expectedShadowBoundary(name: RealmAuthDeploymentName) {
  const deployment = realmAuthDeployment(name);
  const keyRegistrations: ReadonlyArray<
    readonly [RealmKeyPurpose, readonly [string, string]]
  > = [
    ["JWT_SIGNING", deployment.keyRegistrations.jwtSigning],
    ["SESSION_REFERENCE", deployment.keyRegistrations.sessionReference],
    ["LEGACY_SESSION_BRIDGE", deployment.keyRegistrations.legacySessionBridge],
    ["ARTIFACT_DECRYPTION", deployment.keyRegistrations.artifactDecryption],
    ["MIGRATION_INTEGRITY", deployment.keyRegistrations.migrationIntegrity],
    ["AUDIT_INTEGRITY", deployment.keyRegistrations.auditIntegrity],
  ];
  return {
    boundary: {
      singleton: true,
      identityRealmId: deployment.identityRealmId,
      authRouteRef: deployment.authRouteRef,
      kind: deployment.kind,
      principalClass: deployment.principalClass,
      issuer: deployment.issuer,
      lifecycle: "PROVISIONING",
      admissionMode: "SHADOW",
    } satisfies Prisma.RealmBoundaryCreateInput,
    keys: keyRegistrations.map(([purpose, registration]) => {
      const [id, keyReference] = registration;
      return {
        id,
        identityRealmId: deployment.identityRealmId,
        purpose,
        keyReference,
      };
    }) satisfies Prisma.RealmKeyRegistrationCreateManyInput[],
  };
}

function comparable(value: unknown): string {
  return JSON.stringify(value, (_, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

export async function seedShadowBoundary(
  prisma: PrismaClient,
  name: RealmAuthDeploymentName,
): Promise<ShadowBoundarySeedResult> {
  const expected = expectedShadowBoundary(name);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${SEED_LOCK}, 0))`;
      const [boundaries, keys] = await Promise.all([
        tx.realmBoundary.findMany({
          select: {
            singleton: true,
            identityRealmId: true,
            authRouteRef: true,
            kind: true,
            principalClass: true,
            issuer: true,
            lifecycle: true,
            admissionMode: true,
          },
        }),
        tx.realmKeyRegistration.findMany({
          select: {
            id: true,
            identityRealmId: true,
            purpose: true,
            keyReference: true,
            retiredAt: true,
          },
          orderBy: { id: "asc" },
        }),
      ]);

      if (boundaries.length === 0 && keys.length === 0) {
        await tx.realmBoundary.create({ data: expected.boundary });
        await tx.realmKeyRegistration.createMany({ data: expected.keys });
        return "CREATED";
      }

      const expectedKeys = expected.keys
        .map((key) => ({ ...key, retiredAt: null }))
        .sort((left, right) => left.id.localeCompare(right.id));
      if (
        boundaries.length !== 1 ||
        comparable(boundaries[0]) !== comparable(expected.boundary) ||
        comparable(keys) !== comparable(expectedKeys)
      ) {
        throw new Error("realm_auth_shadow_boundary_conflict");
      }
      return "ALREADY_CURRENT";
    },
    { isolationLevel: "Serializable" },
  );
}
