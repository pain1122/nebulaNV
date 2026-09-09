import { randomUUID } from 'node:crypto';
import {
  sealMigrationArtifact,
  type JsonValue,
  type MigrationKey,
} from '@nebula/migration-artifacts';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BCRYPT_HASH = /^\$2[aby]\$([0-9]{2})\$[./A-Za-z0-9]{53}$/;
const PHONE_PLUS_DIGITS = /^\+[1-9][0-9]{1,14}$/;

export const F4_R3_USER_RECORD_KIND = 'USER_CREDENTIAL';
export const F4_R3_MAX_USERS = 10_000;

export type F4R3UserSourceRow = Readonly<{
  id: string;
  email: string | null;
  phone: string | null;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}>;

export type F4R3SubjectSelection = Readonly<{
  version: 1;
  migrationId: string;
  destinationRealmId: string;
  subjectIds: readonly string[];
}>;

function normalizedIdentifiers(
  row: F4R3UserSourceRow,
  newId: () => string,
): { values: JsonValue[]; quarantined: number } {
  const values: JsonValue[] = [];
  let quarantined = 0;
  if (row.email !== null) {
    const email = row.email.trim().toLowerCase();
    if (!email || email.length > 512) {
      quarantined += 1;
    } else {
      values.push({
        id: newId(),
        kind: 'EMAIL',
        normalizationVersion: 'EMAIL_LOWER_TRIM_V1',
        normalizedValue: email,
        state: 'ACTIVE',
        revision: '1',
      });
    }
  }
  if (row.phone !== null) {
    if (!PHONE_PLUS_DIGITS.test(row.phone)) {
      quarantined += 1;
    } else {
      values.push({
        id: newId(),
        kind: 'PHONE',
        normalizationVersion: 'PHONE_PLUS_DIGITS_V1',
        normalizedValue: row.phone,
        state: 'ACTIVE',
        revision: '1',
      });
    }
  }
  return { values, quarantined };
}

export function buildF4R3UserCredentialRecords(
  rows: readonly F4R3UserSourceRow[],
  newId: () => string = randomUUID,
) {
  if (rows.length > F4_R3_MAX_USERS) {
    throw new Error('f4_r3_user_export_limit_exceeded');
  }
  const subjectIds = new Set<string>();
  let quarantinedIdentifierCount = 0;
  const records = rows.map((row) => {
    if (!UUID_V4.test(row.id) || subjectIds.has(row.id)) {
      throw new Error('f4_r3_user_export_subject_invalid');
    }
    subjectIds.add(row.id);
    const password = BCRYPT_HASH.exec(row.password);
    if (!password) throw new Error('f4_r3_user_export_password_hash_invalid');
    if (
      !Number.isSafeInteger(row.createdAt.getTime()) ||
      !Number.isSafeInteger(row.updatedAt.getTime()) ||
      row.updatedAt < row.createdAt
    ) {
      throw new Error('f4_r3_user_export_source_time_invalid');
    }
    const identifiers = normalizedIdentifiers(row, newId);
    quarantinedIdentifierCount += identifiers.quarantined;
    return {
      kind: F4_R3_USER_RECORD_KIND,
      sourceId: row.id,
      body: {
        subjectId: row.id,
        principalClass: 'CONSUMER',
        lifecycle: 'PROVISIONING',
        credentialGeneration: '1',
        sourceRevision: row.updatedAt.toISOString(),
        sourceCreatedAt: row.createdAt.toISOString(),
        identifiers: identifiers.values,
        quarantinedIdentifierCount: identifiers.quarantined,
        credential: {
          passwordHash: row.password,
          algorithm: 'BCRYPT',
          parameters: { cost: Number(password[1]) },
          revision: '1',
          changedAt: row.updatedAt.toISOString(),
        },
      } satisfies JsonValue,
    };
  });
  return {
    records,
    subjectIds: [...subjectIds].sort(),
    quarantinedIdentifierCount,
  };
}

export function createF4R3UserCredentialArtifact(input: {
  rows: readonly F4R3UserSourceRow[];
  migrationId: string;
  destinationRealmId: string;
  sourceCreatedAt: string;
  expiresAt: string;
  recordHmacKey: MigrationKey;
  destinationKey: MigrationKey;
  newId?: () => string;
}) {
  const built = buildF4R3UserCredentialRecords(input.rows, input.newId);
  const sealed = sealMigrationArtifact({
    sourceOwner: 'USER_SERVICE',
    migrationId: input.migrationId,
    destinationRealmId: input.destinationRealmId,
    sourceCreatedAt: input.sourceCreatedAt,
    expiresAt: input.expiresAt,
    records: built.records,
    recordHmacKey: input.recordHmacKey,
    destinationKey: input.destinationKey,
  });
  const subjectSelection: F4R3SubjectSelection = {
    version: 1,
    migrationId: input.migrationId,
    destinationRealmId: input.destinationRealmId,
    subjectIds: built.subjectIds,
  };
  return {
    ...sealed,
    subjectSelection,
    quarantinedIdentifierCount: built.quarantinedIdentifierCount,
  };
}
