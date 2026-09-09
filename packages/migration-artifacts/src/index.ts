import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const MIGRATION_ARTIFACT_VERSION = 1 as const;
export const MIGRATION_ARTIFACT_ALGORITHM = "A256GCM" as const;
export const DEFAULT_MIGRATION_ARTIFACT_LIMITS = Object.freeze({
  maxBytes: 16 * 1024 * 1024,
  maxRecords: 10_000,
  maxLifetimeMs: 15 * 60 * 1000,
  maxClockSkewMs: 30_000,
});

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX_SHA256 = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const RECORD_KIND = /^[A-Z][A-Z0-9_]{0,63}$/;

export type MigrationSourceOwner = "USER_SERVICE" | "AUTH_SERVICE";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type MigrationKey = Readonly<{
  id: string;
  bytes: Buffer;
}>;

export type UnsealedMigrationRecord = Readonly<{
  kind: string;
  sourceId: string;
  body: JsonValue;
}>;

export type MigrationRecord = UnsealedMigrationRecord &
  Readonly<{ recordHmac: string }>;

export type MigrationManifest = Readonly<{
  version: 1;
  sourceOwner: MigrationSourceOwner;
  migrationId: string;
  destinationRealmId: string;
  destinationKeyId: string;
  recordHmacKeyId: string;
  sourceCreatedAt: string;
  expiresAt: string;
  recordCount: number;
  recordsDigest: string;
}>;

export type SealedMigrationArtifact = Readonly<{
  version: 1;
  algorithm: "A256GCM";
  destinationRealmId: string;
  destinationKeyId: string;
  nonce: string;
  ciphertext: string;
  authenticationTag: string;
}>;

export type OpenedMigrationArtifact = Readonly<{
  manifest: MigrationManifest;
  manifestHmac: string;
  manifestDigest: string;
  records: readonly MigrationRecord[];
}>;

type ArtifactLimits = Partial<typeof DEFAULT_MIGRATION_ARTIFACT_LIMITS>;

function fail(reason: string): never {
  throw new Error(`migration_artifact_${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, i) => key === wanted[i])
  );
}

function canonicalValue(value: unknown, seen: Set<object>): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("json_number_invalid");
    return String(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail("json_cycle");
    seen.add(value);
    const result = `[${value.map((item) => canonicalValue(item, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    if (seen.has(value)) fail("json_cycle");
    seen.add(value);
    const result = `{${Object.keys(value)
      .sort()
      .map((key) => {
        if (value[key] === undefined) fail("json_undefined");
        return `${JSON.stringify(key)}:${canonicalValue(value[key], seen)}`;
      })
      .join(",")}}`;
    seen.delete(value);
    return result;
  }
  return fail("json_value_invalid");
}

export function canonicalMigrationJson(value: JsonValue): string {
  return canonicalValue(value, new Set<object>());
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: MigrationKey, value: string): string {
  return createHmac("sha256", key.bytes).update(value, "utf8").digest("hex");
}

function assertUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_V4.test(value))
    fail(`${label}_invalid`);
}

function assertOwner(value: unknown): asserts value is MigrationSourceOwner {
  if (value !== "USER_SERVICE" && value !== "AUTH_SERVICE")
    fail("source_owner_invalid");
}

function assertIsoTime(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") fail(`${label}_invalid`);
  const time = Date.parse(value);
  if (!Number.isSafeInteger(time) || new Date(time).toISOString() !== value) {
    fail(`${label}_invalid`);
  }
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function decodeBase64url(value: unknown, bytes: number, label: string): Buffer {
  if (typeof value !== "string" || !BASE64URL.test(value))
    fail(`${label}_invalid`);
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== bytes || base64url(decoded) !== value)
    fail(`${label}_invalid`);
  return decoded;
}

export function migrationKeyFromBase64url(
  id: string,
  secret: string,
): MigrationKey {
  assertUuid(id, "key_id");
  return Object.freeze({
    id,
    bytes: decodeBase64url(secret, 32, "key_secret"),
  });
}

function assertKey(key: MigrationKey, expectedId?: string): void {
  assertUuid(key.id, "key_id");
  if (!Buffer.isBuffer(key.bytes) || key.bytes.length !== 32)
    fail("key_secret_invalid");
  if (expectedId !== undefined && key.id !== expectedId)
    fail("key_id_mismatch");
}

function canonicalRecordInput(
  sourceOwner: MigrationSourceOwner,
  migrationId: string,
  record: UnsealedMigrationRecord,
): string {
  return canonicalMigrationJson([
    "nebula-realm-auth-migration-record",
    "1",
    sourceOwner,
    migrationId,
    record.kind,
    record.sourceId,
    canonicalMigrationJson(record.body),
  ]);
}

function canonicalManifest(manifest: MigrationManifest): string {
  return canonicalMigrationJson([
    "nebula-realm-auth-migration-manifest",
    "1",
    manifest.sourceOwner,
    manifest.migrationId,
    manifest.destinationRealmId,
    manifest.destinationKeyId,
    manifest.recordHmacKeyId,
    manifest.sourceCreatedAt,
    manifest.expiresAt,
    String(manifest.recordCount),
    manifest.recordsDigest,
  ]);
}

function canonicalAad(
  artifact: Pick<
    SealedMigrationArtifact,
    "version" | "algorithm" | "destinationRealmId" | "destinationKeyId"
  >,
): string {
  return canonicalMigrationJson([
    "nebula-realm-auth-migration-envelope",
    String(artifact.version),
    artifact.algorithm,
    artifact.destinationRealmId,
    artifact.destinationKeyId,
  ]);
}

function mergedLimits(limits?: ArtifactLimits) {
  const merged = { ...DEFAULT_MIGRATION_ARTIFACT_LIMITS, ...limits };
  for (const [name, value] of Object.entries(merged)) {
    if (!Number.isSafeInteger(value) || value <= 0)
      fail(`limit_${name}_invalid`);
  }
  return merged;
}

function assertRecordShape(record: UnsealedMigrationRecord): void {
  if (!RECORD_KIND.test(record.kind)) fail("record_kind_invalid");
  assertUuid(record.sourceId, "record_source_id");
  canonicalMigrationJson(record.body);
}

export function sealMigrationArtifact(input: {
  sourceOwner: MigrationSourceOwner;
  migrationId: string;
  destinationRealmId: string;
  sourceCreatedAt: string;
  expiresAt: string;
  records: readonly UnsealedMigrationRecord[];
  recordHmacKey: MigrationKey;
  destinationKey: MigrationKey;
  limits?: ArtifactLimits;
  nonce?: Buffer;
}): {
  serialized: string;
  artifact: SealedMigrationArtifact;
  opened: OpenedMigrationArtifact;
} {
  const limits = mergedLimits(input.limits);
  assertOwner(input.sourceOwner);
  assertUuid(input.migrationId, "migration_id");
  assertUuid(input.destinationRealmId, "destination_realm_id");
  assertIsoTime(input.sourceCreatedAt, "source_created_at");
  assertIsoTime(input.expiresAt, "expires_at");
  assertKey(input.recordHmacKey);
  assertKey(input.destinationKey);
  const createdAt = Date.parse(input.sourceCreatedAt);
  const expiresAt = Date.parse(input.expiresAt);
  if (expiresAt <= createdAt || expiresAt - createdAt > limits.maxLifetimeMs) {
    fail("lifetime_invalid");
  }
  if (input.records.length > limits.maxRecords) fail("record_limit_exceeded");

  const seen = new Set<string>();
  const records = input.records.map((record) => {
    assertRecordShape(record);
    const identity = `${record.kind}:${record.sourceId}`;
    if (seen.has(identity)) fail("record_duplicate");
    seen.add(identity);
    return {
      ...record,
      recordHmac: hmac(
        input.recordHmacKey,
        canonicalRecordInput(input.sourceOwner, input.migrationId, record),
      ),
    } satisfies MigrationRecord;
  });
  records.sort((left, right) =>
    `${left.kind}:${left.sourceId}`.localeCompare(
      `${right.kind}:${right.sourceId}`,
    ),
  );
  const recordsDigest = sha256(canonicalMigrationJson(records));
  const manifest: MigrationManifest = {
    version: MIGRATION_ARTIFACT_VERSION,
    sourceOwner: input.sourceOwner,
    migrationId: input.migrationId,
    destinationRealmId: input.destinationRealmId,
    destinationKeyId: input.destinationKey.id,
    recordHmacKeyId: input.recordHmacKey.id,
    sourceCreatedAt: input.sourceCreatedAt,
    expiresAt: input.expiresAt,
    recordCount: records.length,
    recordsDigest,
  };
  const manifestHmac = hmac(input.recordHmacKey, canonicalManifest(manifest));
  const manifestDigest = sha256(
    canonicalMigrationJson({ manifest, manifestHmac } as unknown as JsonValue),
  );
  const plaintext = canonicalMigrationJson({
    manifest,
    manifestHmac,
    records,
  } as unknown as JsonValue);
  const nonce = input.nonce ?? randomBytes(12);
  if (!Buffer.isBuffer(nonce) || nonce.length !== 12) fail("nonce_invalid");
  const header = {
    version: MIGRATION_ARTIFACT_VERSION,
    algorithm: MIGRATION_ARTIFACT_ALGORITHM,
    destinationRealmId: input.destinationRealmId,
    destinationKeyId: input.destinationKey.id,
  } as const;
  const cipher = createCipheriv(
    "aes-256-gcm",
    input.destinationKey.bytes,
    nonce,
  );
  cipher.setAAD(Buffer.from(canonicalAad(header), "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const artifact: SealedMigrationArtifact = {
    ...header,
    nonce: base64url(nonce),
    ciphertext: base64url(ciphertext),
    authenticationTag: base64url(cipher.getAuthTag()),
  };
  const serialized = `${canonicalMigrationJson(artifact as unknown as JsonValue)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > limits.maxBytes)
    fail("size_limit_exceeded");
  return {
    serialized,
    artifact,
    opened: { manifest, manifestHmac, manifestDigest, records },
  };
}

function parseEnvelope(serialized: string): SealedMigrationArtifact {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return fail("envelope_invalid");
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "algorithm",
      "destinationRealmId",
      "destinationKeyId",
      "nonce",
      "ciphertext",
      "authenticationTag",
    ]) ||
    value.version !== MIGRATION_ARTIFACT_VERSION ||
    value.algorithm !== MIGRATION_ARTIFACT_ALGORITHM
  ) {
    return fail("envelope_invalid");
  }
  assertUuid(value.destinationRealmId, "destination_realm_id");
  assertUuid(value.destinationKeyId, "destination_key_id");
  if (
    typeof value.nonce !== "string" ||
    typeof value.ciphertext !== "string" ||
    typeof value.authenticationTag !== "string"
  ) {
    return fail("envelope_invalid");
  }
  return value as SealedMigrationArtifact;
}

function parsePayload(value: unknown): {
  manifest: MigrationManifest;
  manifestHmac: string;
  records: MigrationRecord[];
} {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["manifest", "manifestHmac", "records"])
  ) {
    return fail("payload_invalid");
  }
  const manifest = value.manifest;
  if (
    !isRecord(manifest) ||
    !hasExactKeys(manifest, [
      "version",
      "sourceOwner",
      "migrationId",
      "destinationRealmId",
      "destinationKeyId",
      "recordHmacKeyId",
      "sourceCreatedAt",
      "expiresAt",
      "recordCount",
      "recordsDigest",
    ]) ||
    manifest.version !== 1
  )
    return fail("manifest_invalid");
  assertOwner(manifest.sourceOwner);
  assertUuid(manifest.migrationId, "migration_id");
  assertUuid(manifest.destinationRealmId, "destination_realm_id");
  assertUuid(manifest.destinationKeyId, "destination_key_id");
  assertUuid(manifest.recordHmacKeyId, "record_hmac_key_id");
  assertIsoTime(manifest.sourceCreatedAt, "source_created_at");
  assertIsoTime(manifest.expiresAt, "expires_at");
  if (
    !Number.isSafeInteger(manifest.recordCount) ||
    Number(manifest.recordCount) < 0 ||
    !HEX_SHA256.test(String(manifest.recordsDigest))
  ) {
    return fail("manifest_invalid");
  }
  if (
    typeof value.manifestHmac !== "string" ||
    !HEX_SHA256.test(value.manifestHmac) ||
    !Array.isArray(value.records)
  ) {
    return fail("payload_invalid");
  }
  return {
    manifest: manifest as unknown as MigrationManifest,
    manifestHmac: value.manifestHmac,
    records: value.records as MigrationRecord[],
  };
}

function equalHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function openMigrationArtifact(
  input: string | Buffer,
  options: {
    expectedSourceOwner: MigrationSourceOwner;
    expectedDestinationRealmId: string;
    destinationKey: MigrationKey;
    recordHmacKey: MigrationKey;
    now?: Date;
    limits?: ArtifactLimits;
  },
): OpenedMigrationArtifact {
  const limits = mergedLimits(options.limits);
  const serialized = Buffer.isBuffer(input) ? input.toString("utf8") : input;
  if (Buffer.byteLength(serialized, "utf8") > limits.maxBytes)
    fail("size_limit_exceeded");
  assertOwner(options.expectedSourceOwner);
  assertUuid(options.expectedDestinationRealmId, "destination_realm_id");
  assertKey(options.destinationKey);
  assertKey(options.recordHmacKey);
  const artifact = parseEnvelope(serialized);
  if (artifact.destinationRealmId !== options.expectedDestinationRealmId)
    fail("wrong_destination_realm");
  if (artifact.destinationKeyId !== options.destinationKey.id)
    fail("wrong_destination_key");
  const nonce = decodeBase64url(artifact.nonce, 12, "nonce");
  const tag = decodeBase64url(
    artifact.authenticationTag,
    16,
    "authentication_tag",
  );
  let plaintext: string;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      options.destinationKey.bytes,
      nonce,
    );
    decipher.setAAD(Buffer.from(canonicalAad(artifact), "utf8"));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([
      decipher.update(Buffer.from(artifact.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return fail("authentication_failed");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(plaintext);
  } catch {
    return fail("payload_invalid");
  }
  if (canonicalMigrationJson(raw as JsonValue) !== plaintext)
    fail("payload_not_canonical");
  const payload = parsePayload(raw);
  const { manifest, records } = payload;
  if (manifest.sourceOwner !== options.expectedSourceOwner)
    fail("wrong_source_owner");
  if (
    manifest.destinationRealmId !== artifact.destinationRealmId ||
    manifest.destinationKeyId !== artifact.destinationKeyId
  ) {
    fail("destination_binding_invalid");
  }
  assertKey(options.recordHmacKey, manifest.recordHmacKeyId);
  const createdAt = Date.parse(manifest.sourceCreatedAt);
  const expiresAt = Date.parse(manifest.expiresAt);
  const now = (options.now ?? new Date()).getTime();
  if (expiresAt <= createdAt || expiresAt - createdAt > limits.maxLifetimeMs)
    fail("lifetime_invalid");
  if (now < createdAt - limits.maxClockSkewMs) fail("not_yet_valid");
  if (now >= expiresAt) fail("expired");
  if (
    records.length !== manifest.recordCount ||
    records.length > limits.maxRecords
  )
    fail("record_count_invalid");
  const expectedManifestHmac = hmac(
    options.recordHmacKey,
    canonicalManifest(manifest),
  );
  if (!equalHex(expectedManifestHmac, payload.manifestHmac))
    fail("manifest_hmac_invalid");
  const seen = new Set<string>();
  let previous = "";
  for (const record of records) {
    if (
      !isRecord(record) ||
      !hasExactKeys(record, ["kind", "sourceId", "body", "recordHmac"])
    )
      fail("record_invalid");
    assertRecordShape(record);
    if (
      typeof record.recordHmac !== "string" ||
      !HEX_SHA256.test(record.recordHmac)
    )
      fail("record_invalid");
    const identity = `${record.kind}:${record.sourceId}`;
    if (
      seen.has(identity) ||
      (previous && identity.localeCompare(previous) < 0)
    )
      fail("record_order_invalid");
    seen.add(identity);
    previous = identity;
    const expected = hmac(
      options.recordHmacKey,
      canonicalRecordInput(manifest.sourceOwner, manifest.migrationId, record),
    );
    if (!equalHex(expected, record.recordHmac)) fail("record_hmac_invalid");
  }
  if (
    !equalHex(sha256(canonicalMigrationJson(records)), manifest.recordsDigest)
  )
    fail("records_digest_invalid");
  const manifestDigest = sha256(
    canonicalMigrationJson({
      manifest,
      manifestHmac: payload.manifestHmac,
    } as unknown as JsonValue),
  );
  return {
    manifest,
    manifestHmac: payload.manifestHmac,
    manifestDigest,
    records,
  };
}
