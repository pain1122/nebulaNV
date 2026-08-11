import "reflect-metadata";
import { createHash } from "node:crypto";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RpcException } from "@nestjs/microservices";
import { Metadata, status } from "@grpc/grpc-js";
import {
  ALLOWED_S2S_CALLERS_KEY,
  ALLOWED_S2S_IDENTITIES_KEY,
  AllowedS2SIdentities,
  type AllowedS2SIdentity,
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  PUBLIC_FLAGS_KEY,
} from "../src/public.decorator";
import { S2SGuard } from "../src/s2s.guard";
import type { MetadataWithContext } from "../src/context";
import { S2SReplayStore } from "../src/s2s-replay.store";
import {
  S2S_SERVER_CONTEXT,
  type MetadataWithS2SServerContext,
} from "../src/s2s.transport";
import { buildGrpcS2SMetadata } from "../src/s2s";
import type { S2SSignedContext } from "../src/s2s-context";
import { S2S_PROTOCOL_VERSION_V2, signS2S } from "../src/s2s.crypto";
import {
  X_REQUEST_ID_HEADER,
  X_S2S_BODY_SHA256_HEADER,
  X_S2S_CONTEXT_HEADER,
  X_S2S_CONTEXT_SHA256_HEADER,
  X_S2S_ISSUED_AT_HEADER,
  X_S2S_KEY_ID_HEADER,
  X_S2S_KIND_HEADER,
  X_S2S_METHOD_HEADER,
  X_S2S_NONCE_HEADER,
  X_S2S_PATH_HEADER,
  X_S2S_TARGET_HEADER,
  X_S2S_VERSION_HEADER,
  X_SVC_HEADER,
  resolveS2SSignHeader,
  type S2SKey,
} from "../src/tokens";

const current: S2SKey = {
  id: "caller-receiver-v2",
  secret: "test-only-current-service-key-000000000001",
};
const previous: S2SKey = {
  id: "caller-receiver-v1",
  secret: "test-only-previous-service-key-0000000001",
};
const gateway: S2SKey = {
  id: "gateway-receiver-v1",
  secret: "test-only-current-gateway-key-000000000001",
};

const signedContext: S2SSignedContext = {
  version: "1",
  applicationId: "storefront-web-local",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "web",
  actor: {
    userId: "verified-user",
    role: "user",
    sessionRef: "verified-session",
  },
};

type Request = { value?: string };
const definition = {
  path: "/test.TestService/DoWork",
  requestStream: false,
  requestSerialize: (request: Request) =>
    Buffer.from(JSON.stringify(request), "utf8"),
};

function setTrust(previousNotAfter = Date.now() + 60_000): void {
  process.env.SVC_NAME = "receiver-service";
  process.env.S2S_SIGNATURE_HEADER = "x-s2s-signature";
  process.env.S2S_MAX_CLOCK_SKEW_MS = "30000";
  process.env.S2S_REPLAY_STORE = "memory";
  process.env.S2S_INBOUND_KEYS = JSON.stringify({
    "caller-service": {
      current,
      previous: { ...previous, notAfterMs: previousNotAfter },
    },
  });
  process.env.GATEWAY_INBOUND_KEYS = JSON.stringify({
    gateway: { current: gateway },
  });
}

function handlerWith(metadata?: {
  public?: boolean;
  gatewayOnly?: boolean;
  internalOnly?: boolean;
  callers?: string[];
  identities?: AllowedS2SIdentity[];
}): () => void {
  const handler = () => undefined;
  if (metadata?.public) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  if (metadata?.gatewayOnly) {
    Reflect.defineMetadata(PUBLIC_FLAGS_KEY, { gatewayOnly: true }, handler);
  }
  if (metadata?.internalOnly) {
    Reflect.defineMetadata(INTERNAL_ONLY_KEY, true, handler);
  }
  if (metadata?.callers) {
    Reflect.defineMetadata(ALLOWED_S2S_CALLERS_KEY, metadata.callers, handler);
  }
  if (metadata?.identities) {
    Reflect.defineMetadata(
      ALLOWED_S2S_IDENTITIES_KEY,
      metadata.identities,
      handler,
    );
  }
  return handler;
}

function rpcContext(
  metadata: Metadata,
  request: Request,
  handler = handlerWith({ public: true }),
  trustedRequest: Request = request,
): ExecutionContext {
  const trustedMetadata = metadata as MetadataWithS2SServerContext;
  Object.defineProperty(trustedMetadata, S2S_SERVER_CONTEXT, {
    configurable: true,
    value: {
      method: "grpc",
      path: definition.path,
      bodySha256: createHash("sha256")
        .update(definition.requestSerialize(trustedRequest))
        .digest("hex"),
      requestStream: false,
    },
  });
  const call = { getPath: () => definition.path };

  return {
    getType: () => "rpc",
    getClass: () => class TestController {},
    getHandler: () => handler,
    getArgByIndex: (index: number) => [request, metadata, call][index],
    getArgs: () => [request, metadata, call],
    // Nest can expose the decoded RPC body through this HTTP accessor too.
    switchToHttp: () => ({ getRequest: () => request }),
    switchToRpc: () => ({ getContext: () => metadata, getData: () => request }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function signed(opts?: {
  request?: Request;
  target?: string;
  definitionOverride?: typeof definition;
  key?: S2SKey;
  kind?: "service" | "gateway";
  caller?: string;
  issuedAtMs?: number;
  nonce?: string;
  context?: S2SSignedContext;
}): MetadataWithContext {
  const kind = opts?.kind ?? "service";
  return buildGrpcS2SMetadata({
    target: opts?.target ?? "receiver-service",
    definition: opts?.definitionOverride ?? definition,
    request: opts?.request ?? { value: "one" },
    key: opts?.key ?? current,
    kind,
    serviceName: opts?.caller ?? "caller-service",
    issuedAtMs: opts?.issuedAtMs,
    nonce: opts?.nonce,
    context: opts?.context ?? (kind === "gateway" ? signedContext : undefined),
  }) as MetadataWithContext;
}

function legacyGatewayV2(request: Request): Metadata {
  const metadata = buildGrpcS2SMetadata({
    target: "receiver-service",
    definition,
    request,
    key: gateway,
    kind: "service",
    serviceName: "gateway",
  });
  const one = (header: string) => metadata.get(header)[0] as string;
  metadata.set(X_S2S_KIND_HEADER, "gateway");
  metadata.set(
    resolveS2SSignHeader(),
    signS2S(gateway.secret, {
      version: S2S_PROTOCOL_VERSION_V2,
      kind: "gateway",
      caller: one(X_SVC_HEADER),
      target: one(X_S2S_TARGET_HEADER),
      method: one(X_S2S_METHOD_HEADER),
      path: one(X_S2S_PATH_HEADER),
      issuedAtMs: Number(one(X_S2S_ISSUED_AT_HEADER)),
      nonce: one(X_S2S_NONCE_HEADER),
      requestId: one(X_REQUEST_ID_HEADER),
      keyId: one(X_S2S_KEY_ID_HEADER),
      bodySha256: one(X_S2S_BODY_SHA256_HEADER),
    }),
  );
  return metadata;
}

async function rpcError(
  promise: Promise<boolean>,
): Promise<{ code: number; message: string }> {
  try {
    await promise;
    throw new Error("expected_rpc_error");
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe("S2SGuard v2 security contract", () => {
  let guard: S2SGuard;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    setTrust();
    guard = new S2SGuard(new Reflector(), new S2SReplayStore());
  });

  it("rejects empty, invalid, and duplicate exact-identity policies", () => {
    expect(() => AllowedS2SIdentities()).toThrow(
      "allowed_s2s_identities_empty",
    );
    expect(() =>
      AllowedS2SIdentities({ kind: "service", caller: "bad caller" }),
    ).toThrow("allowed_s2s_identity_invalid");
    expect(() =>
      AllowedS2SIdentities(
        { kind: "gateway", caller: "gateway" },
        { kind: "gateway", caller: "gateway" },
      ),
    ).toThrow("allowed_s2s_identity_duplicate");
  });

  it("accepts one valid current-key request", async () => {
    const request = { value: "one" };
    await expect(
      guard.canActivate(rpcContext(signed({ request }), request)),
    ).resolves.toBe(true);
    expect(request).toEqual({ value: "one" });
  });

  it("accepts v3 from gateway and service callers, then attaches verified context", async () => {
    const gatewayRequest = { value: "gateway" };
    const gatewayMetadata = signed({
      request: gatewayRequest,
      kind: "gateway",
      caller: "gateway",
      key: gateway,
    });
    await expect(
      guard.canActivate(rpcContext(gatewayMetadata, gatewayRequest)),
    ).resolves.toBe(true);
    expect(gatewayMetadata.requestContext).toEqual({
      applicationId: "storefront-web-local",
      tenantId: "single-site-tenant",
      siteId: "single-site",
      channelId: "web",
    });
    expect(gatewayMetadata.signedActor).toEqual(signedContext.actor);
    expect(gatewayMetadata.user).toBeUndefined();

    const serviceRequest = { value: "service" };
    const serviceMetadata = signed({
      request: serviceRequest,
      context: signedContext,
    });
    await expect(
      guard.canActivate(rpcContext(serviceMetadata, serviceRequest)),
    ).resolves.toBe(true);
    expect(serviceMetadata.requestContext).toEqual(
      gatewayMetadata.requestContext,
    );
  });

  it("requires v3 for gateway callers while keeping ordinary service v2 valid", async () => {
    const request = { value: "one" };
    const error = await rpcError(
      guard.canActivate(rpcContext(legacyGatewayV2(request), request)),
    );
    expect(error.message).toBe("s2s_context_required_for_gateway");

    const serviceMetadata = signed({ request });
    serviceMetadata.requestContext = {
      applicationId: "forged-app",
      tenantId: "forged-tenant",
      siteId: "forged-site",
      channelId: "forged-channel",
    };
    await expect(
      guard.canActivate(rpcContext(serviceMetadata, request)),
    ).resolves.toBe(true);
    expect(serviceMetadata.requestContext).toBeUndefined();
  });

  it("rejects partial, duplicate, unsigned, and altered context carriers", async () => {
    const request = { value: "one" };

    const partial = signed({ request });
    partial.set(X_S2S_VERSION_HEADER, "3");
    partial.set(X_S2S_CONTEXT_HEADER, "e30");
    expect(
      (await rpcError(guard.canActivate(rpcContext(partial, request)))).message,
    ).toBe("s2s_context_digest_missing_or_duplicate");

    const duplicate = signed({
      request,
      kind: "gateway",
      caller: "gateway",
      key: gateway,
    });
    duplicate.add(X_S2S_CONTEXT_HEADER, "e30");
    expect(
      (await rpcError(guard.canActivate(rpcContext(duplicate, request))))
        .message,
    ).toBe("s2s_context_missing_or_duplicate");

    const unsigned = signed({ request });
    unsigned.set(X_S2S_CONTEXT_HEADER, "e30");
    expect(
      (await rpcError(guard.canActivate(rpcContext(unsigned, request))))
        .message,
    ).toBe("s2s_context_not_allowed_for_v2");

    const altered = signed({
      request,
      kind: "gateway",
      caller: "gateway",
      key: gateway,
    });
    const alteredContext = Buffer.from(
      JSON.stringify({
        version: "1",
        applicationId: "admin-web-local",
        tenantId: "single-site-tenant",
        siteId: "single-site",
        channelId: "web",
        actor: signedContext.actor,
      }),
      "utf8",
    ).toString("base64url");
    altered.set(X_S2S_CONTEXT_HEADER, alteredContext);
    expect(
      (await rpcError(guard.canActivate(rpcContext(altered, request)))).message,
    ).toBe("s2s_context_digest_mismatch");

    const alteredDigest = signed({
      request,
      kind: "gateway",
      caller: "gateway",
      key: gateway,
    });
    alteredDigest.set(X_S2S_CONTEXT_SHA256_HEADER, "0".repeat(64));
    expect(
      (await rpcError(guard.canActivate(rpcContext(alteredDigest, request))))
        .message,
    ).toBe("s2s_context_digest_mismatch");
  });

  it("requires S2S even when the RPC is public", async () => {
    const error = await rpcError(
      guard.canActivate(rpcContext(new Metadata(), {})),
    );
    expect(error.code).toBe(status.UNAUTHENTICATED);
  });

  it.each([
    ["stale", Date.now() - 31_000],
    ["future", Date.now() + 31_000],
  ])("rejects a %s timestamp", async (_label, issuedAtMs) => {
    const request = { value: "one" };
    const error = await rpcError(
      guard.canActivate(rpcContext(signed({ request, issuedAtMs }), request)),
    );
    expect(error).toMatchObject({
      code: status.UNAUTHENTICATED,
      message: "s2s_timestamp_out_of_bounds",
    });
  });

  it("rejects a wrong receiver audience", async () => {
    const request = { value: "one" };
    const error = await rpcError(
      guard.canActivate(
        rpcContext(signed({ request, target: "other-service" }), request),
      ),
    );
    expect(error.message).toBe("s2s_target_mismatch");
  });

  it("rejects a signature bound to another RPC", async () => {
    const request = { value: "one" };
    const other = { ...definition, path: "/test.TestService/Other" };
    const error = await rpcError(
      guard.canActivate(
        rpcContext(signed({ request, definitionOverride: other }), request),
      ),
    );
    expect(error.message).toBe("s2s_rpc_binding_mismatch");
  });

  it("rejects a mutated protobuf body", async () => {
    const signedRequest = { value: "one" };
    const actualRequest = { value: "two" };
    const error = await rpcError(
      guard.canActivate(
        rpcContext(signed({ request: signedRequest }), actualRequest),
      ),
    );
    expect(error.message).toBe("s2s_body_binding_mismatch");
  });

  it("rejects an altered signed request ID", async () => {
    const request = { value: "one" };
    const metadata = signed({ request });
    metadata.set(X_REQUEST_ID_HEADER, "attacker-replaced-request-id");

    const error = await rpcError(
      guard.canActivate(rpcContext(metadata, request)),
    );
    expect(error.message).toBe("s2s_signature_invalid");
  });

  it("rejects unknown versions and invalid signatures", async () => {
    const request = { value: "one" };
    const badVersion = signed({ request });
    badVersion.set(X_S2S_VERSION_HEADER, "1");
    expect(
      (await rpcError(guard.canActivate(rpcContext(badVersion, request))))
        .message,
    ).toBe("s2s_version_unsupported");

    const badSignature = signed({ request });
    badSignature.set(resolveS2SSignHeader(), "0".repeat(64));
    expect(
      (await rpcError(guard.canActivate(rpcContext(badSignature, request))))
        .message,
    ).toBe("s2s_signature_invalid");
  });

  it("accepts a time-limited previous key and rejects it after expiry", async () => {
    const request = { value: "one" };
    await expect(
      guard.canActivate(
        rpcContext(signed({ request, key: previous }), request),
      ),
    ).resolves.toBe(true);

    setTrust(Date.now() - 1);
    const error = await rpcError(
      guard.canActivate(
        rpcContext(
          signed({ request, key: previous, nonce: "fresh-old-key-nonce" }),
          request,
        ),
      ),
    );
    expect(error.message).toBe("s2s_key_unknown_or_expired");
  });

  it("atomically rejects a replay and concurrent duplicates", async () => {
    const request = { value: "one" };
    const metadata = signed({ request, nonce: "same-request-nonce" });
    await expect(
      guard.canActivate(rpcContext(metadata, request)),
    ).resolves.toBe(true);
    expect(
      (await rpcError(guard.canActivate(rpcContext(metadata, request))))
        .message,
    ).toBe("s2s_request_replayed");

    const concurrent = signed({ request, nonce: "concurrent-request-nonce" });
    const results = await Promise.allSettled([
      guard.canActivate(rpcContext(concurrent, request)),
      guard.canActivate(rpcContext(concurrent, request)),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
  });

  it("does not let an invalid signature poison a nonce", async () => {
    const request = { value: "one" };
    const metadata = signed({ request, nonce: "not-poisoned-nonce" });
    const signature = metadata.get(resolveS2SSignHeader())[0] as string;
    metadata.set(resolveS2SSignHeader(), "0".repeat(64));
    await rpcError(guard.canActivate(rpcContext(metadata, request)));
    metadata.set(resolveS2SSignHeader(), signature);
    await expect(
      guard.canActivate(rpcContext(metadata, request)),
    ).resolves.toBe(true);
  });

  it("separates gateway keys from service keys", async () => {
    const request = { value: "one" };
    const confused = signed({
      request,
      kind: "gateway",
      caller: "gateway",
      key: current,
    });
    expect(
      (await rpcError(guard.canActivate(rpcContext(confused, request))))
        .message,
    ).toBe("s2s_key_unknown_or_expired");
  });

  it("enforces gateway-only and internal-only caller kinds", async () => {
    const request = { value: "one" };
    const gatewayHandler = handlerWith({ public: true, gatewayOnly: true });
    const serviceError = await rpcError(
      guard.canActivate(
        rpcContext(signed({ request }), request, gatewayHandler),
      ),
    );
    expect(serviceError).toMatchObject({
      code: status.PERMISSION_DENIED,
      message: "s2s_gateway_caller_required",
    });

    await expect(
      guard.canActivate(
        rpcContext(
          signed({
            request,
            kind: "gateway",
            caller: "gateway",
            key: gateway,
          }),
          request,
          gatewayHandler,
        ),
      ),
    ).resolves.toBe(true);

    const internalHandler = handlerWith({ public: true, internalOnly: true });
    const gatewayError = await rpcError(
      guard.canActivate(
        rpcContext(
          signed({
            request,
            kind: "gateway",
            caller: "gateway",
            key: gateway,
            nonce: "gateway-internal-nonce",
          }),
          request,
          internalHandler,
        ),
      ),
    );
    expect(gatewayError.message).toBe("s2s_service_caller_required");
  });

  it("enforces gateway kind on a non-public authenticated RPC", async () => {
    const request = { value: "one" };
    const handler = handlerWith({ gatewayOnly: true });
    const serviceError = await rpcError(
      guard.canActivate(rpcContext(signed({ request }), request, handler)),
    );
    expect(serviceError).toMatchObject({
      code: status.PERMISSION_DENIED,
      message: "s2s_gateway_caller_required",
    });

    await expect(
      guard.canActivate(
        rpcContext(
          signed({
            request,
            kind: "gateway",
            caller: "gateway",
            key: gateway,
          }),
          request,
          handler,
        ),
      ),
    ).resolves.toBe(true);
  });

  it("enforces route-level caller allowlists", async () => {
    const request = { value: "one" };
    const handler = handlerWith({
      public: true,
      callers: ["different-service"],
    });
    const error = await rpcError(
      guard.canActivate(rpcContext(signed({ request }), request, handler)),
    );
    expect(error).toMatchObject({
      code: status.PERMISSION_DENIED,
      message: "s2s_caller_not_allowed_for_route",
    });
  });

  it("enforces exact mixed caller-kind and caller-name identities", async () => {
    const request = { value: "one" };
    const mixedHandler = handlerWith({
      public: true,
      identities: [
        { kind: "gateway", caller: "gateway" },
        { kind: "service", caller: "caller-service" },
      ],
    });

    await expect(
      guard.canActivate(rpcContext(signed({ request }), request, mixedHandler)),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        rpcContext(
          signed({
            request,
            kind: "gateway",
            caller: "gateway",
            key: gateway,
          }),
          request,
          mixedHandler,
        ),
      ),
    ).resolves.toBe(true);

    const gatewayOnlyIdentity = handlerWith({
      public: true,
      identities: [{ kind: "gateway", caller: "gateway" }],
    });
    expect(
      (
        await rpcError(
          guard.canActivate(
            rpcContext(signed({ request }), request, gatewayOnlyIdentity),
          ),
        )
      ).message,
    ).toBe("s2s_identity_not_allowed_for_route");

    const serviceOnlyIdentity = handlerWith({
      public: true,
      identities: [{ kind: "service", caller: "caller-service" }],
    });
    expect(
      (
        await rpcError(
          guard.canActivate(
            rpcContext(
              signed({
                request,
                kind: "gateway",
                caller: "gateway",
                key: gateway,
              }),
              request,
              serviceOnlyIdentity,
            ),
          ),
        )
      ).message,
    ).toBe("s2s_identity_not_allowed_for_route");
  });
});
