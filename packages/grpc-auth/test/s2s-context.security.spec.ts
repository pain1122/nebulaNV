import { Metadata } from "@grpc/grpc-js";
import {
  canonicalS2SContext,
  decodeS2SSignedContext,
  encodeS2SSignedContext,
  type S2SSignedContext,
} from "../src/s2s-context";
import {
  S2S_PROTOCOL_VERSION_V2,
  S2S_PROTOCOL_VERSION_V3,
  canonicalS2SPayload,
} from "../src/s2s.crypto";
import { buildS2SMetadata, mergeSignedMetadata } from "../src/s2s";
import { gatewayAuthAndS2S } from "../src/metadata";
import {
  X_S2S_CONTEXT_HEADER,
  X_S2S_CONTEXT_SHA256_HEADER,
  X_S2S_VERSION_HEADER,
} from "../src/tokens";

const key = {
  id: "caller-receiver-v1",
  secret: "test-only-context-signing-key-000000000001",
};

const context: S2SSignedContext = {
  version: "1",
  applicationId: "storefront-web-local",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "web",
  actor: {
    userId: "verified-user-id",
    role: "user",
    sessionRef: "non-secret-session-reference",
  },
};

function build(opts?: {
  kind?: "service" | "gateway";
  context?: S2SSignedContext;
}): Metadata {
  return buildS2SMetadata({
    target: "receiver-service",
    method: "grpc",
    path: "/test.TestService/DoWork",
    bodySha256: "a".repeat(64),
    kind: opts?.kind,
    serviceName: opts?.kind === "gateway" ? "gateway" : "caller-service",
    key,
    issuedAtMs: 1_750_000_000_000,
    nonce: "fixed-nonce",
    requestId: "fixed-request-id",
    context: opts?.context,
  });
}

describe("S2S v3 signed context", () => {
  it("uses the frozen field order and round-trips canonical base64url", () => {
    const encoded = encodeS2SSignedContext(context);

    expect(encoded.canonicalJson).toBe(
      '{"version":"1","applicationId":"storefront-web-local","tenantId":"single-site-tenant","siteId":"single-site","channelId":"web","actor":{"userId":"verified-user-id","role":"user","sessionRef":"non-secret-session-reference"}}',
    );
    expect(encoded.encoded).not.toContain("=");
    expect(decodeS2SSignedContext(encoded.encoded)).toEqual(encoded);
  });

  it("rejects unknown, null, unsafe, and incomplete actor fields", () => {
    expect(() =>
      canonicalS2SContext({ ...context, extra: "unsafe" } as S2SSignedContext),
    ).toThrow("s2s_context_unknown_field");
    expect(() =>
      canonicalS2SContext({
        ...context,
        tenantId: null,
      } as unknown as S2SSignedContext),
    ).toThrow("s2s_context_tenant_id_invalid");
    expect(() =>
      canonicalS2SContext({
        ...context,
        applicationId: " unsafe ",
      }),
    ).toThrow("s2s_context_application_id_invalid");
    expect(() =>
      canonicalS2SContext({
        ...context,
        actor: { userId: "user", role: "admin" } as never,
      }),
    ).toThrow("s2s_context_actor_required_field_missing");
  });

  it("rejects non-canonical JSON and padded or oversized carriers", () => {
    const reordered = Buffer.from(
      '{"tenantId":"tenant","version":"1","applicationId":"app","siteId":"site","channelId":"web"}',
      "utf8",
    ).toString("base64url");
    expect(() => decodeS2SSignedContext(reordered)).toThrow(
      "s2s_context_not_canonical",
    );

    const encoded = encodeS2SSignedContext(context).encoded;
    expect(() => decodeS2SSignedContext(`${encoded}=`)).toThrow(
      "s2s_context_encoding_invalid",
    );

    const oversized = Buffer.alloc(1025, 0x61).toString("base64url");
    expect(() => decodeS2SSignedContext(oversized)).toThrow(
      "s2s_context_encoding_invalid",
    );
  });

  it("preserves v2 for ordinary service calls and selects v3 for context", () => {
    expect(build().get(X_S2S_VERSION_HEADER)).toEqual([
      S2S_PROTOCOL_VERSION_V2,
    ]);
    expect(build({ context }).get(X_S2S_VERSION_HEADER)).toEqual([
      S2S_PROTOCOL_VERSION_V3,
    ]);
    expect(
      build({ kind: "gateway", context }).get(X_S2S_VERSION_HEADER),
    ).toEqual([S2S_PROTOCOL_VERSION_V3]);
    expect(() => build({ kind: "gateway" })).toThrow(
      "s2s_context_required_for_gateway",
    );
  });

  it("keeps the exact v2 payload and appends only the context digest in v3", () => {
    const base = {
      kind: "service" as const,
      caller: "caller-service",
      target: "receiver-service",
      method: "grpc",
      path: "/test.TestService/DoWork",
      issuedAtMs: 1_750_000_000_000,
      nonce: "fixed-nonce",
      requestId: "fixed-request-id",
      keyId: key.id,
      bodySha256: "a".repeat(64),
    };
    const v2 = canonicalS2SPayload({
      ...base,
      version: S2S_PROTOCOL_VERSION_V2,
    });
    const v3 = canonicalS2SPayload({
      ...base,
      version: S2S_PROTOCOL_VERSION_V3,
      contextSha256: "b".repeat(64),
    });

    expect(v2).toBe(
      `["nebula-s2s","2","service","caller-service","receiver-service","grpc","/test.TestService/DoWork",1750000000000,"fixed-nonce","fixed-request-id","caller-receiver-v1","${"a".repeat(64)}"]`,
    );
    const expectedV3 = JSON.parse(v2) as Array<string | number>;
    expectedV3[1] = "3";
    expectedV3.push("b".repeat(64));
    expect(JSON.parse(v3)).toEqual(expectedV3);
  });

  it("reserves both context carriers against application metadata override", () => {
    const hostile = new Metadata();
    hostile.set(X_S2S_CONTEXT_HEADER, "forged-context");
    hostile.set(X_S2S_CONTEXT_SHA256_HEADER, "0".repeat(64));
    hostile.set("authorization", "Bearer actor-token");
    const signed = build({ kind: "gateway", context });
    const merged = mergeSignedMetadata(hostile, signed);

    expect(merged.get(X_S2S_CONTEXT_HEADER)).toEqual(
      signed.get(X_S2S_CONTEXT_HEADER),
    );
    expect(merged.get(X_S2S_CONTEXT_SHA256_HEADER)).toEqual(
      signed.get(X_S2S_CONTEXT_SHA256_HEADER),
    );
    expect(merged.get("authorization")).toEqual(["Bearer actor-token"]);
  });

  it("builds gateway application metadata from the bearer allowlist", () => {
    const request = { value: "one" };
    const metadata = gatewayAuthAndS2S("actor-token", {
      target: "receiver-service",
      definition: {
        path: "/test.TestService/DoWork",
        requestStream: false,
        requestSerialize: (value: typeof request) =>
          Buffer.from(JSON.stringify(value), "utf8"),
      },
      request,
      serviceName: "gateway",
      key,
      issuedAtMs: 1_750_000_000_000,
      nonce: "fixed-nonce",
      requestId: "fixed-request-id",
      context,
    });

    expect(metadata.get("authorization")).toEqual(["Bearer actor-token"]);
    expect(metadata.get(X_S2S_VERSION_HEADER)).toEqual([
      S2S_PROTOCOL_VERSION_V3,
    ]);
    expect(metadata.get("x-tenant-id")).toEqual([]);
    expect(metadata.get("x-user-role")).toEqual([]);
  });
});
