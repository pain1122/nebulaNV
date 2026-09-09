import {
  migrationKeyFromBase64url,
  openMigrationArtifact,
} from '@nebula/migration-artifacts';
import type Redis from 'ioredis';
import {
  createF4R3AuthFamilyArtifact,
  parseF4R3SubjectSelection,
} from '../../src/auth/migration/f4-r3-family-export';

const destinationRealmId = 'b1000000-0000-4000-8000-000000000001';
const migrationId = 'e2000000-0000-4000-8000-000000000001';
const subjectId = 'e1000000-0000-4000-8000-000000000001';
const destinationKey = migrationKeyFromBase64url(
  'b5000000-0000-4000-8000-000000000004',
  Buffer.alloc(32, 1).toString('base64url'),
);
const hmacKey = migrationKeyFromBase64url(
  'd1000000-0000-4000-8000-000000000002',
  Buffer.alloc(32, 2).toString('base64url'),
);

describe('F4 R3 Auth family export', () => {
  it('exports the non-lazy generation and only eligible family facts', async () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    const result = await createF4R3AuthFamilyArtifact({
      redis: {} as Redis,
      subjectSelection: {
        version: 1,
        migrationId,
        destinationRealmId,
        subjectIds: [subjectId],
      },
      sourceCreatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 300_000).toISOString(),
      recordHmacKey: hmacKey,
      destinationKey,
      reader: () =>
        Promise.resolve({
          status: 'eligible',
          tokenVersion: 7,
          generationSource: 'CURRENT_TOKEN_VERSION',
          disabled: false,
          sourceTimeMs: now.getTime(),
          familyQuarantineCounts: {
            missingOrUnbounded: 1,
            issuedVersionMissingOrInvalid: 0,
            versionMismatch: 0,
            tokenEvidenceInvalid: 0,
          },
          families: [
            {
              sessionId: 'e4000000-0000-4000-8000-000000000001',
              tokenHash: 'a'.repeat(64),
              tokenId: 'e5000000-0000-4000-8000-000000000001',
              expiresAtMs: now.getTime() + 60_000,
            },
          ],
        }),
    });
    expect(result.quarantineTotals.missingOrUnbounded).toBe(1);
    const opened = openMigrationArtifact(result.serialized, {
      expectedSourceOwner: 'AUTH_SERVICE',
      expectedDestinationRealmId: destinationRealmId,
      destinationKey,
      recordHmacKey: hmacKey,
      now,
    });
    expect(opened.records[0].body).toMatchObject({
      subjectId,
      sessionGeneration: '7',
      families: [
        {
          legacySessionId: 'e4000000-0000-4000-8000-000000000001',
          tokenHash: 'a'.repeat(64),
        },
      ],
    });
  });

  it('rejects unprovable subject state and malformed selections', async () => {
    const selection = {
      version: 1 as const,
      migrationId,
      destinationRealmId,
      subjectIds: [subjectId],
    };
    await expect(
      createF4R3AuthFamilyArtifact({
        redis: {} as Redis,
        subjectSelection: selection,
        sourceCreatedAt: '2026-09-09T12:00:00.000Z',
        expiresAt: '2026-09-09T12:05:00.000Z',
        recordHmacKey: hmacKey,
        destinationKey,
        reader: () =>
          Promise.resolve({
            status: 'quarantined',
            reason: 'current_version_missing_with_families',
          }),
      }),
    ).rejects.toThrow(
      'f4_r3_auth_subject_quarantined_current_version_missing_with_families',
    );
    expect(() =>
      parseF4R3SubjectSelection({ ...selection, extra: true }),
    ).toThrow('f4_r3_auth_subject_selection_invalid');
    expect(() =>
      parseF4R3SubjectSelection({
        ...selection,
        subjectIds: [subjectId, subjectId],
      }),
    ).toThrow('f4_r3_auth_subject_selection_invalid');
  });

  it('fails closed when the owner snapshot store is unavailable', async () => {
    await expect(
      createF4R3AuthFamilyArtifact({
        redis: {} as Redis,
        subjectSelection: {
          version: 1,
          migrationId,
          destinationRealmId,
          subjectIds: [subjectId],
        },
        sourceCreatedAt: '2026-09-09T12:00:00.000Z',
        expiresAt: '2026-09-09T12:05:00.000Z',
        recordHmacKey: hmacKey,
        destinationKey,
        reader: () => Promise.reject(new Error('redis_unavailable')),
      }),
    ).rejects.toThrow('redis_unavailable');
  });
});
