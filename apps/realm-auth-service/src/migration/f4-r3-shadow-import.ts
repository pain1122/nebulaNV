import { createHmac, randomUUID } from "node:crypto";
import type {
  JsonValue,
  MigrationKey,
  MigrationRecord,
  OpenedMigrationArtifact,
} from "@nebula/migration-artifacts";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { REALM_AUTH_DEPLOYMENTS } from "../config/realm-deployments";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const BCRYPT = /^\$2[aby]\$([0-9]{2})\$[./A-Za-z0-9]{53}$/;
const PHONE = /^\+[1-9][0-9]{1,14}$/;
const DEFAULT = REALM_AUTH_DEPLOYMENTS.DEFAULT;
const IMPORT_LOCK = "realm-auth:f4-r3-shadow-import:v1";
const SERIALIZABLE_ATTEMPTS = 3;

type IdentifierPlan = {
  id: string;
  kind: "EMAIL" | "PHONE";
  normalizationVersion: "EMAIL_LOWER_TRIM_V1" | "PHONE_PLUS_DIGITS_V1";
  normalizedValue: string;
  state: "ACTIVE";
  revision: bigint;
};

type FamilyPlan = {
  legacySessionId: string;
  tokenHash: string;
  tokenId: string;
  expiresAt: Date;
};

type SubjectPlan = {
  subjectId: string;
  lifecycle: "PROVISIONING" | "SUSPENDED";
  credentialGeneration: bigint;
  sessionGeneration: bigint;
  identifiers: IdentifierPlan[];
  passwordHash: string;
  credentialParameters: Prisma.InputJsonValue;
  credentialRevision: bigint;
  credentialChangedAt: Date;
  families: FamilyPlan[];
};

export type F4R3ShadowImportPlan = {
  migrationId: string;
  subjects: SubjectPlan[];
  user: OpenedMigrationArtifact;
  auth: OpenedMigrationArtifact;
};

function fail(reason: string): never {
  throw new Error(`f4_r3_shadow_import_${reason}`);
}

function retryableTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function serializableMigrationTransaction<T>(
  prisma: PrismaClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        !retryableTransactionConflict(error) ||
        attempt === SERIALIZABLE_ATTEMPTS
      ) {
        throw error;
      }
    }
  }
  throw new Error("f4_r3_shadow_import_transaction_retry_exhausted");
}

function object(
  value: JsonValue,
  keys: string[],
  label: string,
): Record<string, JsonValue> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...keys].sort().join(",")
  )
    fail(`${label}_invalid`);
  return value as Record<string, JsonValue>;
}

function string(value: JsonValue, label: string): string {
  if (typeof value !== "string") fail(`${label}_invalid`);
  return value;
}

function uuid(value: JsonValue, label: string): string {
  const parsed = string(value, label);
  if (!UUID_V4.test(parsed)) fail(`${label}_invalid`);
  return parsed;
}

function positiveBigInt(value: JsonValue, label: string): bigint {
  const parsed = string(value, label);
  if (!/^[1-9][0-9]*$/.test(parsed)) fail(`${label}_invalid`);
  return BigInt(parsed);
}

function nonnegativeInteger(value: JsonValue, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail(`${label}_invalid`);
  }
  return value;
}

function time(value: JsonValue, label: string): Date {
  const parsed = string(value, label);
  const date = new Date(parsed);
  if (!Number.isSafeInteger(date.getTime()) || date.toISOString() !== parsed) {
    fail(`${label}_invalid`);
  }
  return date;
}

function recordsBySubject(
  artifact: OpenedMigrationArtifact,
  expectedKind: string,
): Map<string, MigrationRecord> {
  const result = new Map<string, MigrationRecord>();
  for (const record of artifact.records) {
    if (record.kind !== expectedKind || result.has(record.sourceId)) {
      fail("record_set_invalid");
    }
    result.set(record.sourceId, record);
  }
  return result;
}

function userPlan(record: MigrationRecord) {
  const body = object(
    record.body,
    [
      "subjectId",
      "principalClass",
      "lifecycle",
      "credentialGeneration",
      "sourceRevision",
      "sourceCreatedAt",
      "identifiers",
      "quarantinedIdentifierCount",
      "credential",
    ],
    "user_record",
  );
  const subjectId = uuid(body.subjectId, "user_subject_id");
  if (
    subjectId !== record.sourceId ||
    body.principalClass !== "CONSUMER" ||
    body.lifecycle !== "PROVISIONING"
  )
    fail("user_subject_binding_invalid");
  const credentialGeneration = positiveBigInt(
    body.credentialGeneration,
    "credential_generation",
  );
  if (credentialGeneration !== 1n) fail("credential_generation_invalid");
  time(body.sourceRevision, "user_source_revision");
  time(body.sourceCreatedAt, "user_source_created_at");
  nonnegativeInteger(
    body.quarantinedIdentifierCount,
    "quarantined_identifier_count",
  );
  if (!Array.isArray(body.identifiers)) fail("identifiers_invalid");
  const identifierIds = new Set<string>();
  const identifiers = body.identifiers.map((value) => {
    const item = object(
      value,
      [
        "id",
        "kind",
        "normalizationVersion",
        "normalizedValue",
        "state",
        "revision",
      ],
      "identifier",
    );
    const id = uuid(item.id, "identifier_id");
    if (identifierIds.has(id)) fail("identifier_duplicate");
    identifierIds.add(id);
    const kind = string(item.kind, "identifier_kind");
    const normalization = string(
      item.normalizationVersion,
      "identifier_normalization",
    );
    const normalizedValue = string(item.normalizedValue, "identifier_value");
    if (
      item.state !== "ACTIVE" ||
      (kind === "EMAIL" &&
        (normalization !== "EMAIL_LOWER_TRIM_V1" ||
          !normalizedValue ||
          normalizedValue.length > 512 ||
          normalizedValue !== normalizedValue.trim().toLowerCase())) ||
      (kind === "PHONE" &&
        (normalization !== "PHONE_PLUS_DIGITS_V1" ||
          !PHONE.test(normalizedValue))) ||
      (kind !== "EMAIL" && kind !== "PHONE")
    )
      fail("identifier_invalid");
    return {
      id,
      kind,
      normalizationVersion: normalization,
      normalizedValue,
      state: "ACTIVE",
      revision: positiveBigInt(item.revision, "identifier_revision"),
    } as IdentifierPlan;
  });
  const credential = object(
    body.credential,
    ["passwordHash", "algorithm", "parameters", "revision", "changedAt"],
    "credential",
  );
  const passwordHash = string(credential.passwordHash, "password_hash");
  const match = BCRYPT.exec(passwordHash);
  const parameters = object(
    credential.parameters,
    ["cost"],
    "credential_parameters",
  );
  if (
    credential.algorithm !== "BCRYPT" ||
    !match ||
    nonnegativeInteger(parameters.cost, "credential_cost") !== Number(match[1])
  )
    fail("credential_invalid");
  return {
    subjectId,
    credentialGeneration,
    identifiers,
    passwordHash,
    credentialParameters: parameters as Prisma.InputJsonValue,
    credentialRevision: positiveBigInt(
      credential.revision,
      "credential_revision",
    ),
    credentialChangedAt: time(credential.changedAt, "credential_changed_at"),
  };
}

function authPlan(record: MigrationRecord, now: Date) {
  const body = object(
    record.body,
    [
      "subjectId",
      "sessionGeneration",
      "generationSource",
      "disabled",
      "sourceTime",
      "familyQuarantineCounts",
      "families",
    ],
    "auth_record",
  );
  const subjectId = uuid(body.subjectId, "auth_subject_id");
  if (subjectId !== record.sourceId || typeof body.disabled !== "boolean") {
    fail("auth_subject_binding_invalid");
  }
  const sessionGeneration = positiveBigInt(
    body.sessionGeneration,
    "session_generation",
  );
  if (
    body.generationSource !== "CURRENT_TOKEN_VERSION" &&
    body.generationSource !== "EMPTY_LEGACY_STATE"
  )
    fail("generation_source_invalid");
  const sourceTime = time(body.sourceTime, "auth_source_time");
  const quarantine = object(
    body.familyQuarantineCounts,
    [
      "missingOrUnbounded",
      "issuedVersionMissingOrInvalid",
      "versionMismatch",
      "tokenEvidenceInvalid",
    ],
    "family_quarantine_counts",
  );
  for (const [key, value] of Object.entries(quarantine)) {
    nonnegativeInteger(value, `family_quarantine_${key}`);
  }
  if (!Array.isArray(body.families)) fail("families_invalid");
  const sessionIds = new Set<string>();
  const families = body.families.map((value) => {
    const family = object(
      value,
      ["legacySessionId", "tokenHash", "tokenId", "expiresAt"],
      "family",
    );
    const legacySessionId = uuid(family.legacySessionId, "legacy_session_id");
    if (sessionIds.has(legacySessionId)) fail("legacy_session_duplicate");
    sessionIds.add(legacySessionId);
    const tokenHash = string(family.tokenHash, "family_token_hash");
    const tokenId = uuid(family.tokenId, "family_token_id");
    const expiresAt = time(family.expiresAt, "family_expires_at");
    if (
      !SHA256.test(tokenHash) ||
      expiresAt <= sourceTime ||
      expiresAt <= now
    ) {
      fail("family_invalid_or_expired");
    }
    return { legacySessionId, tokenHash, tokenId, expiresAt };
  });
  if (
    body.generationSource === "EMPTY_LEGACY_STATE" &&
    (sessionGeneration !== 1n || families.length !== 0)
  )
    fail("empty_legacy_state_invalid");
  return {
    subjectId,
    sessionGeneration,
    lifecycle: body.disabled ? "SUSPENDED" : "PROVISIONING",
    families,
  } as const;
}

export function buildF4R3ShadowImportPlan(input: {
  user: OpenedMigrationArtifact;
  auth: OpenedMigrationArtifact;
  now?: Date;
}): F4R3ShadowImportPlan {
  const now = input.now ?? new Date();
  if (
    input.user.manifest.sourceOwner !== "USER_SERVICE" ||
    input.auth.manifest.sourceOwner !== "AUTH_SERVICE" ||
    input.user.manifest.migrationId !== input.auth.manifest.migrationId ||
    input.user.manifest.destinationRealmId !== DEFAULT.identityRealmId ||
    input.auth.manifest.destinationRealmId !== DEFAULT.identityRealmId ||
    input.user.manifest.destinationKeyId !==
      input.auth.manifest.destinationKeyId
  )
    fail("manifest_pair_invalid");
  const users = recordsBySubject(input.user, "USER_CREDENTIAL");
  const auth = recordsBySubject(input.auth, "AUTH_SUBJECT");
  if (
    users.size !== auth.size ||
    [...users.keys()].some((subjectId) => !auth.has(subjectId))
  )
    fail("subject_set_mismatch");
  const legacySessions = new Set<string>();
  const subjects = [...users.keys()].sort().map((subjectId) => {
    const user = userPlan(users.get(subjectId)!);
    const authentication = authPlan(auth.get(subjectId)!, now);
    for (const family of authentication.families) {
      if (legacySessions.has(family.legacySessionId)) {
        fail("legacy_session_duplicate");
      }
      legacySessions.add(family.legacySessionId);
    }
    return { ...user, ...authentication };
  });
  return {
    migrationId: input.user.manifest.migrationId,
    subjects,
    user: input.user,
    auth: input.auth,
  };
}

export function legacySessionBridgeFingerprint(input: {
  key: MigrationKey;
  identityRealmId: string;
  subjectId: string;
  legacySessionId: string;
}): string {
  const canonical = JSON.stringify([
    "nebula-legacy-session-bridge",
    "1",
    input.key.id,
    input.identityRealmId,
    input.subjectId,
    input.legacySessionId,
  ]);
  return `lsb1_${createHmac("sha256", input.key.bytes)
    .update(canonical, "utf8")
    .digest("base64url")}`;
}

function manifestData(
  artifact: OpenedMigrationArtifact,
  id: string,
): Prisma.MigrationManifestUncheckedCreateInput {
  return {
    id,
    identityRealmId: DEFAULT.identityRealmId,
    sourceOwner: artifact.manifest.sourceOwner,
    migrationId: artifact.manifest.migrationId,
    manifestVersion: artifact.manifest.version,
    manifestDigest: artifact.manifestDigest,
    manifestHmacKeyId: artifact.manifest.recordHmacKeyId,
    destinationKeyId: artifact.manifest.destinationKeyId,
    sourceCreatedAt: new Date(artifact.manifest.sourceCreatedAt),
    expiresAt: new Date(artifact.manifest.expiresAt),
    sourceRecordCount: artifact.manifest.recordCount,
    state: "IMPORTING",
  };
}

function comparable(value: unknown): string {
  return JSON.stringify(value, (_key: string, item: unknown): unknown =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

async function exactImportExists(
  tx: Prisma.TransactionClient,
  plan: F4R3ShadowImportPlan,
  bridgeKey: MigrationKey,
): Promise<boolean> {
  const targetIds = plan.subjects.map((subject) => subject.subjectId);
  const [
    subjects,
    identifiers,
    credentials,
    bridges,
    receipts,
    sessions,
    externalLinks,
    audits,
    outboxEvents,
  ] = await Promise.all([
    tx.realmSubject.findMany({
      where: {
        identityRealmId: DEFAULT.identityRealmId,
        id: { in: targetIds },
      },
      select: {
        id: true,
        principalClass: true,
        lifecycle: true,
        credentialGeneration: true,
        sessionGeneration: true,
      },
    }),
    tx.loginIdentifier.findMany({
      where: {
        identityRealmId: DEFAULT.identityRealmId,
        subjectId: { in: targetIds },
      },
      select: {
        id: true,
        subjectId: true,
        kind: true,
        normalizationVersion: true,
        normalizedValue: true,
        state: true,
        revision: true,
      },
    }),
    tx.localCredential.findMany({
      where: {
        identityRealmId: DEFAULT.identityRealmId,
        subjectId: { in: targetIds },
      },
      select: {
        subjectId: true,
        passwordHash: true,
        algorithm: true,
        parameters: true,
        revision: true,
        changedAt: true,
      },
    }),
    tx.legacySessionBridge.findMany({
      where: {
        identityRealmId: DEFAULT.identityRealmId,
        subjectId: { in: targetIds },
      },
      select: {
        subjectId: true,
        legacySessionFingerprint: true,
        legacySessionFingerprintKeyId: true,
        observedCredentialGeneration: true,
        observedSessionGeneration: true,
        expiresAt: true,
        state: true,
      },
    }),
    tx.migrationRecordReceipt.findMany({
      where: { migrationId: plan.migrationId },
      select: {
        sourceOwner: true,
        recordHmac: true,
        recordKind: true,
        targetId: true,
      },
    }),
    tx.authSession.count({ where: { subjectId: { in: targetIds } } }),
    tx.externalIdentityLink.count({
      where: { subjectId: { in: targetIds } },
    }),
    tx.authAuditEvent.count({ where: { subjectId: { in: targetIds } } }),
    tx.authOutboxEvent.count({ where: { subjectId: { in: targetIds } } }),
  ]);
  const sort = <T>(items: T[]): T[] =>
    [...items].sort((left, right) =>
      comparable(left).localeCompare(comparable(right)),
    );
  const expectedSubjects = plan.subjects.map((subject) => ({
    id: subject.subjectId,
    principalClass: "CONSUMER",
    lifecycle: subject.lifecycle,
    credentialGeneration: subject.credentialGeneration,
    sessionGeneration: subject.sessionGeneration,
  }));
  const expectedIdentifiers = plan.subjects.flatMap((subject) =>
    subject.identifiers.map((identifier) => ({
      id: identifier.id,
      subjectId: subject.subjectId,
      kind: identifier.kind,
      normalizationVersion: identifier.normalizationVersion,
      normalizedValue: identifier.normalizedValue,
      state: identifier.state,
      revision: identifier.revision,
    })),
  );
  const expectedCredentials = plan.subjects.map((subject) => ({
    subjectId: subject.subjectId,
    passwordHash: subject.passwordHash,
    algorithm: "BCRYPT",
    parameters: subject.credentialParameters,
    revision: subject.credentialRevision,
    changedAt: subject.credentialChangedAt,
  }));
  const expectedBridges = plan.subjects.flatMap((subject) =>
    subject.families.map((family) => ({
      subjectId: subject.subjectId,
      legacySessionFingerprint: legacySessionBridgeFingerprint({
        key: bridgeKey,
        identityRealmId: DEFAULT.identityRealmId,
        subjectId: subject.subjectId,
        legacySessionId: family.legacySessionId,
      }),
      legacySessionFingerprintKeyId: bridgeKey.id,
      observedCredentialGeneration: subject.credentialGeneration,
      observedSessionGeneration: subject.sessionGeneration,
      expiresAt: family.expiresAt,
      state: "PENDING",
    })),
  );
  const expectedReceipts = ([plan.user, plan.auth] as const).flatMap(
    (artifact) =>
      artifact.records.map((record) => ({
        sourceOwner: artifact.manifest.sourceOwner,
        recordHmac: record.recordHmac,
        recordKind: record.kind,
        targetId: record.sourceId,
      })),
  );
  return (
    comparable(sort(subjects)) === comparable(sort(expectedSubjects)) &&
    comparable(sort(identifiers)) === comparable(sort(expectedIdentifiers)) &&
    comparable(sort(credentials)) === comparable(sort(expectedCredentials)) &&
    comparable(sort(bridges)) === comparable(sort(expectedBridges)) &&
    comparable(sort(receipts)) === comparable(sort(expectedReceipts)) &&
    sessions + externalLinks + audits + outboxEvents === 0
  );
}

export async function importF4R3ShadowArtifacts(
  prisma: PrismaClient,
  input: {
    user: OpenedMigrationArtifact;
    auth: OpenedMigrationArtifact;
    bridgeKey: MigrationKey;
    now?: Date;
    newId?: () => string;
  },
) {
  const now = input.now ?? new Date();
  const plan = buildF4R3ShadowImportPlan({ ...input, now });
  const newId = input.newId ?? randomUUID;
  if (
    input.bridgeKey.id !== DEFAULT.keyRegistrations.legacySessionBridge[0] ||
    input.bridgeKey.bytes.length !== 32
  )
    fail("bridge_key_invalid");
  return serializableMigrationTransaction(prisma, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${IMPORT_LOCK}, 0))`;
    const boundary = await tx.realmBoundary.findUnique({
      where: { singleton: true },
      select: {
        identityRealmId: true,
        principalClass: true,
        admissionMode: true,
      },
    });
    if (
      boundary?.identityRealmId !== DEFAULT.identityRealmId ||
      boundary.principalClass !== "CONSUMER" ||
      boundary.admissionMode !== "SHADOW"
    )
      fail("boundary_invalid");
    const existing = await tx.migrationManifest.findMany({
      where: { migrationId: plan.migrationId },
      select: {
        sourceOwner: true,
        manifestDigest: true,
        state: true,
        importedRecordCount: true,
      },
    });
    if (existing.length > 0) {
      const expected = new Map([
        ["USER_SERVICE", plan.user.manifestDigest],
        ["AUTH_SERVICE", plan.auth.manifestDigest],
      ]);
      if (
        existing.length === 2 &&
        existing.every(
          (entry) =>
            entry.state === "COMPLETE" &&
            entry.manifestDigest === expected.get(entry.sourceOwner) &&
            entry.importedRecordCount === plan.subjects.length,
        ) &&
        (await exactImportExists(tx, plan, input.bridgeKey))
      ) {
        return {
          status: "ALREADY_CURRENT" as const,
          subjectCount: plan.subjects.length,
        };
      }
      fail("existing_manifest_conflict");
    }
    const destinationKey = await tx.realmKeyRegistration.findUnique({
      where: { id: plan.user.manifest.destinationKeyId },
      select: { purpose: true, retiredAt: true },
    });
    const bridgeKey = await tx.realmKeyRegistration.findUnique({
      where: { id: input.bridgeKey.id },
      select: { purpose: true, retiredAt: true },
    });
    if (
      destinationKey?.purpose !== "ARTIFACT_DECRYPTION" ||
      destinationKey.retiredAt !== null ||
      bridgeKey?.purpose !== "LEGACY_SESSION_BRIDGE" ||
      bridgeKey.retiredAt !== null
    )
      fail("registered_key_invalid");
    const manifestIds = {
      USER_SERVICE: newId(),
      AUTH_SERVICE: newId(),
    };
    await tx.migrationManifest.create({
      data: manifestData(plan.user, manifestIds.USER_SERVICE),
    });
    await tx.migrationManifest.create({
      data: manifestData(plan.auth, manifestIds.AUTH_SERVICE),
    });
    let bridgeCount = 0;
    for (const subject of plan.subjects) {
      await tx.realmSubject.create({
        data: {
          id: subject.subjectId,
          identityRealmId: DEFAULT.identityRealmId,
          principalClass: "CONSUMER",
          lifecycle: subject.lifecycle,
          credentialGeneration: subject.credentialGeneration,
          sessionGeneration: subject.sessionGeneration,
        },
      });
      if (subject.identifiers.length > 0) {
        await tx.loginIdentifier.createMany({
          data: subject.identifiers.map((identifier) => ({
            ...identifier,
            identityRealmId: DEFAULT.identityRealmId,
            subjectId: subject.subjectId,
          })),
        });
      }
      await tx.localCredential.create({
        data: {
          identityRealmId: DEFAULT.identityRealmId,
          subjectId: subject.subjectId,
          passwordHash: subject.passwordHash,
          algorithm: "BCRYPT",
          parameters: subject.credentialParameters,
          revision: subject.credentialRevision,
          changedAt: subject.credentialChangedAt,
        },
      });
      for (const family of subject.families) {
        await tx.legacySessionBridge.create({
          data: {
            id: newId(),
            identityRealmId: DEFAULT.identityRealmId,
            subjectId: subject.subjectId,
            legacySessionFingerprint: legacySessionBridgeFingerprint({
              key: input.bridgeKey,
              identityRealmId: DEFAULT.identityRealmId,
              subjectId: subject.subjectId,
              legacySessionId: family.legacySessionId,
            }),
            legacySessionFingerprintKeyId: input.bridgeKey.id,
            observedCredentialGeneration: subject.credentialGeneration,
            observedSessionGeneration: subject.sessionGeneration,
            expiresAt: family.expiresAt,
            state: "PENDING",
          },
        });
        bridgeCount += 1;
      }
      for (const [owner, artifact] of [
        ["USER_SERVICE", plan.user],
        ["AUTH_SERVICE", plan.auth],
      ] as const) {
        const record = artifact.records.find(
          (item) => item.sourceId === subject.subjectId,
        )!;
        await tx.migrationRecordReceipt.create({
          data: {
            id: newId(),
            manifestId: manifestIds[owner],
            sourceOwner: owner,
            migrationId: plan.migrationId,
            recordHmac: record.recordHmac,
            recordKind: record.kind,
            targetId: subject.subjectId,
          },
        });
      }
    }
    for (const [owner, artifact] of [
      ["USER_SERVICE", plan.user],
      ["AUTH_SERVICE", plan.auth],
    ] as const) {
      await tx.migrationManifest.update({
        where: { id: manifestIds[owner] },
        data: {
          importedRecordCount: artifact.manifest.recordCount,
          state: "COMPLETE",
          completedAt: now,
        },
      });
    }
    return {
      status: "IMPORTED" as const,
      subjectCount: plan.subjects.length,
      bridgeCount,
      userManifestDigest: plan.user.manifestDigest,
      authManifestDigest: plan.auth.manifestDigest,
    };
  });
}

export async function rollbackF4R3ShadowImport(
  prisma: PrismaClient,
  input: { migrationId: string; now?: Date },
) {
  if (!UUID_V4.test(input.migrationId)) fail("rollback_migration_id_invalid");
  const now = input.now ?? new Date();
  return serializableMigrationTransaction(prisma, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${IMPORT_LOCK}, 0))`;
    const boundary = await tx.realmBoundary.findUnique({
      where: { singleton: true },
      select: {
        identityRealmId: true,
        principalClass: true,
        admissionMode: true,
      },
    });
    if (
      boundary?.identityRealmId !== DEFAULT.identityRealmId ||
      boundary.principalClass !== "CONSUMER" ||
      boundary.admissionMode !== "SHADOW"
    )
      fail("rollback_boundary_invalid");
    const manifests = await tx.migrationManifest.findMany({
      where: { migrationId: input.migrationId },
      select: {
        id: true,
        sourceOwner: true,
        state: true,
        importedRecordCount: true,
      },
    });
    if (
      manifests.length !== 2 ||
      manifests
        .map((item) => item.sourceOwner)
        .sort()
        .join(",") !== "AUTH_SERVICE,USER_SERVICE"
    )
      fail("rollback_manifest_pair_invalid");
    const receipts = await tx.migrationRecordReceipt.findMany({
      where: { migrationId: input.migrationId },
      select: {
        manifestId: true,
        sourceOwner: true,
        targetId: true,
      },
    });
    const targetSets = new Map<string, Set<string>>([
      ["USER_SERVICE", new Set()],
      ["AUTH_SERVICE", new Set()],
    ]);
    const manifestIds = new Map(
      manifests.map((manifest) => [manifest.sourceOwner, manifest.id]),
    );
    for (const receipt of receipts) {
      if (
        !receipt.targetId ||
        receipt.manifestId !== manifestIds.get(receipt.sourceOwner) ||
        targetSets.get(receipt.sourceOwner)!.has(receipt.targetId)
      )
        fail("rollback_receipt_set_invalid");
      targetSets.get(receipt.sourceOwner)!.add(receipt.targetId);
    }
    const userTargets = [...targetSets.get("USER_SERVICE")!].sort();
    const authTargets = [...targetSets.get("AUTH_SERVICE")!].sort();
    if (
      comparable(userTargets) !== comparable(authTargets) ||
      manifests.some(
        (manifest) =>
          manifest.importedRecordCount !==
          targetSets.get(manifest.sourceOwner)!.size,
      )
    )
      fail("rollback_receipt_set_invalid");
    const targetIds = userTargets;
    const remainingRows = async (): Promise<number> =>
      (
        await Promise.all([
          tx.realmSubject.count({ where: { id: { in: targetIds } } }),
          tx.loginIdentifier.count({
            where: { subjectId: { in: targetIds } },
          }),
          tx.localCredential.count({
            where: { subjectId: { in: targetIds } },
          }),
          tx.legacySessionBridge.count({
            where: { subjectId: { in: targetIds } },
          }),
        ])
      ).reduce((sum, count) => sum + count, 0);
    if (manifests.every((manifest) => manifest.state === "ROLLED_BACK")) {
      if ((await remainingRows()) !== 0) fail("rollback_terminal_rows_present");
      return {
        status: "ALREADY_ROLLED_BACK" as const,
        subjectCount: targetIds.length,
      };
    }
    if (!manifests.every((manifest) => manifest.state === "COMPLETE")) {
      fail("rollback_manifest_state_invalid");
    }
    const [foreignReceipts, sessions, externalLinks, audits, outboxEvents] =
      await Promise.all([
        tx.migrationRecordReceipt.count({
          where: {
            targetId: { in: targetIds },
            migrationId: { not: input.migrationId },
          },
        }),
        tx.authSession.count({ where: { subjectId: { in: targetIds } } }),
        tx.externalIdentityLink.count({
          where: { subjectId: { in: targetIds } },
        }),
        tx.authAuditEvent.count({ where: { subjectId: { in: targetIds } } }),
        tx.authOutboxEvent.count({ where: { subjectId: { in: targetIds } } }),
      ]);
    if (foreignReceipts !== 0) fail("rollback_subject_shared");
    if (sessions !== 0) fail("rollback_session_exists");
    if (externalLinks + audits + outboxEvents !== 0) {
      fail("rollback_runtime_evidence_exists");
    }
    await tx.legacySessionBridge.deleteMany({
      where: { subjectId: { in: targetIds } },
    });
    await tx.localCredential.deleteMany({
      where: { subjectId: { in: targetIds } },
    });
    await tx.loginIdentifier.deleteMany({
      where: { subjectId: { in: targetIds } },
    });
    await tx.realmSubject.deleteMany({ where: { id: { in: targetIds } } });
    for (const manifest of manifests) {
      await tx.migrationManifest.update({
        where: { id: manifest.id },
        data: { state: "ROLLED_BACK", rolledBackAt: now },
      });
    }
    return {
      status: "ROLLED_BACK" as const,
      subjectCount: targetIds.length,
      retainedReceiptCount: receipts.length,
    };
  });
}
