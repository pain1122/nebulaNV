export const AUTHORITY_UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const TENANT_SITE_LIFECYCLE_STATES = [
  "PROVISIONING",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export const APPLICATION_LIFECYCLE_STATES = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "DISABLED",
  "REVOKED",
] as const;

export const CHANNEL_KINDS = ["WEB", "ANDROID", "IOS"] as const;
export const APPLICATION_PROFILES = [
  "storefront-web",
  "admin-web",
  "mobile",
] as const;
export const IDENTITY_VERIFICATION_STATES = [
  "PENDING",
  "VERIFIED",
  "REVOKED",
] as const;
export const PARENT_RELATIONSHIP_STATES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
] as const;
export const ENTITLEMENT_SCOPE_KINDS = ["TENANT", "SITE"] as const;

export type TenantSiteLifecycle = (typeof TENANT_SITE_LIFECYCLE_STATES)[number];
export type ApplicationLifecycle =
  (typeof APPLICATION_LIFECYCLE_STATES)[number];
export type ChannelKind = (typeof CHANNEL_KINDS)[number];
export type ApplicationProfile = (typeof APPLICATION_PROFILES)[number];
export type IdentityVerificationState =
  (typeof IDENTITY_VERIFICATION_STATES)[number];
export type ParentRelationshipState =
  (typeof PARENT_RELATIONSHIP_STATES)[number];
export type EntitlementScopeKind = (typeof ENTITLEMENT_SCOPE_KINDS)[number];

export function assertAuthorityUuidV4(value: string, field: string): string {
  if (!AUTHORITY_UUID_V4_PATTERN.test(value)) {
    throw new Error(`${field}_must_be_canonical_uuid_v4`);
  }
  return value;
}
