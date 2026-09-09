/* eslint-disable no-console */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canonicalMigrationJson,
  migrationKeyFromBase64url,
} from '@nebula/migration-artifacts';
import { PrismaClient } from './generated';
import {
  createF4R3UserCredentialArtifact,
  F4_R3_MAX_USERS,
} from '../src/migration/f4-r3-credential-export';

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value?.slice(prefix.length))
    throw new Error(`f4_r3_user_export_${name}_required`);
  return value.slice(prefix.length);
}

function environment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`f4_r3_user_export_${name.toLowerCase()}_required`);
  return value;
}

function target(name: string): string {
  const value = resolve(argument(name));
  if (existsSync(value)) throw new Error(`f4_r3_user_export_${name}_exists`);
  return value;
}

async function main(): Promise<void> {
  const artifactPath = target('artifact');
  const subjectsPath = target('subjects');
  if (artifactPath === subjectsPath)
    throw new Error('f4_r3_user_export_paths_conflict');
  const migrationId = argument('migration-id');
  const destinationRealmId = environment('F4_R3_DESTINATION_REALM_ID');
  const destinationKey = migrationKeyFromBase64url(
    environment('F4_R3_DESTINATION_KEY_ID'),
    environment('F4_R3_DESTINATION_KEY'),
  );
  const recordHmacKey = migrationKeyFromBase64url(
    environment('F4_R3_USER_HMAC_KEY_ID'),
    environment('F4_R3_USER_HMAC_KEY'),
  );
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$transaction(
      (tx) =>
        tx.user.findMany({
          select: {
            id: true,
            email: true,
            phone: true,
            password: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { id: 'asc' },
          take: F4_R3_MAX_USERS + 1,
        }),
      { isolationLevel: 'Serializable' },
    );
    const sourceCreatedAt = new Date();
    const result = createF4R3UserCredentialArtifact({
      rows,
      migrationId,
      destinationRealmId,
      sourceCreatedAt: sourceCreatedAt.toISOString(),
      expiresAt: new Date(
        sourceCreatedAt.getTime() + 5 * 60 * 1000,
      ).toISOString(),
      recordHmacKey,
      destinationKey,
    });
    writeFileSync(artifactPath, result.serialized, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    writeFileSync(
      subjectsPath,
      `${canonicalMigrationJson(result.subjectSelection as never)}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        sourceOwner: 'USER_SERVICE',
        migrationId,
        recordCount: result.opened.manifest.recordCount,
        quarantinedIdentifierCount: result.quarantinedIdentifierCount,
        manifestDigest: result.opened.manifestDigest,
        recordHmacKeyId: result.opened.manifest.recordHmacKeyId,
        destinationKeyId: result.opened.manifest.destinationKeyId,
        expiresAt: result.opened.manifest.expiresAt,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown_error';
  console.error(`f4_r3_user_credential_export_failed:${message}`);
  process.exitCode = 1;
});
