import { randomUUID } from "node:crypto";
import { Metadata, type MetadataValue } from "@grpc/grpc-js";
import { messageTypeRegistry } from "@nebula/protos";
import {
  S2S_PROTOCOL_VERSION,
  digestS2SBytes,
  signS2S,
  type S2SCallerKind,
  type S2SSignedEnvelope,
} from "./s2s.crypto";
import {
  AUTHORIZATION_HEADER,
  X_REQUEST_ID_HEADER,
  X_S2S_BODY_SHA256_HEADER,
  X_S2S_ISSUED_AT_HEADER,
  X_S2S_KEY_ID_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_METHOD_HEADER,
  X_S2S_NONCE_HEADER,
  X_S2S_PATH_HEADER,
  X_S2S_TARGET_HEADER,
  X_S2S_VERSION_HEADER,
  X_SVC_HEADER,
  requireServiceName,
  resolveOutboundS2SKey,
  resolveS2SSignHeader,
  type S2SKey,
} from "./tokens";

const SAFE_FIELD = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const SAFE_PATH = /^\/[A-Za-z0-9][A-Za-z0-9._:@/-]{0,254}$/;

export type GrpcRequestDefinition = {
  path: string;
  requestStream: boolean;
  requestSerialize(value: never): Buffer;
  requestDeserialize?(bytes: Buffer): unknown;
};

export type BuildS2SMetadataOptions = {
  target: string;
  method: string;
  path: string;
  bodySha256: string;
  kind?: S2SCallerKind;
  serviceName?: string;
  key?: S2SKey;
  issuedAtMs?: number;
  nonce?: string;
  requestId?: string;
  headerName?: string;
};

export type BuildGrpcS2SMetadataOptions<TRequest> = {
  target: string;
  definition: GrpcRequestDefinition;
  request: TRequest;
  kind?: S2SCallerKind;
  serviceName?: string;
  key?: S2SKey;
  issuedAtMs?: number;
  nonce?: string;
  requestId?: string;
  headerName?: string;
};

export type GrpcUnaryMethod<TRequest, TOptions, TResult> = (
  request: TRequest,
  metadata?: Metadata,
  options?: TOptions,
) => TResult;

/**
 * Nest appends the grpc-js callback to the arguments supplied here. Passing an
 * explicit undefined options value would produce
 * (request, metadata, undefined, callback), which grpc-js rejects.
 */
export function invokeGrpcUnary<TRequest, TOptions, TResult>(
  method: GrpcUnaryMethod<TRequest, TOptions, TResult>,
  request: TRequest,
  metadata: Metadata,
  options?: TOptions,
): TResult {
  return options === undefined
    ? method(request, metadata)
    : method(request, metadata, options);
}

export const S2S_RESERVED_HEADERS = Object.freeze([
  X_SVC_HEADER,
  X_S2S_VERSION_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_TARGET_HEADER,
  X_S2S_METHOD_HEADER,
  X_S2S_PATH_HEADER,
  X_S2S_ISSUED_AT_HEADER,
  X_S2S_NONCE_HEADER,
  X_REQUEST_ID_HEADER,
  X_S2S_KEY_ID_HEADER,
  X_S2S_BODY_SHA256_HEADER,
]);

function assertSafeField(value: string, label: string): void {
  if (!SAFE_FIELD.test(value)) throw new Error(`${label}_invalid`);
}

function assertDigest(value: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("s2s_body_sha256_invalid");
  }
}

function assertPath(value: string): void {
  if (!SAFE_PATH.test(value)) throw new Error("s2s_path_invalid");
}

export function buildS2SMetadata(opts: BuildS2SMetadataOptions): Metadata {
  const kind = opts.kind ?? "service";
  const caller = opts.serviceName ?? requireServiceName();
  const key = opts.key ?? resolveOutboundS2SKey(kind, opts.target);
  if (!key) {
    throw new Error(`s2s_outbound_key_missing_for_${opts.target}`);
  }

  const issuedAtMs = opts.issuedAtMs ?? Date.now();
  if (!Number.isSafeInteger(issuedAtMs) || issuedAtMs <= 0) {
    throw new Error("s2s_issued_at_invalid");
  }

  const nonce = opts.nonce ?? randomUUID();
  const requestId = opts.requestId ?? randomUUID();
  assertSafeField(caller, "s2s_caller");
  assertSafeField(opts.target, "s2s_target");
  assertSafeField(opts.method, "s2s_method");
  assertPath(opts.path);
  assertSafeField(nonce, "s2s_nonce");
  assertSafeField(requestId, "s2s_request_id");
  assertSafeField(key.id, "s2s_key_id");
  assertDigest(opts.bodySha256);

  const envelope: S2SSignedEnvelope = {
    version: S2S_PROTOCOL_VERSION,
    kind,
    caller,
    target: opts.target,
    method: opts.method,
    path: opts.path,
    issuedAtMs,
    nonce,
    requestId,
    keyId: key.id,
    bodySha256: opts.bodySha256,
  };

  const md = new Metadata();
  md.set(X_SVC_HEADER, caller);
  md.set(X_S2S_VERSION_HEADER, envelope.version);
  md.set(X_S2S_KIND_HEADER, envelope.kind);
  md.set(X_S2S_TARGET_HEADER, envelope.target);
  md.set(X_S2S_METHOD_HEADER, envelope.method);
  md.set(X_S2S_PATH_HEADER, envelope.path);
  md.set(X_S2S_ISSUED_AT_HEADER, String(envelope.issuedAtMs));
  md.set(X_S2S_NONCE_HEADER, envelope.nonce);
  md.set(X_REQUEST_ID_HEADER, envelope.requestId);
  md.set(X_S2S_KEY_ID_HEADER, envelope.keyId);
  md.set(X_S2S_BODY_SHA256_HEADER, envelope.bodySha256);
  md.set(
    opts.headerName ?? resolveS2SSignHeader(),
    signS2S(key.secret, envelope),
  );
  return md;
}

export function buildGrpcS2SMetadata<TRequest>(
  opts: BuildGrpcS2SMetadataOptions<TRequest>,
): Metadata {
  if (opts.definition.requestStream) {
    throw new Error("s2s_request_stream_signing_not_supported");
  }

  return buildS2SMetadata({
    target: opts.target,
    method: "grpc",
    path: opts.definition.path,
    bodySha256: digestGrpcS2SRequest(opts.definition, opts.request),
    kind: opts.kind,
    serviceName: opts.serviceName,
    key: opts.key,
    issuedAtMs: opts.issuedAtMs,
    nonce: opts.nonce,
    requestId: opts.requestId,
    headerName: opts.headerName,
  });
}

/**
 * Hash one canonical protobuf representation rather than the caller's first
 * wire encoding. Proto3 permits explicit defaults and omitted defaults to mean
 * the same thing, so a schema round trip is required before hashing.
 */
export function digestGrpcS2SRequest<TRequest>(
  definition: GrpcRequestDefinition,
  request: TRequest,
): string {
  if (definition.requestDeserialize) {
    const empty = definition.requestDeserialize(Buffer.alloc(0));
    const typeName =
      empty && typeof empty === "object" && "$type" in empty
        ? (empty as { $type?: unknown }).$type
        : undefined;
    if (typeof typeName === "string") {
      const messageType = messageTypeRegistry.get(typeName);
      if (messageType) {
        const normalized = messageType.fromPartial(request as never);
        return digestS2SBytes(definition.requestSerialize(normalized as never));
      }
    }
  }

  const firstPass = definition.requestSerialize(request as never);
  if (!definition.requestDeserialize) return digestS2SBytes(firstPass);

  const normalized = definition.requestDeserialize(firstPass);
  return digestS2SBytes(definition.requestSerialize(normalized as never));
}

function copyMetadata(
  src: Metadata,
  out: Metadata,
  blocked: ReadonlySet<string>,
): void {
  const internalRepr = (
    src as Metadata & { internalRepr?: Map<string, MetadataValue[]> }
  ).internalRepr;
  if (internalRepr instanceof Map) {
    for (const [key, vals] of internalRepr) {
      if (blocked.has(key) || vals.length === 0) continue;
      out.set(key, vals[0]);
      for (let i = 1; i < vals.length; i++) out.add(key, vals[i]);
    }
    return;
  }

  for (const [key, value] of Object.entries(src.getMap())) {
    if (!blocked.has(key)) out.set(key, value);
  }
}

export function mergeMetadata(a?: Metadata, b?: Metadata): Metadata {
  const out = new Metadata();
  const blocked = new Set<string>();
  if (a) copyMetadata(a, out, blocked);
  if (b) copyMetadata(b, out, blocked);
  return out;
}

/**
 * Merge application metadata with a fresh signature. Reserved fields from the
 * application metadata are discarded so callers cannot override the envelope.
 */
export function mergeSignedMetadata(
  application: Metadata | undefined,
  signed: Metadata,
): Metadata {
  const out = new Metadata();
  const blocked = new Set<string>([
    ...S2S_RESERVED_HEADERS,
    resolveS2SSignHeader(),
  ]);
  if (application) copyMetadata(application, out, blocked);
  copyMetadata(signed, out, new Set<string>());
  return out;
}

export function withBearer(
  metadata: Metadata,
  token?: string | null,
): Metadata {
  if (token) metadata.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
  return metadata;
}
