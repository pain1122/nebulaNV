import { createHmac } from "node:crypto";
import {
  migrationKeyFromBase64url,
  sealMigrationArtifact,
} from "@nebula/migration-artifacts";
import {
  buildF4R3ShadowImportPlan,
  importF4R3ShadowArtifacts,
  legacySessionBridgeFingerprint,
} from "../src/migration/f4-r3-shadow-import";
import type { PrismaClient } from "../prisma/generated/client";

const realmId = "b1000000-0000-4000-8000-000000000001";
const migrationId = "e2000000-0000-4000-8000-000000000001";
const subjectId = "e1000000-0000-4000-8000-000000000001";
const destinationKey = migrationKeyFromBase64url(
  "b5000000-0000-4000-8000-000000000004",
  Buffer.alloc(32, 1).toString("base64url"),
);
const userKey = migrationKeyFromBase64url(
  "d1000000-0000-4000-8000-000000000001",
  Buffer.alloc(32, 2).toString("base64url"),
);
const authKey = migrationKeyFromBase64url(
  "d1000000-0000-4000-8000-000000000002",
  Buffer.alloc(32, 3).toString("base64url"),
);
const bridgeKey = migrationKeyFromBase64url(
  "b5000000-0000-4000-8000-000000000003",
  Buffer.alloc(32, 4).toString("base64url"),
);
const now = new Date("2026-09-09T12:00:00.000Z");

function artifacts(
  overrides: {
    authMigrationId?: string;
    authSubjectId?: string;
    familyExpiresAt?: string;
  } = {},
) {
  const common = {
    destinationRealmId: realmId,
    destinationKey,
    sourceCreatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 300_000).toISOString(),
  };
  const user = sealMigrationArtifact({
    ...common,
    sourceOwner: "USER_SERVICE",
    migrationId,
    recordHmacKey: userKey,
    records: [
      {
        kind: "USER_CREDENTIAL",
        sourceId: subjectId,
        body: {
          subjectId,
          principalClass: "CONSUMER",
          lifecycle: "PROVISIONING",
          credentialGeneration: "1",
          sourceRevision: "2026-09-09T11:59:00.000Z",
          sourceCreatedAt: "2026-09-01T00:00:00.000Z",
          quarantinedIdentifierCount: 0,
          identifiers: [
            {
              id: "e3000000-0000-4000-8000-000000000001",
              kind: "EMAIL",
              normalizationVersion: "EMAIL_LOWER_TRIM_V1",
              normalizedValue: "user@example.test",
              state: "ACTIVE",
              revision: "1",
            },
          ],
          credential: {
            passwordHash: `$2b$10$${"a".repeat(53)}`,
            algorithm: "BCRYPT",
            parameters: { cost: 10 },
            revision: "1",
            changedAt: "2026-09-09T11:59:00.000Z",
          },
        },
      },
    ],
  }).opened;
  const authSubjectId = overrides.authSubjectId ?? subjectId;
  const auth = sealMigrationArtifact({
    ...common,
    sourceOwner: "AUTH_SERVICE",
    migrationId: overrides.authMigrationId ?? migrationId,
    recordHmacKey: authKey,
    records: [
      {
        kind: "AUTH_SUBJECT",
        sourceId: authSubjectId,
        body: {
          subjectId: authSubjectId,
          sessionGeneration: "7",
          generationSource: "CURRENT_TOKEN_VERSION",
          disabled: false,
          sourceTime: now.toISOString(),
          familyQuarantineCounts: {
            missingOrUnbounded: 0,
            issuedVersionMissingOrInvalid: 0,
            versionMismatch: 0,
            tokenEvidenceInvalid: 0,
          },
          families: [
            {
              legacySessionId: "e4000000-0000-4000-8000-000000000001",
              tokenHash: "a".repeat(64),
              tokenId: "e5000000-0000-4000-8000-000000000001",
              expiresAt:
                overrides.familyExpiresAt ??
                new Date(now.getTime() + 60_000).toISOString(),
            },
          ],
        },
      },
    ],
  }).opened;
  return { user, auth };
}

describe("F4 R3 shadow import", () => {
  it("pairs source records before assigning initial generations", () => {
    const plan = buildF4R3ShadowImportPlan({ ...artifacts(), now });
    expect(plan.subjects).toHaveLength(1);
    expect(plan.subjects[0]).toMatchObject({
      subjectId,
      credentialGeneration: 1n,
      sessionGeneration: 7n,
      lifecycle: "PROVISIONING",
      identifiers: [{ normalizedValue: "user@example.test" }],
      families: [{ legacySessionId: "e4000000-0000-4000-8000-000000000001" }],
    });
  });

  it("rejects crossed migrations, orphan subjects, and expired families", () => {
    expect(() =>
      buildF4R3ShadowImportPlan({
        ...artifacts({
          authMigrationId: "e2000000-0000-4000-8000-000000000002",
        }),
        now,
      }),
    ).toThrow("f4_r3_shadow_import_manifest_pair_invalid");
    expect(() =>
      buildF4R3ShadowImportPlan({
        ...artifacts({
          authSubjectId: "e1000000-0000-4000-8000-000000000002",
        }),
        now,
      }),
    ).toThrow("f4_r3_shadow_import_subject_set_mismatch");
    expect(() =>
      buildF4R3ShadowImportPlan({
        ...artifacts({ familyExpiresAt: now.toISOString() }),
        now,
      }),
    ).toThrow("f4_r3_shadow_import_family_invalid_or_expired");
  });

  it("uses the frozen full HMAC bridge shape", () => {
    const actual = legacySessionBridgeFingerprint({
      key: bridgeKey,
      identityRealmId: realmId,
      subjectId,
      legacySessionId: "e4000000-0000-4000-8000-000000000001",
    });
    const expected = `lsb1_${createHmac("sha256", bridgeKey.bytes)
      .update(
        JSON.stringify([
          "nebula-legacy-session-bridge",
          "1",
          bridgeKey.id,
          realmId,
          subjectId,
          "e4000000-0000-4000-8000-000000000001",
        ]),
      )
      .digest("base64url")}`;
    expect(actual).toBe(expected);
    expect(actual).toMatch(/^lsb1_[A-Za-z0-9_-]{43}$/);
  });

  it("retries the exact Prisma serialization conflict", async () => {
    const conflict = Object.assign(new Error("transaction conflict"), {
      code: "P2034",
    });
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce({ status: "ALREADY_CURRENT", subjectCount: 1 });
    const result = await importF4R3ShadowArtifacts(
      { $transaction: transaction } as unknown as PrismaClient,
      { ...artifacts(), bridgeKey, now },
    );
    expect(result).toEqual({ status: "ALREADY_CURRENT", subjectCount: 1 });
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
