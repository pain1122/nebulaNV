import { Controller, Logger } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { GrpcMethod } from "@nestjs/microservices";
import {
  AllowedS2SIdentities,
  InternalOnly,
  RequireS2SAuthorityResolution,
  RequireUserId,
  Public,
  toRpc,
  type AllowedS2SIdentity,
  type MetadataWithContext,
} from "@nebula/grpc-auth";
import { tenantauthorityv1 } from "@nebula/protos";
import { AUTHORITY_UUID_V4_PATTERN } from "./authority-domain";
import type {
  ActorAuthorizationPath,
  AuthorityResolutionStatus,
  ScopedAuthorityRole,
} from "./authority-read.types";
import { AuthorityService } from "./authority.service";

const PUBLIC_CLIENT_HANDLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const NORMALIZED_OPERATION_PATTERN =
  /^[A-Z][A-Z0-9]{0,62}\.[A-Z][A-Z0-9]{0,63}$/;
const AUTHORITY_READ_CALLERS: readonly AllowedS2SIdentity[] = Object.freeze([
  { kind: "gateway", caller: "gateway" },
  { kind: "service", caller: "auth-service" },
  { kind: "service", caller: "user-service" },
  { kind: "service", caller: "product-service" },
  { kind: "service", caller: "settings-service" },
  { kind: "service", caller: "blog-service" },
  { kind: "service", caller: "order-service" },
  { kind: "service", caller: "taxonomy-service" },
  { kind: "service", caller: "media-service" },
]);
const GATEWAY_CALLER: AllowedS2SIdentity = Object.freeze({
  kind: "gateway",
  caller: "gateway",
});

function requiredUuid(value: string, field: string): string {
  if (!AUTHORITY_UUID_V4_PATTERN.test(value)) {
    throw toRpc(status.INVALID_ARGUMENT, `${field}_must_be_canonical_uuid_v4`);
  }
  return value;
}

function optionalUuid(value: string | undefined, field: string) {
  return value === undefined ? undefined : requiredUuid(value, field);
}

function requiredClientHandle(value: string): string {
  if (!PUBLIC_CLIENT_HANDLE_PATTERN.test(value)) {
    throw toRpc(status.INVALID_ARGUMENT, "client_handle_invalid");
  }
  return value;
}

function optionalCanonicalOrigin(value: string | undefined) {
  if (value === undefined) return undefined;
  const match =
    /^(https?):\/\/(\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?):([0-9]{1,5})$/.exec(
      value,
    );
  const port = match ? Number(match[3]) : 0;
  if (!match || port < 1 || port > 65_535) {
    throw toRpc(status.INVALID_ARGUMENT, "canonical_origin_invalid");
  }
  return value;
}

function resolutionStatus(statusValue: AuthorityResolutionStatus | "DENIED") {
  const values = tenantauthorityv1.ResolutionStatus;
  switch (statusValue) {
    case "RESOLVED":
      return values.RESOLUTION_STATUS_RESOLVED;
    case "NOT_FOUND":
      return values.RESOLUTION_STATUS_NOT_FOUND;
    case "INACTIVE":
      return values.RESOLUTION_STATUS_INACTIVE;
    case "IDENTITY_MISMATCH":
      return values.RESOLUTION_STATUS_IDENTITY_MISMATCH;
    case "SCOPE_MISMATCH":
      return values.RESOLUTION_STATUS_SCOPE_MISMATCH;
    case "CONTRADICTORY":
      return values.RESOLUTION_STATUS_CONTRADICTORY;
    case "DENIED":
      return values.RESOLUTION_STATUS_DENIED;
  }
}

function authorizationPath(
  value: tenantauthorityv1.AuthorizationPath,
): ActorAuthorizationPath {
  const paths = tenantauthorityv1.AuthorizationPath;
  switch (value) {
    case paths.AUTHORIZATION_PATH_APPLICATION:
      return "APPLICATION";
    case paths.AUTHORIZATION_PATH_TENANT_MANAGEMENT:
      return "TENANT_MANAGEMENT";
    case paths.AUTHORIZATION_PATH_PARENT_MANAGEMENT:
      return "PARENT_MANAGEMENT";
    case paths.AUTHORIZATION_PATH_PLATFORM_MANAGEMENT:
      return "PLATFORM_MANAGEMENT";
    case paths.AUTHORIZATION_PATH_SERVICE_OPERATION:
      return "SERVICE_OPERATION";
    default:
      throw toRpc(status.INVALID_ARGUMENT, "authorization_path_invalid");
  }
}

function authorizationPathValue(value: ActorAuthorizationPath) {
  const paths = tenantauthorityv1.AuthorizationPath;
  switch (value) {
    case "APPLICATION":
      return paths.AUTHORIZATION_PATH_APPLICATION;
    case "TENANT_MANAGEMENT":
      return paths.AUTHORIZATION_PATH_TENANT_MANAGEMENT;
    case "PARENT_MANAGEMENT":
      return paths.AUTHORIZATION_PATH_PARENT_MANAGEMENT;
    case "PLATFORM_MANAGEMENT":
      return paths.AUTHORIZATION_PATH_PLATFORM_MANAGEMENT;
    case "SERVICE_OPERATION":
      return paths.AUTHORIZATION_PATH_SERVICE_OPERATION;
  }
}

function scopedRoleValue(value: ScopedAuthorityRole) {
  const roles = tenantauthorityv1.ScopedAuthorityRole;
  switch (value) {
    case "PLATFORM_ADMIN":
      return roles.SCOPED_AUTHORITY_ROLE_PLATFORM_ADMIN;
    case "TENANT_ADMIN":
      return roles.SCOPED_AUTHORITY_ROLE_TENANT_ADMIN;
    case "SITE_ADMIN":
      return roles.SCOPED_AUTHORITY_ROLE_SITE_ADMIN;
    case "PARENT_MANAGER":
      return roles.SCOPED_AUTHORITY_ROLE_PARENT_MANAGER;
    case "EDITOR":
      return roles.SCOPED_AUTHORITY_ROLE_EDITOR;
    case "USER":
      return roles.SCOPED_AUTHORITY_ROLE_USER;
  }
}

function normalizedOperation(value: string): string {
  if (!NORMALIZED_OPERATION_PATTERN.test(value)) {
    throw toRpc(status.INVALID_ARGUMENT, "normalized_operation_invalid");
  }
  return value;
}

@Controller()
export class AuthorityGrpcController {
  private readonly logger = new Logger(AuthorityGrpcController.name);

  constructor(private readonly authority: AuthorityService) {}

  private async readOrUnavailable<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      this.logger.error("tenant_authority_read_unavailable");
      throw toRpc(status.UNAVAILABLE, "tenant_authority_unavailable");
    }
  }

  @Public()
  @InternalOnly()
  @AllowedS2SIdentities(GATEWAY_CALLER)
  @GrpcMethod("TenantAuthorityService", "ResolveApplicationRegistration")
  async resolveApplicationRegistration(
    request: tenantauthorityv1.ResolveApplicationRegistrationRequest,
  ): Promise<tenantauthorityv1.ResolveApplicationRegistrationResponse> {
    const clientHandle = requiredClientHandle(request.clientHandle);
    const canonicalOrigin = optionalCanonicalOrigin(request.canonicalOrigin);
    const result = await this.readOrUnavailable(() =>
      this.authority.resolveApplicationRegistration(
        clientHandle,
        canonicalOrigin,
      ),
    );
    const registration = result.registration;
    return tenantauthorityv1.ResolveApplicationRegistrationResponse.create({
      status: resolutionStatus(result.status),
      registration: registration
        ? tenantauthorityv1.ApplicationRegistration.create({
            applicationId: registration.applicationId,
            tenantId: registration.tenantId,
            siteId: registration.siteId,
            channelId: registration.channelId,
            channelKind:
              registration.channelKind === "WEB"
                ? tenantauthorityv1.ChannelKind.CHANNEL_KIND_WEB
                : registration.channelKind === "ANDROID"
                  ? tenantauthorityv1.ChannelKind.CHANNEL_KIND_ANDROID
                  : tenantauthorityv1.ChannelKind.CHANNEL_KIND_IOS,
            profile:
              registration.profile === "storefront-web"
                ? tenantauthorityv1.ApplicationProfile
                    .APPLICATION_PROFILE_STOREFRONT_WEB
                : registration.profile === "admin-web"
                  ? tenantauthorityv1.ApplicationProfile
                      .APPLICATION_PROFILE_ADMIN_WEB
                  : tenantauthorityv1.ApplicationProfile
                      .APPLICATION_PROFILE_MOBILE,
            allowedWebOrigins: [...registration.allowedWebOrigins],
            applicationRevision: registration.applicationRevision,
            tenantRevision: registration.tenantRevision,
            siteRevision: registration.siteRevision,
          })
        : undefined,
    });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SIdentities(GATEWAY_CALLER)
  @GrpcMethod("TenantAuthorityService", "ListAllowedWebOrigins")
  async listAllowedWebOrigins(): Promise<tenantauthorityv1.ListAllowedWebOriginsResponse> {
    const origins = await this.readOrUnavailable(() =>
      this.authority.listAllowedWebOrigins(),
    );
    return tenantauthorityv1.ListAllowedWebOriginsResponse.create({
      canonicalOrigins: [...origins],
    });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SIdentities(...AUTHORITY_READ_CALLERS)
  @GrpcMethod("TenantAuthorityService", "ValidateTargetScope")
  async validateTargetScope(
    request: tenantauthorityv1.ValidateTargetScopeRequest,
  ): Promise<tenantauthorityv1.ValidateTargetScopeResponse> {
    const tenantId = requiredUuid(request.tenantId, "tenant_id");
    const siteId = optionalUuid(request.siteId, "site_id");
    const result = await this.readOrUnavailable(() =>
      this.authority.validateTargetScope(tenantId, siteId),
    );
    return tenantauthorityv1.ValidateTargetScopeResponse.create({
      status: resolutionStatus(result.status),
      tenantRevision: result.tenantRevision,
      siteRevision: result.siteRevision,
    });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SIdentities(...AUTHORITY_READ_CALLERS)
  @GrpcMethod("TenantAuthorityService", "ResolveEntitlementScopeRef")
  async resolveEntitlementScopeRef(
    request: tenantauthorityv1.ResolveEntitlementScopeRefRequest,
  ): Promise<tenantauthorityv1.ResolveEntitlementScopeRefResponse> {
    const referenceId = requiredUuid(
      request.entitlementScopeRef,
      "entitlement_scope_ref",
    );
    const tenantId = requiredUuid(
      request.expectedTenantId,
      "expected_tenant_id",
    );
    const siteId = optionalUuid(request.expectedSiteId, "expected_site_id");
    const result = await this.readOrUnavailable(() =>
      this.authority.resolveEntitlementScopeRef(referenceId, tenantId, siteId),
    );
    return tenantauthorityv1.ResolveEntitlementScopeRefResponse.create({
      status: resolutionStatus(result.status),
      scopeKind:
        result.scopeKind === "TENANT"
          ? tenantauthorityv1.ScopeKind.SCOPE_KIND_TENANT
          : result.scopeKind === "SITE"
            ? tenantauthorityv1.ScopeKind.SCOPE_KIND_SITE
            : tenantauthorityv1.ScopeKind.SCOPE_KIND_UNSPECIFIED,
      tenantId: result.tenantId,
      siteId: result.siteId,
      referenceRevision: result.referenceRevision,
    });
  }

  @RequireUserId()
  @RequireS2SAuthorityResolution()
  @AllowedS2SIdentities(...AUTHORITY_READ_CALLERS)
  @GrpcMethod("TenantAuthorityService", "ResolveActorAuthorization")
  async resolveActorAuthorization(
    request: tenantauthorityv1.ResolveActorAuthorizationRequest,
    metadata: MetadataWithContext,
  ): Promise<tenantauthorityv1.ResolveActorAuthorizationResponse> {
    const actorUserId = requiredUuid(request.actorUserId, "actor_user_id");
    const actorTenantId = optionalUuid(
      request.actorTenantId,
      "actor_tenant_id",
    );
    const targetTenantId = requiredUuid(
      request.targetTenantId,
      "target_tenant_id",
    );
    const targetSiteId = optionalUuid(request.targetSiteId, "target_site_id");
    const applicationId = optionalUuid(request.applicationId, "application_id");
    const path = authorizationPath(request.authorizationPath);
    const operation = normalizedOperation(request.normalizedOperation);
    const verifiedUserId = metadata.user?.userId;
    const verifiedSessionRef = metadata.user?.sessionRef;
    const signedActor = metadata.resolutionContext?.actor;
    const transportActor = metadata.signedActor;
    if (
      !signedActor ||
      !transportActor ||
      verifiedUserId !== actorUserId ||
      signedActor.userId !== actorUserId ||
      transportActor.userId !== actorUserId ||
      verifiedSessionRef !== signedActor.sessionRef ||
      transportActor.sessionRef !== signedActor.sessionRef
    ) {
      throw toRpc(status.UNAUTHENTICATED, "actor_identity_mismatch");
    }
    const application = metadata.resolutionContext?.application;
    if (
      path === "APPLICATION" &&
      (!application ||
        application.applicationId !== applicationId ||
        application.tenantId !== targetTenantId ||
        application.siteId !== targetSiteId)
    ) {
      throw toRpc(status.PERMISSION_DENIED, "application_context_mismatch");
    }

    const result = await this.readOrUnavailable(() =>
      this.authority.resolveActorAuthorization({
        actorUserId,
        actorTenantId,
        targetTenantId,
        targetSiteId,
        applicationId,
        authorizationPath: path,
        normalizedOperation: operation,
      }),
    );
    const decision = result.decision;
    return tenantauthorityv1.ResolveActorAuthorizationResponse.create({
      status: resolutionStatus(result.status),
      decision: decision
        ? tenantauthorityv1.ActorAuthorizationDecision.create({
            actorUserId: decision.actorUserId,
            authorizationPath: authorizationPathValue(
              decision.authorizationPath,
            ),
            normalizedOperation: decision.normalizedOperation,
            targetTenantId: decision.targetTenantId,
            targetSiteId: decision.targetSiteId,
            membershipAuthority:
              decision.actorAuthority.kind === "MEMBERSHIP"
                ? tenantauthorityv1.MembershipAuthority.create({
                    actorTenantId: decision.actorAuthority.actorTenantId,
                    membershipId: decision.actorAuthority.membershipId,
                    membershipEpochRef:
                      decision.actorAuthority.membershipEpochRef,
                    effectiveRole: scopedRoleValue(
                      decision.actorAuthority.effectiveRole,
                    ),
                    tenantRoleGrantId:
                      decision.actorAuthority.tenantRoleGrantId,
                    siteId: decision.actorAuthority.siteId,
                    siteRoleGrantId: decision.actorAuthority.siteRoleGrantId,
                  })
                : undefined,
            platformAuthority:
              decision.actorAuthority.kind === "PLATFORM"
                ? tenantauthorityv1.PlatformAuthority.create({
                    platformGrantId: decision.actorAuthority.platformGrantId,
                    effectiveRole: scopedRoleValue(
                      decision.actorAuthority.effectiveRole,
                    ),
                  })
                : undefined,
            relationshipId: decision.relationshipId,
            authorityRevision: decision.authorityRevision,
            resolvedAtMs: decision.resolvedAtMs,
          })
        : undefined,
    });
  }
}
