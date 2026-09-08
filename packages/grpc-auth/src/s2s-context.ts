import { createHash, createHmac } from "node:crypto";

export const S2S_CONTEXT_VERSION = "1" as const;
export const S2S_CONTEXT_VERSION_V2 = "2" as const;
export const S2S_SESSION_REF_PREFIX = "sr1_" as const;
export const S2S_CONTEXT_MAX_BYTES = 1024;
export const S2S_CONTEXT_V2_MAX_BYTES = 2048;
export const S2S_CONTEXT_MAX_ENCODED_LENGTH = Math.ceil(
  (S2S_CONTEXT_V2_MAX_BYTES * 4) / 3,
);

export const S2S_CONTEXT_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const ACTOR_ROLES = new Set<S2SActorRole>(["user", "admin", "root-admin"]);
const V1_TOP_LEVEL_KEYS = new Set([
  "version",
  "applicationId",
  "tenantId",
  "siteId",
  "channelId",
  "actor",
]);
const V1_ACTOR_KEYS = new Set(["userId", "role", "sessionRef"]);
const V2_RESOLUTION_KEYS = new Set([
  "version",
  "purpose",
  "resolutionStage",
  "application",
  "actor",
]);
const V2_APPLICATION_KEYS = new Set([
  "applicationId",
  "applicationProfile",
  "tenantId",
  "siteId",
  "channelId",
  "channelKind",
]);
const V2_ACTOR_KEYS = new Set(["userId", "sessionRef"]);

export type S2SActorRole = "user" | "admin" | "root-admin";

export type S2SLegacyActorAssertion = Readonly<{
  userId: string;
  role: S2SActorRole;
  sessionRef: string;
}>;

export type S2SActorIdentity = Readonly<{
  userId: string;
  sessionRef: string;
}>;

export type S2SActorAssertion = S2SLegacyActorAssertion | S2SActorIdentity;

export type S2SRequestContext = Readonly<{
  applicationId: string;
  tenantId: string;
  siteId: string;
  channelId: string;
}>;

export type S2SSignedContextV1 = S2SRequestContext &
  Readonly<{
    version: typeof S2S_CONTEXT_VERSION;
    actor?: S2SLegacyActorAssertion;
  }>;

export type S2SApplicationContextV2 = Readonly<{
  applicationId: string;
  applicationProfile: "storefront-web" | "admin-web" | "mobile";
  tenantId: string;
  siteId: string;
  channelId: string;
  channelKind: "WEB" | "ANDROID" | "IOS";
}>;

export type S2SResolutionAuthorityContext = Readonly<{
  version: typeof S2S_CONTEXT_VERSION_V2;
  purpose: "RESOLUTION";
  resolutionStage: "AUTHORITY";
  application?: S2SApplicationContextV2;
  actor?: S2SActorIdentity;
}>;

export type S2SSignedContext =
  | S2SSignedContextV1
  | S2SResolutionAuthorityContext;

export type EncodedS2SContext = Readonly<{
  context: S2SSignedContext;
  canonicalJson: string;
  encoded: string;
  sha256: string;
}>;

/** Derive the non-secret actor session reference used in signed context. */
export function deriveS2SSessionRef(secret: string, sessionId: string): string {
  if (!secret) throw new Error("s2s_session_ref_secret_missing");
  if (!sessionId) throw new Error("s2s_session_ref_session_id_missing");
  return `${S2S_SESSION_REF_PREFIX}${createHmac("sha256", secret)
    .update(`nebula-session-ref:v1:${sessionId}`)
    .digest("base64url")
    .slice(0, 32)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[],
  label: string,
): void {
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.has(key))) {
    throw new Error(`${label}_unknown_field`);
  }
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new Error(`${label}_required_field_missing`);
  }
}

function assertIdentifier(
  value: unknown,
  label: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !S2S_CONTEXT_IDENTIFIER_PATTERN.test(value)
  ) {
    throw new Error(`${label}_invalid`);
  }
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > 128) throw new Error(`${label}_invalid`);
}

function normalizeV1Actor(value: unknown): S2SLegacyActorAssertion | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("s2s_context_actor_invalid");
  assertExactKeys(
    value,
    V1_ACTOR_KEYS,
    ["userId", "role", "sessionRef"],
    "s2s_context_actor",
  );
  assertIdentifier(value.userId, "s2s_context_actor_user_id");
  assertIdentifier(value.sessionRef, "s2s_context_actor_session_ref");
  if (
    typeof value.role !== "string" ||
    !ACTOR_ROLES.has(value.role as S2SActorRole)
  ) {
    throw new Error("s2s_context_actor_role_invalid");
  }
  return Object.freeze({
    userId: value.userId,
    role: value.role as S2SActorRole,
    sessionRef: value.sessionRef,
  });
}

function normalizeV2Actor(value: unknown): S2SActorIdentity | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("s2s_context_actor_invalid");
  assertExactKeys(
    value,
    V2_ACTOR_KEYS,
    ["userId", "sessionRef"],
    "s2s_context_actor",
  );
  assertIdentifier(value.userId, "s2s_context_actor_user_id");
  assertIdentifier(value.sessionRef, "s2s_context_actor_session_ref");
  return Object.freeze({
    userId: value.userId,
    sessionRef: value.sessionRef,
  });
}

function normalizeV2Application(
  value: unknown,
): S2SApplicationContextV2 | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error("s2s_context_application_invalid");
  assertExactKeys(
    value,
    V2_APPLICATION_KEYS,
    [
      "applicationId",
      "applicationProfile",
      "tenantId",
      "siteId",
      "channelId",
      "channelKind",
    ],
    "s2s_context_application",
  );
  assertIdentifier(value.applicationId, "s2s_context_application_id");
  assertIdentifier(value.tenantId, "s2s_context_tenant_id");
  assertIdentifier(value.siteId, "s2s_context_site_id");
  assertIdentifier(value.channelId, "s2s_context_channel_id");
  if (
    value.applicationProfile !== "storefront-web" &&
    value.applicationProfile !== "admin-web" &&
    value.applicationProfile !== "mobile"
  ) {
    throw new Error("s2s_context_application_profile_invalid");
  }
  if (
    value.channelKind !== "WEB" &&
    value.channelKind !== "ANDROID" &&
    value.channelKind !== "IOS"
  ) {
    throw new Error("s2s_context_channel_kind_invalid");
  }
  return Object.freeze({
    applicationId: value.applicationId,
    applicationProfile: value.applicationProfile,
    tenantId: value.tenantId,
    siteId: value.siteId,
    channelId: value.channelId,
    channelKind: value.channelKind,
  });
}

export function normalizeS2SSignedContext(value: unknown): S2SSignedContext {
  if (!isRecord(value)) throw new Error("s2s_context_invalid");

  if (value.version === S2S_CONTEXT_VERSION) {
    assertExactKeys(
      value,
      V1_TOP_LEVEL_KEYS,
      ["version", "applicationId", "tenantId", "siteId", "channelId"],
      "s2s_context",
    );
    assertIdentifier(value.applicationId, "s2s_context_application_id");
    assertIdentifier(value.tenantId, "s2s_context_tenant_id");
    assertIdentifier(value.siteId, "s2s_context_site_id");
    assertIdentifier(value.channelId, "s2s_context_channel_id");
    const actor = normalizeV1Actor(value.actor);
    return Object.freeze({
      version: S2S_CONTEXT_VERSION,
      applicationId: value.applicationId,
      tenantId: value.tenantId,
      siteId: value.siteId,
      channelId: value.channelId,
      ...(actor ? { actor } : {}),
    });
  }

  if (value.version === S2S_CONTEXT_VERSION_V2) {
    assertExactKeys(
      value,
      V2_RESOLUTION_KEYS,
      ["version", "purpose", "resolutionStage"],
      "s2s_context",
    );
    if (value.purpose !== "RESOLUTION") {
      throw new Error("s2s_context_purpose_unsupported");
    }
    if (value.resolutionStage !== "AUTHORITY") {
      throw new Error("s2s_context_resolution_stage_unsupported");
    }
    const application = normalizeV2Application(value.application);
    const actor = normalizeV2Actor(value.actor);
    return Object.freeze({
      version: S2S_CONTEXT_VERSION_V2,
      purpose: "RESOLUTION",
      resolutionStage: "AUTHORITY",
      ...(application ? { application } : {}),
      ...(actor ? { actor } : {}),
    });
  }

  throw new Error("s2s_context_version_unsupported");
}

export function canonicalS2SContext(context: S2SSignedContext): string {
  const normalized = normalizeS2SSignedContext(context);
  if (normalized.version === S2S_CONTEXT_VERSION) {
    return JSON.stringify({
      version: normalized.version,
      applicationId: normalized.applicationId,
      tenantId: normalized.tenantId,
      siteId: normalized.siteId,
      channelId: normalized.channelId,
      ...(normalized.actor
        ? {
            actor: {
              userId: normalized.actor.userId,
              role: normalized.actor.role,
              sessionRef: normalized.actor.sessionRef,
            },
          }
        : {}),
    });
  }

  return JSON.stringify({
    version: normalized.version,
    purpose: normalized.purpose,
    resolutionStage: normalized.resolutionStage,
    ...(normalized.application
      ? {
          application: {
            applicationId: normalized.application.applicationId,
            applicationProfile: normalized.application.applicationProfile,
            tenantId: normalized.application.tenantId,
            siteId: normalized.application.siteId,
            channelId: normalized.application.channelId,
            channelKind: normalized.application.channelKind,
          },
        }
      : {}),
    ...(normalized.actor
      ? {
          actor: {
            userId: normalized.actor.userId,
            sessionRef: normalized.actor.sessionRef,
          },
        }
      : {}),
  });
}

function digestContextBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function maxBytesFor(context: S2SSignedContext): number {
  return context.version === S2S_CONTEXT_VERSION
    ? S2S_CONTEXT_MAX_BYTES
    : S2S_CONTEXT_V2_MAX_BYTES;
}

export function encodeS2SSignedContext(
  context: S2SSignedContext,
): EncodedS2SContext {
  const normalized = normalizeS2SSignedContext(context);
  const canonicalJson = canonicalS2SContext(normalized);
  const bytes = Buffer.from(canonicalJson, "utf8");
  if (bytes.length > maxBytesFor(normalized)) {
    throw new Error("s2s_context_too_large");
  }
  return Object.freeze({
    context: normalized,
    canonicalJson,
    encoded: bytes.toString("base64url"),
    sha256: digestContextBytes(bytes),
  });
}

export function decodeS2SSignedContext(encoded: string): EncodedS2SContext {
  if (
    encoded.length === 0 ||
    encoded.length > S2S_CONTEXT_MAX_ENCODED_LENGTH ||
    !BASE64URL.test(encoded)
  ) {
    throw new Error("s2s_context_encoding_invalid");
  }

  const bytes = Buffer.from(encoded, "base64url");
  if (
    bytes.length === 0 ||
    bytes.length > S2S_CONTEXT_V2_MAX_BYTES ||
    bytes.toString("base64url") !== encoded
  ) {
    throw new Error("s2s_context_encoding_invalid");
  }
  const canonicalJson = bytes.toString("utf8");
  if (!Buffer.from(canonicalJson, "utf8").equals(bytes)) {
    throw new Error("s2s_context_utf8_invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalJson);
  } catch {
    throw new Error("s2s_context_json_invalid");
  }
  const context = normalizeS2SSignedContext(parsed);
  if (bytes.length > maxBytesFor(context)) {
    throw new Error("s2s_context_too_large");
  }
  if (canonicalS2SContext(context) !== canonicalJson) {
    throw new Error("s2s_context_not_canonical");
  }

  return Object.freeze({
    context,
    canonicalJson,
    encoded,
    sha256: digestContextBytes(bytes),
  });
}

export function requestContextFromSigned(
  context: S2SSignedContextV1,
): S2SRequestContext {
  return Object.freeze({
    applicationId: context.applicationId,
    tenantId: context.tenantId,
    siteId: context.siteId,
    channelId: context.channelId,
  });
}
