import type { S2SCallerKind } from "./s2s.crypto";

// DI client provider tokens and protobuf service names.
export const AUTH_SERVICE = "AUTH_SERVICE" as const;
export const AUTH_SERVICE_NAME = "AuthService" as const;
export const USER_SERVICE = "USER_SERVICE" as const;
export const USER_SERVICE_NAME = "UserService" as const;
export const PRODUCT_SERVICE = "PRODUCT_SERVICE" as const;
export const PRODUCT_SERVICE_NAME = "ProductService" as const;
export const SETTINGS_SERVICE = "SETTINGS_SERVICE" as const;
export const SETTINGS_SERVICE_NAME = "SettingsService" as const;
export const ORDER_SERVICE = "ORDER_SERVICE" as const;
export const ORDER_SERVICE_NAME = "OrderService" as const;
export const MEDIA_SERVICE = "MEDIA_SERVICE" as const;
export const MEDIA_SERVICE_NAME = "MediaService" as const;
export const BLOG_SERVICE = "BLOG_SERVICE" as const;
export const BLOG_SERVICE_NAME = "BlogService" as const;
export const TAXONOMY_SERVICE = "TAXONOMY_SERVICE" as const;
export const TAXONOMY_SERVICE_NAME = "TaxonomyService" as const;

// Stable deployment identities used as S2S audiences.
export const AUTH_SERVICE_TARGET = "auth-service" as const;
export const USER_SERVICE_TARGET = "user-service" as const;
export const PRODUCT_SERVICE_TARGET = "product-service" as const;
export const SETTINGS_SERVICE_TARGET = "settings-service" as const;
export const ORDER_SERVICE_TARGET = "order-service" as const;
export const MEDIA_SERVICE_TARGET = "media-service" as const;
export const BLOG_SERVICE_TARGET = "blog-service" as const;
export const TAXONOMY_SERVICE_TARGET = "taxonomy-service" as const;

export const GATEWAY_CALLER_ID = "gateway" as const;
export const GATEWAY_OUTBOUND_TARGETS = Object.freeze([
  AUTH_SERVICE_TARGET,
  USER_SERVICE_TARGET,
  PRODUCT_SERVICE_TARGET,
  SETTINGS_SERVICE_TARGET,
  BLOG_SERVICE_TARGET,
  ORDER_SERVICE_TARGET,
  TAXONOMY_SERVICE_TARGET,
  MEDIA_SERVICE_TARGET,
]);

export const AUTHORIZATION_HEADER = "authorization" as const;
export const S2S_SIGNATURE_HEADER_DEFAULT = "x-s2s-signature" as const;
export const X_SVC_HEADER = "x-svc" as const;
export const X_SVC_UPSTREAM_HEADER = "x-svc-upstream" as const;
export const X_S2S_VERSION_HEADER = "x-s2s-version" as const;
export const X_S2S_KIND_HEADER = "x-s2s-kind" as const;
export const X_S2S_TARGET_HEADER = "x-s2s-target" as const;
export const X_S2S_METHOD_HEADER = "x-s2s-method" as const;
export const X_S2S_PATH_HEADER = "x-s2s-path" as const;
export const X_S2S_ISSUED_AT_HEADER = "x-s2s-issued-at-ms" as const;
export const X_S2S_NONCE_HEADER = "x-s2s-nonce" as const;
export const X_REQUEST_ID_HEADER = "x-request-id" as const;
export const X_S2S_KEY_ID_HEADER = "x-s2s-key-id" as const;
export const X_S2S_BODY_SHA256_HEADER = "x-s2s-body-sha256" as const;
export const X_S2S_CONTEXT_HEADER = "x-s2s-context" as const;
export const X_S2S_CONTEXT_SHA256_HEADER = "x-s2s-context-sha256" as const;

export const ENV_SERVICE_NAME = "SERVICE_NAME" as const;
export const ENV_SERVICE_NAME_ALT = "SVC_NAME" as const;
export const ENV_PUBLIC_MODE = "PUBLIC_MODE" as const;
export const ENV_S2S_SIGNATURE_HEADER = "S2S_SIGNATURE_HEADER" as const;
export const ENV_S2S_OUTBOUND_KEYS = "S2S_OUTBOUND_KEYS" as const;
export const ENV_S2S_INBOUND_KEYS = "S2S_INBOUND_KEYS" as const;
export const ENV_GATEWAY_OUTBOUND_KEYS = "GATEWAY_OUTBOUND_KEYS" as const;
export const ENV_GATEWAY_INBOUND_KEYS = "GATEWAY_INBOUND_KEYS" as const;
export const ENV_S2S_MAX_CLOCK_SKEW_MS = "S2S_MAX_CLOCK_SKEW_MS" as const;
export const ENV_S2S_REPLAY_STORE = "S2S_REPLAY_STORE" as const;

export type PublicMode = "OPEN" | "OPTIONAL_AUTH" | "GATEWAY_ONLY";
export const PublicModes = Object.freeze<PublicMode[]>([
  "OPEN",
  "OPTIONAL_AUTH",
  "GATEWAY_ONLY",
]);

export type S2SKey = {
  id: string;
  secret: string;
};

export type S2SPreviousKey = S2SKey & {
  notAfterMs: number;
};

export type S2SInboundKeySet = {
  current: S2SKey;
  previous?: S2SPreviousKey;
};

type RawKey = {
  id?: unknown;
  secret?: unknown;
  notAfter?: unknown;
  notAfterMs?: unknown;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

function requiredSafeId(value: unknown, label: string): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(`${label}_invalid`);
  }
  return value;
}

function requiredSecret(value: unknown, label: string): string {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") < 32) {
    throw new Error(`${label}_must_be_at_least_32_bytes`);
  }
  return value;
}

function parseJsonRecord(
  raw: string | undefined,
  envName: string,
): Record<string, unknown> {
  if (!raw?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${envName}_must_be_valid_json`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${envName}_must_be_a_json_object`);
  }
  return parsed as Record<string, unknown>;
}

function parseKey(raw: unknown, label: string): S2SKey {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label}_must_be_an_object`);
  }
  const value = raw as RawKey;
  return {
    id: requiredSafeId(value.id, `${label}_id`),
    secret: requiredSecret(value.secret, `${label}_secret`),
  };
}

function parsePreviousKey(raw: unknown, label: string): S2SPreviousKey {
  const key = parseKey(raw, label);
  const value = raw as RawKey;
  const candidate = value.notAfterMs ?? value.notAfter;
  const notAfterMs =
    typeof candidate === "number"
      ? candidate
      : typeof candidate === "string"
        ? Date.parse(candidate)
        : Number.NaN;
  if (!Number.isFinite(notAfterMs) || notAfterMs <= 0) {
    throw new Error(`${label}_not_after_invalid`);
  }
  return { ...key, notAfterMs };
}

export function parseOutboundKeyMap(
  raw: string | undefined,
  envName: string,
): Record<string, S2SKey> {
  const parsed = parseJsonRecord(raw, envName);
  const out: Record<string, S2SKey> = {};
  for (const [target, value] of Object.entries(parsed)) {
    const safeTarget = requiredSafeId(target, `${envName}_target`);
    out[safeTarget] = parseKey(value, `${envName}_${safeTarget}`);
  }
  return out;
}

/**
 * Validate an outbound-only trust map against the caller's declared reach.
 * Extra targets are rejected as undeclared authority, while a missing target
 * would make the gateway fail later and less clearly on its first call.
 */
export function parseExactOutboundKeyMap(
  raw: string | undefined,
  envName: string,
  requiredTargets: readonly string[],
): Record<string, S2SKey> {
  if (requiredTargets.length === 0) {
    throw new Error(`${envName}_required_targets_empty`);
  }

  const targets = requiredTargets.map((target) =>
    requiredSafeId(target, `${envName}_required_target`),
  );
  if (new Set(targets).size !== targets.length) {
    throw new Error(`${envName}_required_targets_duplicate`);
  }

  const parsed = parseOutboundKeyMap(raw, envName);
  const configuredTargets = Object.keys(parsed);
  const requiredSet = new Set(targets);
  const configuredSet = new Set(configuredTargets);
  const missing = targets.filter((target) => !configuredSet.has(target));
  const unexpected = configuredTargets.filter(
    (target) => !requiredSet.has(target),
  );

  if (missing.length > 0) {
    throw new Error(`${envName}_missing_targets_${missing.join(",")}`);
  }
  if (unexpected.length > 0) {
    throw new Error(`${envName}_unexpected_targets_${unexpected.join(",")}`);
  }

  const secrets = new Set<string>();
  for (const key of Object.values(parsed)) {
    if (secrets.has(key.secret)) {
      throw new Error(`${envName}_pairwise_secrets_must_be_distinct`);
    }
    secrets.add(key.secret);
  }

  return parsed;
}

export function parseInboundKeyMap(
  raw: string | undefined,
  envName: string,
): Record<string, S2SInboundKeySet> {
  const parsed = parseJsonRecord(raw, envName);
  const out: Record<string, S2SInboundKeySet> = {};
  for (const [caller, value] of Object.entries(parsed)) {
    const safeCaller = requiredSafeId(caller, `${envName}_caller`);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${envName}_${safeCaller}_must_be_an_object`);
    }
    const record = value as Record<string, unknown>;
    const current = parseKey(
      record.current,
      `${envName}_${safeCaller}_current`,
    );
    const previous = record.previous
      ? parsePreviousKey(record.previous, `${envName}_${safeCaller}_previous`)
      : undefined;
    if (
      previous &&
      (previous.id === current.id || previous.secret === current.secret)
    ) {
      throw new Error(`${envName}_${safeCaller}_rotation_keys_must_differ`);
    }
    out[safeCaller] = { current, previous };
  }
  return out;
}

export function resolveS2SSignHeader(): string {
  const header =
    process.env[ENV_S2S_SIGNATURE_HEADER]?.trim().toLowerCase() ||
    S2S_SIGNATURE_HEADER_DEFAULT;
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(header)) {
    throw new Error("S2S_SIGNATURE_HEADER_invalid");
  }
  return header;
}

export function resolveServiceName(): string {
  return (
    process.env[ENV_SERVICE_NAME]?.trim() ||
    process.env[ENV_SERVICE_NAME_ALT]?.trim() ||
    ""
  );
}

export function requireServiceName(): string {
  const name = resolveServiceName();
  return requiredSafeId(name, "service_name");
}

function outboundEnv(kind: S2SCallerKind): string {
  return kind === "gateway" ? ENV_GATEWAY_OUTBOUND_KEYS : ENV_S2S_OUTBOUND_KEYS;
}

function inboundEnv(kind: S2SCallerKind): string {
  return kind === "gateway" ? ENV_GATEWAY_INBOUND_KEYS : ENV_S2S_INBOUND_KEYS;
}

export function resolveOutboundS2SKey(
  kind: S2SCallerKind,
  target: string,
): S2SKey | undefined {
  const envName = outboundEnv(kind);
  return parseOutboundKeyMap(process.env[envName], envName)[target];
}

export function resolveInboundS2SKeySet(
  kind: S2SCallerKind,
  caller: string,
): S2SInboundKeySet | undefined {
  const envName = inboundEnv(kind);
  return parseInboundKeyMap(process.env[envName], envName)[caller];
}

export function resolveS2SMaxClockSkewMs(): number {
  const raw = process.env[ENV_S2S_MAX_CLOCK_SKEW_MS] ?? "30000";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1_000 || value > 120_000) {
    throw new Error("S2S_MAX_CLOCK_SKEW_MS_must_be_1000_to_120000");
  }
  return value;
}

export function resolvePublicMode(): PublicMode {
  const raw = (process.env[ENV_PUBLIC_MODE] ?? "OPTIONAL_AUTH").toUpperCase();
  return PublicModes.includes(raw as PublicMode)
    ? (raw as PublicMode)
    : "OPTIONAL_AUTH";
}

function allSecrets(
  values: Record<string, S2SInboundKeySet | S2SKey>,
): Set<string> {
  const secrets = new Set<string>();
  for (const value of Object.values(values)) {
    if ("current" in value) {
      secrets.add(value.current.secret);
      if (value.previous) secrets.add(value.previous.secret);
    } else {
      secrets.add(value.secret);
    }
  }
  return secrets;
}

/** Validate the trust bundle before an internal listener accepts traffic. */
export function assertS2SRuntimeConfiguration(): void {
  requireServiceName();
  resolveS2SSignHeader();
  resolveS2SMaxClockSkewMs();

  const serviceInbound = parseInboundKeyMap(
    process.env[ENV_S2S_INBOUND_KEYS],
    ENV_S2S_INBOUND_KEYS,
  );
  const gatewayInbound = parseInboundKeyMap(
    process.env[ENV_GATEWAY_INBOUND_KEYS],
    ENV_GATEWAY_INBOUND_KEYS,
  );
  const serviceOutbound = parseOutboundKeyMap(
    process.env[ENV_S2S_OUTBOUND_KEYS],
    ENV_S2S_OUTBOUND_KEYS,
  );
  const gatewayOutbound = parseOutboundKeyMap(
    process.env[ENV_GATEWAY_OUTBOUND_KEYS],
    ENV_GATEWAY_OUTBOUND_KEYS,
  );

  if (
    Object.keys(serviceInbound).length === 0 &&
    Object.keys(gatewayInbound).length === 0
  ) {
    throw new Error("s2s_inbound_trust_bundle_required");
  }

  const serviceSecrets = new Set([
    ...allSecrets(serviceInbound),
    ...allSecrets(serviceOutbound),
  ]);
  const gatewaySecrets = new Set([
    ...allSecrets(gatewayInbound),
    ...allSecrets(gatewayOutbound),
  ]);
  for (const secret of serviceSecrets) {
    if (gatewaySecrets.has(secret)) {
      throw new Error("gateway_and_service_s2s_secrets_must_be_distinct");
    }
  }

  const replayMode = process.env[ENV_S2S_REPLAY_STORE]?.toLowerCase();
  if (process.env.NODE_ENV === "production" && replayMode === "memory") {
    throw new Error("memory_s2s_replay_store_forbidden_in_production");
  }
}

/** Validate only the trust material an outbound-only gateway actually owns. */
export function assertGatewayOutboundRuntimeConfiguration(
  requiredTargets: readonly string[] = GATEWAY_OUTBOUND_TARGETS,
): void {
  resolveS2SSignHeader();
  parseExactOutboundKeyMap(
    process.env[ENV_GATEWAY_OUTBOUND_KEYS],
    ENV_GATEWAY_OUTBOUND_KEYS,
    requiredTargets,
  );
}

export function isGatewayOnly(): boolean {
  return resolvePublicMode() === "GATEWAY_ONLY";
}
export function isOptionalAuth(): boolean {
  return resolvePublicMode() === "OPTIONAL_AUTH";
}
export function isOpenMode(): boolean {
  return resolvePublicMode() === "OPEN";
}
