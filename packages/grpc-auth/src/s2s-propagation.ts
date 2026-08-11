import { Metadata } from "@grpc/grpc-js";
import {
  type ContextCarrier,
  type ContextUser,
  type MetadataWithContext,
  metadataValueToString,
} from "./context";
import { bearer, tokenFromAuthorization } from "./metadata";
import {
  normalizeS2SSignedContext,
  type S2SActorAssertion,
  type S2SRequestContext,
  type S2SSignedContext,
} from "./s2s-context";
import { AUTHORIZATION_HEADER } from "./tokens";

export type ServiceDownstreamSigningPolicy = Readonly<{
  requestId: string;
  context?: S2SSignedContext;
}>;

export type VerifiedServiceDownstreamContext = Readonly<{
  signingPolicy: ServiceDownstreamSigningPolicy;
  metadata: Metadata;
}>;

function sameRequestContext(
  left: S2SRequestContext,
  right: S2SRequestContext,
): boolean {
  return (
    left.applicationId === right.applicationId &&
    left.tenantId === right.tenantId &&
    left.siteId === right.siteId &&
    left.channelId === right.channelId
  );
}

function sameActor(left: S2SActorAssertion, right: S2SActorAssertion): boolean {
  return (
    left.userId === right.userId &&
    left.role === right.role &&
    left.sessionRef === right.sessionRef
  );
}

function sameUser(left: ContextUser, right: ContextUser): boolean {
  return (
    left.userId === right.userId &&
    left.role === right.role &&
    left.sessionRef === right.sessionRef
  );
}

function consistentValue<T>(
  label: string,
  left: T | undefined,
  right: T | undefined,
  same: (left: T, right: T) => boolean = Object.is,
): T | undefined {
  if (left !== undefined && right !== undefined && !same(left, right)) {
    throw new Error(`s2s_propagation_${label}_mismatch`);
  }
  return left ?? right;
}

function exactBearerToken(metadata: Metadata): string | undefined {
  const values = metadata.get(AUTHORIZATION_HEADER);
  if (values.length > 1) {
    throw new Error("s2s_propagation_authorization_duplicate");
  }
  if (values.length === 0) return undefined;

  const raw = metadataValueToString(values[0]);
  const token = tokenFromAuthorization(raw);
  if (!token) throw new Error("s2s_propagation_authorization_invalid");
  return token;
}

/**
 * Project only context already verified by the inbound S2S and bearer guards.
 *
 * The returned policy intentionally omits caller kind/name and target key so
 * the next service hop resolves its own service identity and pairwise target
 * key. Client wrappers still own the exact target, method, request body, and a
 * fresh timestamp/nonce for every invocation.
 */
export function createVerifiedServiceDownstreamContext(
  metadata: MetadataWithContext,
  call?: ContextCarrier,
): VerifiedServiceDownstreamContext {
  const svc = consistentValue("caller", metadata.svc, call?.svc);
  const svcKind = consistentValue(
    "caller_kind",
    metadata.svcKind,
    call?.svcKind,
  );
  const requestId = consistentValue(
    "request_id",
    metadata.requestId,
    call?.requestId,
  );
  if (!svc || !svcKind || !requestId) {
    throw new Error("s2s_propagation_verified_ingress_missing");
  }

  const requestContext = consistentValue(
    "request_context",
    metadata.requestContext,
    call?.requestContext,
    sameRequestContext,
  );
  const actor = consistentValue(
    "actor",
    metadata.signedActor,
    call?.signedActor,
    sameActor,
  );
  const user = consistentValue("user", metadata.user, call?.user, sameUser);
  const token = exactBearerToken(metadata);

  if (actor && !requestContext) {
    throw new Error("s2s_propagation_actor_context_missing");
  }
  if (actor && (!token || !user || !sameUser(actor, user))) {
    throw new Error("s2s_propagation_verified_actor_incomplete");
  }
  if (requestContext && !actor && (token || user)) {
    throw new Error("s2s_propagation_anonymous_context_inconsistent");
  }
  if (!requestContext && Boolean(token) !== Boolean(user)) {
    throw new Error("s2s_propagation_v2_actor_incomplete");
  }

  const context = requestContext
    ? normalizeS2SSignedContext({
        version: "1",
        ...requestContext,
        ...(actor ? { actor } : {}),
      })
    : undefined;

  return Object.freeze({
    signingPolicy: Object.freeze({
      requestId,
      ...(context ? { context } : {}),
    }),
    metadata: bearer(token) ?? new Metadata(),
  });
}
