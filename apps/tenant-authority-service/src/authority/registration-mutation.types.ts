import type { ApplicationProfile } from "./authority-domain";

export type RegistrationMutationContext = Readonly<{
  requestId: string;
}>;

export type CreatePendingApplicationInput = Readonly<{
  tenantId: string;
  siteId: string;
  channelId: string;
  displayName: string;
  profile: ApplicationProfile;
}>;

export type UpdateApplicationDisplayNameInput = Readonly<{
  applicationId: string;
  expectedTenantId: string;
  expectedSiteId: string;
  expectedRevision: bigint;
  displayName: string;
}>;

export type RevokeApplicationInput = Readonly<{
  applicationId: string;
  expectedTenantId: string;
  expectedSiteId: string;
  expectedRevision: bigint;
}>;

export type RegistrationMutationResult = Readonly<{
  applicationId: string;
  clientId?: string;
  revision: bigint;
}>;

export class RegistrationMutationDeniedError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
    this.name = "RegistrationMutationDeniedError";
  }
}
