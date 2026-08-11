export const PUBLIC_APPLICATION_PROFILES = [
  "storefront-web",
  "admin-web",
  "mobile",
] as const;

export type PublicApplicationProfile =
  (typeof PUBLIC_APPLICATION_PROFILES)[number];

export const RESERVED_CONFIDENTIAL_APPLICATION_PROFILE =
  "partner-server" as const;

export type ReservedConfidentialApplicationProfile =
  typeof RESERVED_CONFIDENTIAL_APPLICATION_PROFILE;

export type ApplicationProfile =
  | PublicApplicationProfile
  | ReservedConfidentialApplicationProfile;

export type ApplicationChannelKind = "web" | "mobile";

export const GATEWAY_ACTOR_ROLES = ["user", "admin", "root-admin"] as const;
export type GatewayActorRole = (typeof GATEWAY_ACTOR_ROLES)[number];

export type AnonymousActorState = Readonly<{
  kind: "anonymous";
}>;

export type AuthenticatedActorIdentity = Readonly<{
  userId: string;
  role: GatewayActorRole;
  sessionRef: string;
}>;

export type AuthenticatedActorState = Readonly<{
  kind: "authenticated";
  identity: AuthenticatedActorIdentity;
}>;

export type GatewayActorState = AnonymousActorState | AuthenticatedActorState;

export type ApplicationRecord = Readonly<{
  clientId: string;
  applicationId: string;
  profile: PublicApplicationProfile;
  tenantId: string;
  siteId: string;
  channelId: string;
  enabled: boolean;
  origins: readonly string[];
  rateLimitProfile: string;
}>;

export type ApplicationLookup = Readonly<{
  clientId: string;
  origin?: string;
}>;

export interface ApplicationRegistry {
  resolve(input: ApplicationLookup): Promise<ApplicationRecord | null>;
  allowedBrowserOrigins(): Promise<readonly string[]>;
  readiness(): Promise<void>;
}

export type GatewayRequestContext = Readonly<{
  requestId: string;
  applicationId: string;
  applicationProfile: PublicApplicationProfile;
  tenantId: string;
  siteId: string;
  channelId: string;
  channelKind: ApplicationChannelKind;
  rateLimitProfile: string;
}>;

export const GATEWAY_PUBLIC_CLIENT_HEADER = "x-nebula-client-id" as const;

export const PUBLIC_CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const SIGNED_CONTEXT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
export const SIGNED_CONTEXT_ID_MAX_BYTES = 128;
export const SIGNED_CONTEXT_JSON_MAX_BYTES = 1024;
export const SIGNED_CONTEXT_VERSION = "1" as const;
