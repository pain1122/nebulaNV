import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  canonicalMigrationJson,
  migrationKeyFromBase64url,
} from '@nebula/migration-artifacts';
import Redis from 'ioredis';
import {
  createF4R3AuthFamilyArtifact,
  parseF4R3SubjectSelection,
} from './f4-r3-family-export';

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value?.slice(prefix.length))
    throw new Error(`f4_r3_auth_export_${name}_required`);
  return value.slice(prefix.length);
}

function environment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`f4_r3_auth_export_${name.toLowerCase()}_required`);
  return value;
}

async function main(): Promise<void> {
  const artifactPath = resolve(argument('artifact'));
  const subjectsPath = resolve(argument('subjects'));
  if (existsSync(artifactPath))
    throw new Error('f4_r3_auth_export_artifact_exists');
  const serializedSelection = readFileSync(subjectsPath, 'utf8').trimEnd();
  const parsedSelection: unknown = JSON.parse(serializedSelection);
  if (
    canonicalMigrationJson(parsedSelection as never) !== serializedSelection
  ) {
    throw new Error('f4_r3_auth_subject_selection_not_canonical');
  }
  const subjectSelection = parseF4R3SubjectSelection(parsedSelection);
  const destinationKey = migrationKeyFromBase64url(
    environment('F4_R3_DESTINATION_KEY_ID'),
    environment('F4_R3_DESTINATION_KEY'),
  );
  const recordHmacKey = migrationKeyFromBase64url(
    environment('F4_R3_AUTH_HMAC_KEY_ID'),
    environment('F4_R3_AUTH_HMAC_KEY'),
  );
  const redis = new Redis({
    host: environment('REDIS_HOST'),
    port: Number(environment('REDIS_PORT')),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });
  try {
    const sourceCreatedAt = new Date();
    const result = await createF4R3AuthFamilyArtifact({
      redis,
      subjectSelection,
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
    console.log(
      JSON.stringify({
        sourceOwner: 'AUTH_SERVICE',
        migrationId: subjectSelection.migrationId,
        recordCount: result.opened.manifest.recordCount,
        quarantinedFamilyCount: Object.values(result.quarantineTotals).reduce(
          (sum, count) => sum + count,
          0,
        ),
        manifestDigest: result.opened.manifestDigest,
        recordHmacKeyId: result.opened.manifest.recordHmacKeyId,
        destinationKeyId: result.opened.manifest.destinationKeyId,
        expiresAt: result.opened.manifest.expiresAt,
      }),
    );
  } finally {
    redis.disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown_error';
  console.error(`f4_r3_auth_family_export_failed:${message}`);
  process.exitCode = 1;
});
