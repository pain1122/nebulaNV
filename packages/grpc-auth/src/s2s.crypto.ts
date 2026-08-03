import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const S2S_PROTOCOL_VERSION = "2" as const;
export const S2S_BODY_DIGEST_ALGORITHM = "sha256" as const;

export type S2SCallerKind = "service" | "gateway";

export type S2SSignedEnvelope = {
  version: typeof S2S_PROTOCOL_VERSION;
  kind: S2SCallerKind;
  caller: string;
  target: string;
  method: string;
  path: string;
  issuedAtMs: number;
  nonce: string;
  requestId: string;
  keyId: string;
  bodySha256: string;
};

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function isBinary(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

function isDefaultObjectValue(value: CanonicalValue): boolean {
  if (value === "" || value === false || value === 0) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * Convert a protobuf-like request into deterministic JSON.
 *
 * Object keys are sorted and protobuf scalar defaults are omitted so a caller
 * that omits a proto3 default hashes the same bytes as a server loader that
 * materializes that default. Arrays retain their order.
 */
function canonicalize(value: unknown, insideObject = false): CanonicalValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("s2s_body_contains_non_finite_number");
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === "bigint") return value.toString(10);
  if (value instanceof Date) return value.toISOString();
  if (isBinary(value)) return Buffer.from(value).toString("base64");

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    const out: Record<string, CanonicalValue> = {};
    const source = value as Record<string, unknown>;

    for (const key of Object.keys(source).sort()) {
      const raw = source[key];
      if (raw === undefined) continue;
      const normalized = canonicalize(raw, true);
      if (isDefaultObjectValue(normalized)) continue;
      out[key] = normalized;
    }

    return out;
  }

  if (insideObject) return null;
  throw new Error("s2s_body_contains_unsupported_value");
}

export function canonicalRequestBody(body: unknown): string {
  return JSON.stringify(canonicalize(body));
}

export function digestS2SBody(body: unknown): string {
  return createHash(S2S_BODY_DIGEST_ALGORITHM)
    .update(canonicalRequestBody(body), "utf8")
    .digest("hex");
}

/** Hash the exact protobuf bytes produced by a gRPC method serializer. */
export function digestS2SBytes(body: Uint8Array): string {
  return createHash(S2S_BODY_DIGEST_ALGORITHM).update(body).digest("hex");
}

/** A JSON array avoids the delimiter ambiguity of the former colon payload. */
export function canonicalS2SPayload(envelope: S2SSignedEnvelope): string {
  return JSON.stringify([
    "nebula-s2s",
    envelope.version,
    envelope.kind,
    envelope.caller,
    envelope.target,
    envelope.method,
    envelope.path,
    envelope.issuedAtMs,
    envelope.nonce,
    envelope.requestId,
    envelope.keyId,
    envelope.bodySha256,
  ]);
}

export function signS2S(secret: string, envelope: S2SSignedEnvelope): string {
  return createHmac("sha256", secret)
    .update(canonicalS2SPayload(envelope), "utf8")
    .digest("hex");
}

export function verifyS2SSignature(
  secret: string,
  envelope: S2SSignedEnvelope,
  candidate: string,
): boolean {
  if (!/^[a-f0-9]{64}$/i.test(candidate)) return false;

  const expected = Buffer.from(signS2S(secret, envelope), "hex");
  const actual = Buffer.from(candidate, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
