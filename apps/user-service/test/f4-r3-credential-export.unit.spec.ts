import {
  migrationKeyFromBase64url,
  openMigrationArtifact,
} from '@nebula/migration-artifacts';
import { createF4R3UserCredentialArtifact } from '../src/migration/f4-r3-credential-export';

const destinationRealmId = 'b1000000-0000-4000-8000-000000000001';
const destinationKey = migrationKeyFromBase64url(
  'b5000000-0000-4000-8000-000000000004',
  Buffer.alloc(32, 1).toString('base64url'),
);
const hmacKey = migrationKeyFromBase64url(
  'd1000000-0000-4000-8000-000000000001',
  Buffer.alloc(32, 2).toString('base64url'),
);

describe('F4 R3 User credential export', () => {
  it('exports only normalized login and encoded credential facts', () => {
    const now = new Date('2026-09-09T12:00:00.000Z');
    let sequence = 0;
    const result = createF4R3UserCredentialArtifact({
      rows: [
        {
          id: 'e1000000-0000-4000-8000-000000000001',
          email: ' User@Example.Test ',
          phone: '00989123456789',
          password: `$2b$10$${'a'.repeat(53)}`,
          createdAt: new Date(now.getTime() - 1000),
          updatedAt: now,
        },
      ],
      migrationId: 'e2000000-0000-4000-8000-000000000001',
      destinationRealmId,
      sourceCreatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 300_000).toISOString(),
      recordHmacKey: hmacKey,
      destinationKey,
      newId: () =>
        `e3000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    });
    expect(result.quarantinedIdentifierCount).toBe(1);
    expect(result.subjectSelection.subjectIds).toEqual([
      'e1000000-0000-4000-8000-000000000001',
    ]);
    const opened = openMigrationArtifact(result.serialized, {
      expectedSourceOwner: 'USER_SERVICE',
      expectedDestinationRealmId: destinationRealmId,
      destinationKey,
      recordHmacKey: hmacKey,
      now,
    });
    expect(opened.records[0].body).toMatchObject({
      subjectId: 'e1000000-0000-4000-8000-000000000001',
      identifiers: [
        {
          normalizedValue: 'user@example.test',
          normalizationVersion: 'EMAIL_LOWER_TRIM_V1',
        },
      ],
      quarantinedIdentifierCount: 1,
      credentialGeneration: '1',
    });
    expect(JSON.stringify(opened.records[0].body)).not.toContain(
      '00989123456789',
    );
  });

  it('rejects invalid password hashes and duplicate subjects', () => {
    const base = {
      id: 'e1000000-0000-4000-8000-000000000001',
      email: 'user@example.test',
      phone: null,
      password: `$2b$10$${'a'.repeat(53)}`,
      createdAt: new Date('2026-09-09T11:00:00.000Z'),
      updatedAt: new Date('2026-09-09T12:00:00.000Z'),
    };
    const common = {
      migrationId: 'e2000000-0000-4000-8000-000000000001',
      destinationRealmId,
      sourceCreatedAt: '2026-09-09T12:00:00.000Z',
      expiresAt: '2026-09-09T12:05:00.000Z',
      recordHmacKey: hmacKey,
      destinationKey,
    };
    expect(() =>
      createF4R3UserCredentialArtifact({
        ...common,
        rows: [{ ...base, password: 'plain' }],
      }),
    ).toThrow('f4_r3_user_export_password_hash_invalid');
    expect(() =>
      createF4R3UserCredentialArtifact({ ...common, rows: [base, base] }),
    ).toThrow('f4_r3_user_export_subject_invalid');
  });
});
