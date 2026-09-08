import { Injectable } from "@nestjs/common";
import { AUTHORITY_UUID_V4_PATTERN } from "./authority-domain";
import { RegistrationMutationRepository } from "./registration-mutation.repository";
import {
  RegistrationMutationDeniedError,
  type CreatePendingApplicationInput,
  type RegistrationMutationContext,
  type RegistrationMutationResult,
  type RevokeApplicationInput,
  type UpdateApplicationDisplayNameInput,
} from "./registration-mutation.types";

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;

function validateContext(context: RegistrationMutationContext): void {
  if (!SAFE_REQUEST_ID.test(context.requestId)) {
    throw new RegistrationMutationDeniedError("REQUEST_ID_INVALID");
  }
}

function validateUuid(value: string, reason: string): void {
  if (!AUTHORITY_UUID_V4_PATTERN.test(value)) {
    throw new RegistrationMutationDeniedError(reason);
  }
}

function validateDisplayName(value: string): void {
  if (value.trim() !== value || value.length < 1 || value.length > 120) {
    throw new RegistrationMutationDeniedError("DISPLAY_NAME_INVALID");
  }
}

@Injectable()
export class RegistrationMutationService {
  constructor(private readonly repository: RegistrationMutationRepository) {}

  private async unwrap(
    outcome: ReturnType<
      RegistrationMutationRepository["createPendingApplication"]
    >,
  ): Promise<RegistrationMutationResult> {
    const result = await outcome;
    if (!result.ok)
      throw new RegistrationMutationDeniedError(result.reasonCode);
    return result.value;
  }

  createPendingApplication(
    context: RegistrationMutationContext,
    input: CreatePendingApplicationInput,
  ): Promise<RegistrationMutationResult> {
    validateContext(context);
    validateUuid(input.tenantId, "TENANT_ID_INVALID");
    validateUuid(input.siteId, "SITE_ID_INVALID");
    validateUuid(input.channelId, "CHANNEL_ID_INVALID");
    validateDisplayName(input.displayName);
    return this.unwrap(
      this.repository.createPendingApplication(context, input),
    );
  }

  updateApplicationDisplayName(
    context: RegistrationMutationContext,
    input: UpdateApplicationDisplayNameInput,
  ): Promise<RegistrationMutationResult> {
    validateContext(context);
    validateUuid(input.applicationId, "APPLICATION_ID_INVALID");
    validateUuid(input.expectedTenantId, "TENANT_ID_INVALID");
    validateUuid(input.expectedSiteId, "SITE_ID_INVALID");
    validateDisplayName(input.displayName);
    if (input.expectedRevision < 1n) {
      throw new RegistrationMutationDeniedError("REVISION_INVALID");
    }
    return this.unwrap(
      this.repository.updateApplicationDisplayName(context, input),
    );
  }

  revokeApplication(
    context: RegistrationMutationContext,
    input: RevokeApplicationInput,
  ): Promise<RegistrationMutationResult> {
    validateContext(context);
    validateUuid(input.applicationId, "APPLICATION_ID_INVALID");
    validateUuid(input.expectedTenantId, "TENANT_ID_INVALID");
    validateUuid(input.expectedSiteId, "SITE_ID_INVALID");
    if (input.expectedRevision < 1n) {
      throw new RegistrationMutationDeniedError("REVISION_INVALID");
    }
    return this.unwrap(this.repository.revokeApplication(context, input));
  }
}
