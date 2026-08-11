import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RpcException } from "@nestjs/microservices";
import { status, type Metadata } from "@grpc/grpc-js";
import {
  type ContextCarrier,
  type GrpcServerCallWithContext,
  type HttpRequestWithContext,
  type MetadataWithContext,
  type RpcContextWithContext,
} from "./context";
import {
  ALLOWED_S2S_CALLERS_KEY,
  ALLOWED_S2S_IDENTITIES_KEY,
  type AllowedS2SIdentity,
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  PUBLIC_FLAGS_KEY,
  type PublicFlags,
} from "./public.decorator";
import {
  S2S_PROTOCOL_VERSION_V2,
  S2S_PROTOCOL_VERSION_V3,
  verifyS2SSignature,
  type S2SCallerKind,
  type S2SSignedEnvelope,
} from "./s2s.crypto";
import {
  decodeS2SSignedContext,
  requestContextFromSigned,
  type S2SSignedContext,
} from "./s2s-context";
import { S2SReplayStore } from "./s2s-replay.store";
import { getS2SServerContext } from "./s2s.transport";
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
  requireServiceName,
  resolveInboundS2SKeySet,
  resolveS2SMaxClockSkewMs,
  resolveS2SSignHeader,
  type S2SKey,
} from "./tokens";

type HttpRequest = HttpRequestWithContext & {
  method?: string;
  path?: string;
  originalUrl?: string;
  body?: unknown;
};

const SAFE_FIELD = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const SAFE_PATH = /^\/[A-Za-z0-9][A-Za-z0-9._:@/-]{0,254}$/;
const HEX_64 = /^[a-f0-9]{64}$/i;
const LOWER_HEX_64 = /^[a-f0-9]{64}$/;

@Injectable()
export class S2SGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly replayStore: S2SReplayStore,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isRpc = ctx.getType<"http" | "rpc">() === "rpc";
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? false;
    const publicFlags =
      this.reflector.getAllAndOverride<PublicFlags>(PUBLIC_FLAGS_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? {};
    const internalOnly =
      this.reflector.getAllAndOverride<boolean>(INTERNAL_ONLY_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? false;

    // Every gRPC method is an internal transport boundary. @Public only makes
    // the end-user JWT optional; it never disables caller authentication.
    const requireS2S =
      isRpc || internalOnly || publicFlags.gatewayOnly === true || !isPublic;
    if (!requireS2S) return true;

    const metadata = ctx.getArgByIndex<MetadataWithContext | undefined>(1);
    if (!metadata) return this.unauthenticated(ctx, "s2s_metadata_missing");

    const signatureHeader = this.safeConfig(ctx, () => resolveS2SSignHeader());
    const requiredHeaders = [
      signatureHeader,
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
    ];
    const values = new Map<string, string>();
    for (const header of requiredHeaders) {
      const value = this.singleHeader(metadata, header);
      if (!value) {
        return this.unauthenticated(ctx, `s2s_${header}_missing_or_duplicate`);
      }
      values.set(header, value);
    }

    const version = values.get(X_S2S_VERSION_HEADER)!;
    if (
      version !== S2S_PROTOCOL_VERSION_V2 &&
      version !== S2S_PROTOCOL_VERSION_V3
    ) {
      return this.unauthenticated(ctx, "s2s_version_unsupported");
    }

    const contextValues = metadata.get(X_S2S_CONTEXT_HEADER);
    const contextDigestValues = metadata.get(X_S2S_CONTEXT_SHA256_HEADER);
    let signedContext: S2SSignedContext | undefined;
    let contextSha256: string | undefined;
    if (version === S2S_PROTOCOL_VERSION_V2) {
      if (contextValues.length > 0 || contextDigestValues.length > 0) {
        return this.unauthenticated(ctx, "s2s_context_not_allowed_for_v2");
      }
    } else {
      const encodedContext = this.singleHeader(metadata, X_S2S_CONTEXT_HEADER);
      contextSha256 = this.singleHeader(metadata, X_S2S_CONTEXT_SHA256_HEADER);
      if (!encodedContext) {
        return this.unauthenticated(ctx, "s2s_context_missing_or_duplicate");
      }
      if (!contextSha256) {
        return this.unauthenticated(
          ctx,
          "s2s_context_digest_missing_or_duplicate",
        );
      }
      if (!LOWER_HEX_64.test(contextSha256)) {
        return this.unauthenticated(ctx, "s2s_context_digest_invalid");
      }
      let decoded;
      try {
        decoded = decodeS2SSignedContext(encodedContext);
      } catch {
        return this.unauthenticated(ctx, "s2s_context_invalid");
      }
      if (decoded.sha256 !== contextSha256.toLowerCase()) {
        return this.unauthenticated(ctx, "s2s_context_digest_mismatch");
      }
      signedContext = decoded.context;
    }

    const kindValue = values.get(X_S2S_KIND_HEADER)!;
    if (kindValue !== "service" && kindValue !== "gateway") {
      return this.unauthenticated(ctx, "s2s_kind_invalid");
    }
    const kind: S2SCallerKind = kindValue;
    if (kind === "gateway" && version !== S2S_PROTOCOL_VERSION_V3) {
      return this.unauthenticated(ctx, "s2s_context_required_for_gateway");
    }
    const caller = values.get(X_SVC_HEADER)!;
    const target = values.get(X_S2S_TARGET_HEADER)!;
    const method = values.get(X_S2S_METHOD_HEADER)!;
    const path = values.get(X_S2S_PATH_HEADER)!;
    const nonce = values.get(X_S2S_NONCE_HEADER)!;
    const requestId = values.get(X_REQUEST_ID_HEADER)!;
    const keyId = values.get(X_S2S_KEY_ID_HEADER)!;
    const bodySha256 = values.get(X_S2S_BODY_SHA256_HEADER)!;
    const signature = values.get(signatureHeader)!;

    for (const [label, value] of [
      ["caller", caller],
      ["target", target],
      ["method", method],
      ["nonce", nonce],
      ["request_id", requestId],
      ["key_id", keyId],
    ] as const) {
      if (!SAFE_FIELD.test(value)) {
        return this.unauthenticated(ctx, `s2s_${label}_invalid`);
      }
    }
    if (!SAFE_PATH.test(path)) {
      return this.unauthenticated(ctx, "s2s_path_invalid");
    }
    if (!HEX_64.test(bodySha256) || !HEX_64.test(signature)) {
      return this.unauthenticated(ctx, "s2s_digest_or_signature_invalid");
    }

    const issuedAtMs = Number(values.get(X_S2S_ISSUED_AT_HEADER));
    const now = Date.now();
    const maxSkewMs = this.safeConfig(ctx, () => resolveS2SMaxClockSkewMs());
    if (
      !Number.isSafeInteger(issuedAtMs) ||
      issuedAtMs <= 0 ||
      Math.abs(now - issuedAtMs) > maxSkewMs
    ) {
      return this.unauthenticated(ctx, "s2s_timestamp_out_of_bounds");
    }

    const expectedTarget = this.safeConfig(ctx, () => requireServiceName());
    if (target !== expectedTarget) {
      return this.unauthenticated(ctx, "s2s_target_mismatch");
    }

    if (isRpc) {
      const trusted = getS2SServerContext(metadata);
      const call = ctx.getArgByIndex<GrpcServerCallWithContext | undefined>(2);
      if (!trusted) {
        return this.unavailable(ctx, "s2s_server_interceptor_missing");
      }
      if (!call || call.getPath() !== trusted.path) {
        return this.unavailable(ctx, "s2s_server_call_context_invalid");
      }
      if (trusted.requestStream) {
        return this.unauthenticated(ctx, "s2s_request_stream_not_supported");
      }
      if (method !== trusted.method || path !== trusted.path) {
        return this.unauthenticated(ctx, "s2s_rpc_binding_mismatch");
      }
      if (!trusted.bodySha256 || bodySha256 !== trusted.bodySha256) {
        return this.unauthenticated(ctx, "s2s_body_binding_mismatch");
      }
    } else {
      const request = ctx.switchToHttp().getRequest<HttpRequest | undefined>();
      const expectedMethod = request?.method?.toUpperCase();
      const expectedPath = request?.path ?? request?.originalUrl;
      if (!expectedMethod || !expectedPath) {
        return this.unavailable(ctx, "s2s_http_route_context_missing");
      }
      if (method !== expectedMethod || path !== expectedPath) {
        return this.unauthenticated(ctx, "s2s_http_binding_mismatch");
      }
    }

    const keySet = this.safeConfig(ctx, () =>
      resolveInboundS2SKeySet(kind, caller),
    );
    if (!keySet) {
      return this.unauthenticated(ctx, "s2s_caller_not_trusted");
    }

    const key = this.selectKey(keySet.current, keySet.previous, keyId, now);
    if (!key) return this.unauthenticated(ctx, "s2s_key_unknown_or_expired");

    const envelope: S2SSignedEnvelope =
      version === S2S_PROTOCOL_VERSION_V3
        ? {
            version,
            kind,
            caller,
            target,
            method,
            path,
            issuedAtMs,
            nonce,
            requestId,
            keyId,
            bodySha256,
            contextSha256: contextSha256!,
          }
        : {
            version,
            kind,
            caller,
            target,
            method,
            path,
            issuedAtMs,
            nonce,
            requestId,
            keyId,
            bodySha256,
          };
    if (!verifyS2SSignature(key.secret, envelope, signature)) {
      return this.unauthenticated(ctx, "s2s_signature_invalid");
    }

    if (publicFlags.gatewayOnly && kind !== "gateway") {
      return this.forbidden(ctx, "s2s_gateway_caller_required");
    }
    if (internalOnly && kind !== "service") {
      return this.forbidden(ctx, "s2s_service_caller_required");
    }

    const allowedCallers =
      this.reflector.getAllAndOverride<string[]>(ALLOWED_S2S_CALLERS_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? [];
    if (allowedCallers.length > 0 && !allowedCallers.includes(caller)) {
      return this.forbidden(ctx, "s2s_caller_not_allowed_for_route");
    }

    const allowedIdentities =
      this.reflector.getAllAndOverride<readonly AllowedS2SIdentity[]>(
        ALLOWED_S2S_IDENTITIES_KEY,
        [ctx.getHandler?.(), ctx.getClass?.()],
      ) ?? [];
    if (
      allowedIdentities.length > 0 &&
      !allowedIdentities.some(
        (identity) => identity.kind === kind && identity.caller === caller,
      )
    ) {
      return this.forbidden(ctx, "s2s_identity_not_allowed_for_route");
    }

    const replayTtlMs = Math.max(1_000, issuedAtMs + maxSkewMs - now + 1_000);
    let claimed: boolean;
    try {
      claimed = await this.replayStore.claim(
        [kind, caller, target, keyId, nonce].join("|"),
        replayTtlMs,
      );
    } catch {
      return this.unavailable(ctx, "s2s_replay_store_unavailable");
    }
    if (!claimed) return this.unauthenticated(ctx, "s2s_request_replayed");

    this.attachVerifiedCaller(ctx, caller, kind, requestId, signedContext);
    return true;
  }

  private singleHeader(metadata: Metadata, key: string): string | undefined {
    const values = metadata.get(key);
    if (values.length !== 1 || typeof values[0] !== "string") return undefined;
    return values[0];
  }

  private selectKey(
    current: S2SKey,
    previous: (S2SKey & { notAfterMs: number }) | undefined,
    keyId: string,
    now: number,
  ): S2SKey | undefined {
    if (current.id === keyId) return current;
    if (previous?.id === keyId && previous.notAfterMs >= now) return previous;
    return undefined;
  }

  private safeConfig<T>(ctx: ExecutionContext, resolve: () => T): T {
    try {
      return resolve();
    } catch {
      return this.unavailable(ctx, "s2s_configuration_invalid");
    }
  }

  private unauthenticated(ctx: ExecutionContext, message: string): never {
    if (ctx.getType<"http" | "rpc">() === "rpc") {
      throw new RpcException({ code: status.UNAUTHENTICATED, message });
    }
    throw new UnauthorizedException(message);
  }

  private forbidden(ctx: ExecutionContext, message: string): never {
    if (ctx.getType<"http" | "rpc">() === "rpc") {
      throw new RpcException({ code: status.PERMISSION_DENIED, message });
    }
    throw new ForbiddenException(message);
  }

  private unavailable(ctx: ExecutionContext, message: string): never {
    if (ctx.getType<"http" | "rpc">() === "rpc") {
      throw new RpcException({ code: status.UNAVAILABLE, message });
    }
    throw new ServiceUnavailableException(message);
  }

  private attachVerifiedCaller(
    ctx: ExecutionContext,
    svc: string,
    svcKind: S2SCallerKind,
    requestId: string,
    signedContext?: S2SSignedContext,
  ): void {
    const attach = (carrier: ContextCarrier | undefined) => {
      if (!carrier) return;
      carrier.svc = svc;
      carrier.svcKind = svcKind;
      carrier.requestId = requestId;
      if (signedContext) {
        carrier.requestContext = requestContextFromSigned(signedContext);
        if (signedContext.actor) carrier.signedActor = signedContext.actor;
        else delete carrier.signedActor;
      } else {
        delete carrier.requestContext;
        delete carrier.signedActor;
      }
    };

    if (ctx.getType<"http" | "rpc">() === "http") {
      attach(
        ctx.switchToHttp().getRequest<HttpRequestWithContext | undefined>(),
      );
    } else {
      // In Nest RPC contexts switchToHttp().getRequest() can alias the decoded
      // protobuf body. Never attach trusted transport context to application
      // data; class-validator correctly treats those fields as untrusted.
      attach(ctx.getArgByIndex<MetadataWithContext | undefined>(1));
      attach(ctx.switchToRpc().getContext<RpcContextWithContext | undefined>());
      attach(ctx.getArgByIndex<GrpcServerCallWithContext | undefined>(2));
    }
    attach(ctx as ExecutionContext & ContextCarrier);
  }
}
