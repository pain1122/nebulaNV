import { Metadata } from "@grpc/grpc-js";
import type { GrpcClientSigningPolicy } from "@nebula/clients";
import {
  GATEWAY_CALLER_ID,
  GATEWAY_OUTBOUND_TARGETS,
  resolveOutboundS2SKey,
  withBearer,
  type S2SSignedContext,
} from "@nebula/grpc-auth";
import type { GatewayHttpRequest } from "../http/application-context";

export type GatewayOutboundTarget = (typeof GATEWAY_OUTBOUND_TARGETS)[number];

export type GatewayDownstreamContext = Readonly<{
  signingPolicy: GrpcClientSigningPolicy;
  metadata: Metadata;
}>;

function assertTarget(target: string): asserts target is GatewayOutboundTarget {
  if (!(GATEWAY_OUTBOUND_TARGETS as readonly string[]).includes(target)) {
    throw new Error("gateway_downstream_target_not_allowed");
  }
}

function signedContext(request: GatewayHttpRequest): S2SSignedContext {
  const context = request.requestContext;
  if (!context) throw new Error("gateway_request_context_missing");

  const actor = request.actor;
  const user = request.user;
  const accessToken = request.accessToken;
  if (actor?.kind === "authenticated") {
    if (
      !user ||
      !accessToken ||
      user.userId !== actor.identity.userId ||
      user.role !== actor.identity.role ||
      user.sessionRef !== actor.identity.sessionRef
    ) {
      throw new Error("gateway_verified_actor_state_incomplete");
    }
  } else if (user || accessToken) {
    throw new Error("gateway_anonymous_actor_state_inconsistent");
  }

  return Object.freeze({
    version: "1" as const,
    applicationId: context.applicationId,
    tenantId: context.tenantId,
    siteId: context.siteId,
    channelId: context.channelId,
    ...(actor?.kind === "authenticated"
      ? {
          actor: Object.freeze({
            userId: actor.identity.userId,
            role: actor.identity.role,
            sessionRef: actor.identity.sessionRef,
          }),
        }
      : {}),
  });
}

/**
 * Builds only trusted per-request inputs. The typed wrapper still owns the
 * downstream target, generated method definition, request body, timestamp,
 * and nonce for each individual invocation.
 */
export function createGatewayDownstreamContext(
  request: GatewayHttpRequest,
  target: GatewayOutboundTarget,
): GatewayDownstreamContext {
  assertTarget(target);
  const requestContext = request.requestContext;
  if (!requestContext) throw new Error("gateway_request_context_missing");
  const key = resolveOutboundS2SKey("gateway", target);
  if (!key) throw new Error(`gateway_downstream_key_missing_${target}`);

  return Object.freeze({
    signingPolicy: Object.freeze({
      kind: "gateway" as const,
      serviceName: GATEWAY_CALLER_ID,
      key,
      requestId: requestContext.requestId,
      context: signedContext(request),
    }),
    metadata: withBearer(new Metadata(), request.accessToken),
  });
}
