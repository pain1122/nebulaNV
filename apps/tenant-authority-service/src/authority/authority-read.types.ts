import type {
  ApplicationProfile,
  ChannelKind,
  EntitlementScopeKind,
} from "./authority-domain";

export type AuthorityResolutionStatus =
  | "RESOLVED"
  | "NOT_FOUND"
  | "INACTIVE"
  | "IDENTITY_MISMATCH"
  | "SCOPE_MISMATCH"
  | "CONTRADICTORY";

export type ApplicationRegistrationFact = Readonly<{
  applicationId: string;
  tenantId: string;
  siteId: string;
  channelId: string;
  channelKind: ChannelKind;
  profile: ApplicationProfile;
  allowedWebOrigins: readonly string[];
  applicationRevision: string;
  tenantRevision: string;
  siteRevision: string;
}>;

export type ApplicationResolution = Readonly<{
  status: AuthorityResolutionStatus;
  registration?: ApplicationRegistrationFact;
}>;

export type TargetScopeResolution = Readonly<{
  status: AuthorityResolutionStatus;
  tenantRevision?: string;
  siteRevision?: string;
}>;

export type EntitlementScopeResolution = Readonly<{
  status: AuthorityResolutionStatus;
  scopeKind?: EntitlementScopeKind;
  tenantId?: string;
  siteId?: string;
  referenceRevision?: string;
}>;

export type ActorAuthorizationPath =
  | "APPLICATION"
  | "TENANT_MANAGEMENT"
  | "PARENT_MANAGEMENT"
  | "PLATFORM_MANAGEMENT"
  | "SERVICE_OPERATION";

export type ScopedAuthorityRole =
  | "PLATFORM_ADMIN"
  | "TENANT_ADMIN"
  | "SITE_ADMIN"
  | "PARENT_MANAGER"
  | "EDITOR"
  | "USER";

export type ResolveActorAuthorizationInput = Readonly<{
  actorUserId: string;
  actorTenantId?: string;
  targetTenantId: string;
  targetSiteId?: string;
  applicationId?: string;
  authorizationPath: ActorAuthorizationPath;
  normalizedOperation: string;
}>;

export type MembershipAuthorityFact = Readonly<{
  kind: "MEMBERSHIP";
  actorTenantId: string;
  membershipId: string;
  membershipEpochRef: string;
  effectiveRole: Exclude<ScopedAuthorityRole, "PLATFORM_ADMIN">;
  tenantRoleGrantId?: string;
  siteId?: string;
  siteRoleGrantId?: string;
}>;

export type PlatformAuthorityFact = Readonly<{
  kind: "PLATFORM";
  platformGrantId: string;
  effectiveRole: "PLATFORM_ADMIN";
}>;

export type ActorAuthorizationDecision = Readonly<{
  actorUserId: string;
  authorizationPath: ActorAuthorizationPath;
  normalizedOperation: string;
  targetTenantId: string;
  targetSiteId?: string;
  actorAuthority: MembershipAuthorityFact | PlatformAuthorityFact;
  relationshipId?: string;
  authorityRevision: string;
  resolvedAtMs: number;
}>;

export type ActorAuthorizationResolution = Readonly<{
  status: AuthorityResolutionStatus | "DENIED";
  decision?: ActorAuthorizationDecision;
}>;
