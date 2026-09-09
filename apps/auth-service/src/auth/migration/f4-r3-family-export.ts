import {
  sealMigrationArtifact,
  type JsonValue,
  type MigrationKey,
} from '@nebula/migration-artifacts';
import type Redis from 'ioredis';
import {
  readLegacySubjectEvidence,
  type LegacySubjectEvidence,
} from './legacy-family-evidence';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const F4_R3_AUTH_RECORD_KIND = 'AUTH_SUBJECT';
export const F4_R3_MAX_SUBJECTS = 10_000;

export type F4R3SubjectSelection = Readonly<{
  version: 1;
  migrationId: string;
  destinationRealmId: string;
  subjectIds: readonly string[];
}>;

export function parseF4R3SubjectSelection(
  value: unknown,
): F4R3SubjectSelection {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'destinationRealmId,migrationId,subjectIds,version' ||
    (value as { version?: unknown }).version !== 1
  ) {
    throw new Error('f4_r3_auth_subject_selection_invalid');
  }
  const parsed = value as Partial<F4R3SubjectSelection>;
  if (
    !UUID_V4.test(parsed.migrationId ?? '') ||
    !UUID_V4.test(parsed.destinationRealmId ?? '') ||
    !Array.isArray(parsed.subjectIds) ||
    parsed.subjectIds.length > F4_R3_MAX_SUBJECTS ||
    !parsed.subjectIds.every(
      (id) => typeof id === 'string' && UUID_V4.test(id),
    ) ||
    new Set(parsed.subjectIds).size !== parsed.subjectIds.length ||
    parsed.subjectIds.some(
      (id, index) => index > 0 && id < parsed.subjectIds![index - 1],
    )
  ) {
    throw new Error('f4_r3_auth_subject_selection_invalid');
  }
  return parsed as F4R3SubjectSelection;
}

export async function createF4R3AuthFamilyArtifact(input: {
  redis: Redis;
  subjectSelection: F4R3SubjectSelection;
  sourceCreatedAt: string;
  expiresAt: string;
  recordHmacKey: MigrationKey;
  destinationKey: MigrationKey;
  reader?: (redis: Redis, subjectId: string) => Promise<LegacySubjectEvidence>;
}) {
  const selection = parseF4R3SubjectSelection(input.subjectSelection);
  const reader = input.reader ?? readLegacySubjectEvidence;
  const records = [];
  const quarantineTotals = {
    missingOrUnbounded: 0,
    issuedVersionMissingOrInvalid: 0,
    versionMismatch: 0,
    tokenEvidenceInvalid: 0,
  };
  for (const subjectId of selection.subjectIds) {
    const evidence = await reader(input.redis, subjectId);
    if (evidence.status === 'quarantined') {
      throw new Error(`f4_r3_auth_subject_quarantined_${evidence.reason}`);
    }
    for (const key of Object.keys(quarantineTotals) as Array<
      keyof typeof quarantineTotals
    >) {
      quarantineTotals[key] += evidence.familyQuarantineCounts[key];
    }
    records.push({
      kind: F4_R3_AUTH_RECORD_KIND,
      sourceId: subjectId,
      body: {
        subjectId,
        sessionGeneration: String(evidence.tokenVersion),
        generationSource: evidence.generationSource,
        disabled: evidence.disabled,
        sourceTime: new Date(evidence.sourceTimeMs).toISOString(),
        familyQuarantineCounts: evidence.familyQuarantineCounts,
        families: evidence.families.map((family) => ({
          legacySessionId: family.sessionId,
          tokenHash: family.tokenHash,
          tokenId: family.tokenId,
          expiresAt: new Date(family.expiresAtMs).toISOString(),
        })),
      } satisfies JsonValue,
    });
  }
  const sealed = sealMigrationArtifact({
    sourceOwner: 'AUTH_SERVICE',
    migrationId: selection.migrationId,
    destinationRealmId: selection.destinationRealmId,
    sourceCreatedAt: input.sourceCreatedAt,
    expiresAt: input.expiresAt,
    records,
    recordHmacKey: input.recordHmacKey,
    destinationKey: input.destinationKey,
  });
  return { ...sealed, quarantineTotals };
}
