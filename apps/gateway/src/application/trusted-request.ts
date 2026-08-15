import {
  GATEWAY_ACTOR_ROLES,
  PUBLIC_APPLICATION_PROFILES,
  SIGNED_CONTEXT_ID_MAX_BYTES,
  SIGNED_CONTEXT_ID_PATTERN,
  type ApplicationChannelKind,
  type ApplicationRecord,
  type AuthenticatedActorIdentity,
  type AuthenticatedActorState,
  type GatewayActorState,
  type GatewayRequestContext,
  type PublicApplicationProfile,
} from "./application.contracts";

export const ANONYMOUS_ACTOR: GatewayActorState = Object.freeze({
  kind: "anonymous",
});

export function assertSignedContextId(value: string, fieldName: string): void {
  if (
    !SIGNED_CONTEXT_ID_PATTERN.test(value) ||
    Buffer.byteLength(value, "utf8") > SIGNED_CONTEXT_ID_MAX_BYTES
  ) {
    throw new Error(`${fieldName} is not a safe signed-context identifier`);
  }
}

export function channelKindForProfile(
  profile: PublicApplicationProfile,
): ApplicationChannelKind {
  return profile === "mobile" ? "mobile" : "web";
}

/**
 * Converts only an auth-service-verified identity into trusted request actor
 * state. Registry
 * identity, client headers, request bodies, and local JWT decoding are not
 * accepted by this boundary.
 */
export function actorFromVerifiedAuth(
  identity: AuthenticatedActorIdentity,
): AuthenticatedActorState {
  if (!(GATEWAY_ACTOR_ROLES as readonly string[]).includes(identity.role)) {
    throw new Error("actor.role is not a supported verified global role");
  }
  assertSignedContextId(identity.userId, "actor.userId");
  assertSignedContextId(identity.sessionRef, "actor.sessionRef");

  return Object.freeze({
    kind: "authenticated" as const,
    identity: Object.freeze({ ...identity }),
  });
}

export function isGlobalAdminActor(actor: GatewayActorState): boolean {
  return (
    actor.kind === "authenticated" &&
    (actor.identity.role === "admin" || actor.identity.role === "root-admin")
  );
}

export function createGatewayRequestContext(
  record: ApplicationRecord,
  requestId: string,
): GatewayRequestContext {
  assertSignedContextId(requestId, "requestId");
  assertSignedContextId(record.applicationId, "applicationId");
  assertSignedContextId(record.tenantId, "tenantId");
  assertSignedContextId(record.siteId, "siteId");
  assertSignedContextId(record.channelId, "channelId");
  assertSignedContextId(record.rateLimitProfile, "rateLimitProfile");
  if (
    !(PUBLIC_APPLICATION_PROFILES as readonly string[]).includes(record.profile)
  ) {
    throw new Error("applicationProfile is not a supported public profile");
  }

  return Object.freeze({
    requestId,
    applicationId: record.applicationId,
    applicationProfile: record.profile,
    tenantId: record.tenantId,
    siteId: record.siteId,
    channelId: record.channelId,
    channelKind: channelKindForProfile(record.profile),
    rateLimitProfile: record.rateLimitProfile,
  });
}
