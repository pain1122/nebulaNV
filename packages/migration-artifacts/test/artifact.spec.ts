import { randomUUID } from "node:crypto";
import {
  migrationKeyFromBase64url,
  openMigrationArtifact,
  sealMigrationArtifact,
} from "../src";

const destinationRealmId = "b1000000-0000-4000-8000-000000000001";
const destinationKey = migrationKeyFromBase64url(
  "b5000000-0000-4000-8000-000000000004",
  Buffer.alloc(32, 1).toString("base64url"),
);
const recordHmacKey = migrationKeyFromBase64url(
  "d1000000-0000-4000-8000-000000000001",
  Buffer.alloc(32, 2).toString("base64url"),
);
const now = new Date("2026-09-09T10:00:00.000Z");

function sealed() {
  return sealMigrationArtifact({
    sourceOwner: "USER_SERVICE",
    migrationId: randomUUID(),
    destinationRealmId,
    destinationKey,
    recordHmacKey,
    sourceCreatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 300_000).toISOString(),
    nonce: Buffer.alloc(12, 3),
    records: [
      {
        kind: "USER_CREDENTIAL",
        sourceId: "e1000000-0000-4000-8000-000000000001",
        body: {
          subjectId: "e1000000-0000-4000-8000-000000000001",
          revision: "1",
        },
      },
    ],
  });
}

describe("migration artifacts", () => {
  it("round-trips one canonical, destination-bound artifact", () => {
    const created = sealed();
    const opened = openMigrationArtifact(created.serialized, {
      expectedSourceOwner: "USER_SERVICE",
      expectedDestinationRealmId: destinationRealmId,
      destinationKey,
      recordHmacKey,
      now,
    });
    expect(opened).toEqual(created.opened);
    expect(created.serialized.endsWith("\n")).toBe(true);
  });

  it("rejects tamper, wrong destination keys, and expiry", () => {
    const created = sealed();
    const parsed = JSON.parse(created.serialized) as { ciphertext: string };
    parsed.ciphertext = `${parsed.ciphertext.slice(0, -1)}A`;
    expect(() =>
      openMigrationArtifact(JSON.stringify(parsed), {
        expectedSourceOwner: "USER_SERVICE",
        expectedDestinationRealmId: destinationRealmId,
        destinationKey,
        recordHmacKey,
        now,
      }),
    ).toThrow("migration_artifact_authentication_failed");
    expect(() =>
      openMigrationArtifact(created.serialized, {
        expectedSourceOwner: "USER_SERVICE",
        expectedDestinationRealmId: destinationRealmId,
        destinationKey: migrationKeyFromBase64url(
          "b5000000-0000-4000-8000-000000000004",
          Buffer.alloc(32, 9).toString("base64url"),
        ),
        recordHmacKey,
        now,
      }),
    ).toThrow("migration_artifact_authentication_failed");
    expect(() =>
      openMigrationArtifact(created.serialized, {
        expectedSourceOwner: "USER_SERVICE",
        expectedDestinationRealmId: destinationRealmId,
        destinationKey,
        recordHmacKey,
        now: new Date(now.getTime() + 400_000),
      }),
    ).toThrow("migration_artifact_expired");
  });

  it("rejects duplicate records and bounded lifetime/record limits", () => {
    const base = {
      kind: "USER_CREDENTIAL",
      sourceId: "e1000000-0000-4000-8000-000000000001",
      body: { subjectId: "e1000000-0000-4000-8000-000000000001" },
    } as const;
    expect(() =>
      sealMigrationArtifact({
        sourceOwner: "USER_SERVICE",
        migrationId: randomUUID(),
        destinationRealmId,
        destinationKey,
        recordHmacKey,
        sourceCreatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 300_000).toISOString(),
        records: [base, base],
      }),
    ).toThrow("migration_artifact_record_duplicate");
    expect(() =>
      sealMigrationArtifact({
        sourceOwner: "USER_SERVICE",
        migrationId: randomUUID(),
        destinationRealmId,
        destinationKey,
        recordHmacKey,
        sourceCreatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 901_000).toISOString(),
        records: [],
      }),
    ).toThrow("migration_artifact_lifetime_invalid");
  });
});
