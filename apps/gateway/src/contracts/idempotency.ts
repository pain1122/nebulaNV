import { createHash } from "node:crypto";
import type { GatewayHttpMethod } from "./route-policy";

export const GATEWAY_IDEMPOTENCY_HEADER = "idempotency-key" as const;
export const GATEWAY_IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
export const GATEWAY_IDEMPOTENCY_KEY_MAX_BYTES = 128;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const STORAGE_PREFIX = "nebula:gateway:idempotency:v1:";

export type GatewayIdempotencyRequest = Readonly<{
  method: GatewayHttpMethod;
  routeId: string;
  params?: unknown;
  query?: unknown;
  body?: unknown;
}>;

export type GatewayIdempotencyScope = Readonly<{
  applicationId: string;
  actorId: string;
  routeId: string;
  key: string;
}>;

export type GatewayStoredResponse = Readonly<{
  status: number;
  body: unknown;
  headers: Readonly<Record<string, string | readonly string[]>>;
}>;

export type GatewayInFlightIdempotencyState = Readonly<{
  version: 1;
  state: "in-flight";
  requestHash: string;
  leaseId: string;
  startedAt: string;
}>;

export type GatewayCompletedIdempotencyState = Readonly<{
  version: 1;
  state: "completed";
  requestHash: string;
  response: GatewayStoredResponse;
  completedAt: string;
}>;

export type GatewayIdempotencyState =
  | GatewayInFlightIdempotencyState
  | GatewayCompletedIdempotencyState;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function canonicalValue(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("idempotency_value_not_finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error("idempotency_value_circular");
    seen.add(value);
    const serialized = `[${value.map((item) => canonicalValue(item, seen)).join(",")}]`;
    seen.delete(value);
    return serialized;
  }
  if (!isPlainRecord(value)) throw new Error("idempotency_value_not_json");
  if (seen.has(value)) throw new Error("idempotency_value_circular");
  seen.add(value);
  const fields = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key], seen)}`);
  seen.delete(value);
  return `{${fields.join(",")}}`;
}

export function canonicalGatewayJson(value: unknown): string {
  return canonicalValue(value, new Set<object>());
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateIdempotencyKey(value: string): boolean {
  return (
    Buffer.byteLength(value, "utf8") <= GATEWAY_IDEMPOTENCY_KEY_MAX_BYTES &&
    GATEWAY_IDEMPOTENCY_KEY_PATTERN.test(value)
  );
}

export function gatewayIdempotencyRequestHash(
  request: GatewayIdempotencyRequest,
): string {
  return sha256(
    canonicalGatewayJson({
      method: request.method,
      routeId: request.routeId,
      params: request.params ?? {},
      query: request.query ?? {},
      body: request.body ?? {},
    }),
  );
}

export function gatewayIdempotencyStorageKey(
  scope: GatewayIdempotencyScope,
): string {
  return `${STORAGE_PREFIX}${sha256(canonicalGatewayJson(scope))}`;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  );
}

function validResponse(value: unknown): value is GatewayStoredResponse {
  if (!isPlainRecord(value)) return false;
  if (!exactKeys(value, ["status", "body", "headers"])) return false;
  if (
    typeof value.status !== "number" ||
    !Number.isInteger(value.status) ||
    value.status < 200 ||
    value.status > 299 ||
    !isPlainRecord(value.headers)
  ) {
    return false;
  }
  return Object.entries(value.headers).every(([key, header]) => {
    if (["location", "etag"].includes(key)) return typeof header === "string";
    return key === "set-cookie" && validRefreshCookieDeletion(header);
  });
}

export function validRefreshCookieDeletion(value: unknown): boolean {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0] !== "string"
  ) {
    return false;
  }
  const attributes = value[0].split(";").map((part) => part.trim());
  if (attributes[0] !== "refreshToken=") return false;
  const normalized = attributes.slice(1).map((part) => part.toLowerCase());
  const expiration = normalized.filter(
    (part) =>
      part === "max-age=0" ||
      part === "expires=thu, 01 jan 1970 00:00:00 gmt",
  );
  const allowed = new Set([
    "path=/api/auth",
    "httponly",
    "samesite=lax",
    "secure",
    "max-age=0",
    "expires=thu, 01 jan 1970 00:00:00 gmt",
  ]);
  return (
    normalized.filter((part) => part === "path=/api/auth").length === 1 &&
    normalized.filter((part) => part === "httponly").length === 1 &&
    normalized.filter((part) => part === "samesite=lax").length === 1 &&
    normalized.filter((part) => part === "secure").length <= 1 &&
    expiration.length === 1 &&
    normalized.every((part) => allowed.has(part))
  );
}

export function decodeGatewayIdempotencyState(
  serialized: string,
): GatewayIdempotencyState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }
  if (!isPlainRecord(parsed) || parsed.version !== 1) return null;
  if (parsed.state === "in-flight") {
    if (
      !exactKeys(parsed, [
        "version",
        "state",
        "requestHash",
        "leaseId",
        "startedAt",
      ])
    ) {
      return null;
    }
    if (
      typeof parsed.requestHash !== "string" ||
      !HASH_PATTERN.test(parsed.requestHash) ||
      typeof parsed.leaseId !== "string" ||
      parsed.leaseId.length < 16 ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }
    return parsed as GatewayInFlightIdempotencyState;
  }
  if (parsed.state === "completed") {
    if (
      !exactKeys(parsed, [
        "version",
        "state",
        "requestHash",
        "response",
        "completedAt",
      ])
    ) {
      return null;
    }
    if (
      typeof parsed.requestHash !== "string" ||
      !HASH_PATTERN.test(parsed.requestHash) ||
      !validResponse(parsed.response) ||
      typeof parsed.completedAt !== "string"
    ) {
      return null;
    }
    return parsed as GatewayCompletedIdempotencyState;
  }
  return null;
}
