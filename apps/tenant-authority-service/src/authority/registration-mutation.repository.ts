import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import {
  appendAuthorityAuditEvent,
  type AuthorityTransaction,
} from "./authority-audit.repository";
import { PrismaService } from "../prisma.service";
import type {
  CreatePendingApplicationInput,
  RegistrationMutationContext,
  RegistrationMutationResult,
  RevokeApplicationInput,
  UpdateApplicationDisplayNameInput,
} from "./registration-mutation.types";

type Transaction = AuthorityTransaction;
type MutationOutcome =
  | Readonly<{ ok: true; value: RegistrationMutationResult }>
  | Readonly<{ ok: false; reasonCode: string }>;

type RegistrationAuditDraft = Readonly<{
  operation: string;
  applicationId: string;
  channelId?: string;
  tenantId?: string;
  siteId?: string;
  requestId: string;
  result: "SUCCEEDED" | "DENIED";
  reasonCode: string;
  revision: string;
  change: Parameters<typeof appendAuthorityAuditEvent>[2]["change"];
}>;

@Injectable()
export class RegistrationMutationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditSigner: AuthorityAuditSigner,
  ) {}

  private appendAudit(
    tx: Transaction,
    draft: RegistrationAuditDraft,
  ): Promise<void> {
    return appendAuthorityAuditEvent(tx, this.auditSigner, {
      ...draft,
      authorizationPath: "SERVICE_OPERATION",
      targetResourceType: "APPLICATION",
      targetResourceId: draft.applicationId,
    });
  }

  private async appendOutbox(
    tx: Transaction,
    value: RegistrationMutationResult & {
      tenantId: string;
      siteId: string;
      lifecycle: string;
    },
  ): Promise<void> {
    await tx.authorityInvalidationOutbox.create({
      data: {
        id: randomUUID(),
        aggregateKind: "APPLICATION",
        aggregateId: value.applicationId,
        tenantId: value.tenantId,
        siteId: value.siteId,
        referenceId: value.applicationId,
        revision: value.revision,
        payload: {
          applicationId: value.applicationId,
          tenantId: value.tenantId,
          siteId: value.siteId,
          lifecycle: value.lifecycle,
          revision: value.revision.toString(),
        },
      },
    });
  }

  createPendingApplication(
    context: RegistrationMutationContext,
    input: CreatePendingApplicationInput,
  ): Promise<MutationOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const applicationId = randomUUID();
      const clientId = randomUUID();
      const channel = await tx.channel.findUnique({
        where: { id: input.channelId },
        include: { site: { include: { tenant: true } } },
      });
      let reasonCode: string | undefined;
      if (!channel) reasonCode = "UNKNOWN_CHANNEL";
      else if (
        channel.tenantId !== input.tenantId ||
        channel.siteId !== input.siteId
      )
        reasonCode = "SCOPE_MISMATCH";
      else if (
        channel.site.lifecycle !== "ACTIVE" ||
        channel.site.tenant.lifecycle !== "ACTIVE"
      )
        reasonCode = "INACTIVE_SCOPE";
      else if (
        (channel.kind === "WEB" && input.profile === "mobile") ||
        (channel.kind !== "WEB" && input.profile !== "mobile")
      )
        reasonCode = "CHANNEL_PROFILE_MISMATCH";

      if (reasonCode) {
        await this.appendAudit(tx, {
          operation: "APPLICATION.CREATE_PENDING",
          applicationId,
          channelId: input.channelId,
          tenantId: input.tenantId,
          siteId: input.siteId,
          requestId: context.requestId,
          result: "DENIED",
          reasonCode,
          revision: "unresolved",
          change: {},
        });
        return { ok: false, reasonCode };
      }

      const profile =
        input.profile === "storefront-web"
          ? "STOREFRONT_WEB"
          : input.profile === "admin-web"
            ? "ADMIN_WEB"
            : "MOBILE";
      await tx.application.create({
        data: {
          id: applicationId,
          clientId,
          tenantId: input.tenantId,
          siteId: input.siteId,
          channelId: input.channelId,
          displayName: input.displayName,
          profile,
          lifecycle: "PENDING_VERIFICATION",
        },
      });
      await tx.applicationClientHandle.create({
        data: {
          id: randomUUID(),
          applicationId,
          handle: clientId,
          kind: "CANONICAL",
        },
      });
      const value = { applicationId, clientId, revision: 1n };
      await this.appendOutbox(tx, {
        ...value,
        tenantId: input.tenantId,
        siteId: input.siteId,
        lifecycle: "PENDING_VERIFICATION",
      });
      await this.appendAudit(tx, {
        operation: "APPLICATION.CREATE_PENDING",
        applicationId,
        channelId: input.channelId,
        tenantId: input.tenantId,
        siteId: input.siteId,
        requestId: context.requestId,
        result: "SUCCEEDED",
        reasonCode: "CREATED",
        revision: "1",
        change: { lifecycle: "PENDING_VERIFICATION", profile: input.profile },
      });
      return { ok: true, value };
    });
  }

  updateApplicationDisplayName(
    context: RegistrationMutationContext,
    input: UpdateApplicationDisplayNameInput,
  ): Promise<MutationOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: input.applicationId },
      });
      let reasonCode: string | undefined;
      if (!application) reasonCode = "UNKNOWN_APPLICATION";
      else if (
        application.tenantId !== input.expectedTenantId ||
        application.siteId !== input.expectedSiteId
      )
        reasonCode = "SCOPE_MISMATCH";
      else if (application.lifecycle === "DISABLED")
        reasonCode = "APPLICATION_DISABLED";
      else if (application.lifecycle === "REVOKED")
        reasonCode = "APPLICATION_REVOKED";
      else if (application.revision !== input.expectedRevision)
        reasonCode = "REVISION_CONFLICT";

      if (reasonCode || !application) {
        await this.appendAudit(tx, {
          operation: "APPLICATION.UPDATE_DISPLAY_NAME",
          applicationId: input.applicationId,
          channelId: application?.channelId,
          tenantId: input.expectedTenantId,
          siteId: input.expectedSiteId,
          requestId: context.requestId,
          result: "DENIED",
          reasonCode: reasonCode ?? "UNKNOWN_APPLICATION",
          revision: application?.revision.toString() ?? "unresolved",
          change: {},
        });
        return { ok: false, reasonCode: reasonCode ?? "UNKNOWN_APPLICATION" };
      }

      const update = await tx.application.updateMany({
        where: { id: application.id, revision: input.expectedRevision },
        data: { displayName: input.displayName, revision: { increment: 1 } },
      });
      if (update.count !== 1) {
        await this.appendAudit(tx, {
          operation: "APPLICATION.UPDATE_DISPLAY_NAME",
          applicationId: application.id,
          channelId: application.channelId,
          tenantId: application.tenantId,
          siteId: application.siteId,
          requestId: context.requestId,
          result: "DENIED",
          reasonCode: "REVISION_CONFLICT",
          revision: application.revision.toString(),
          change: {},
        });
        return { ok: false, reasonCode: "REVISION_CONFLICT" };
      }
      const updated = await tx.application.findUniqueOrThrow({
        where: { id: application.id },
      });
      const value = { applicationId: updated.id, revision: updated.revision };
      await this.appendOutbox(tx, {
        ...value,
        tenantId: updated.tenantId,
        siteId: updated.siteId,
        lifecycle: updated.lifecycle,
      });
      await this.appendAudit(tx, {
        operation: "APPLICATION.UPDATE_DISPLAY_NAME",
        applicationId: updated.id,
        channelId: updated.channelId,
        tenantId: updated.tenantId,
        siteId: updated.siteId,
        requestId: context.requestId,
        result: "SUCCEEDED",
        reasonCode: "UPDATED",
        revision: updated.revision.toString(),
        change: { displayNameChanged: true },
      });
      return { ok: true, value };
    });
  }

  revokeApplication(
    context: RegistrationMutationContext,
    input: RevokeApplicationInput,
  ): Promise<MutationOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({
        where: { id: input.applicationId },
      });
      let reasonCode: string | undefined;
      if (!application) reasonCode = "UNKNOWN_APPLICATION";
      else if (
        application.tenantId !== input.expectedTenantId ||
        application.siteId !== input.expectedSiteId
      )
        reasonCode = "SCOPE_MISMATCH";
      else if (application.lifecycle === "REVOKED")
        reasonCode = "APPLICATION_REVOKED";
      else if (application.revision !== input.expectedRevision)
        reasonCode = "REVISION_CONFLICT";

      if (reasonCode || !application) {
        await this.appendAudit(tx, {
          operation: "APPLICATION.REVOKE",
          applicationId: input.applicationId,
          channelId: application?.channelId,
          tenantId: input.expectedTenantId,
          siteId: input.expectedSiteId,
          requestId: context.requestId,
          result: "DENIED",
          reasonCode: reasonCode ?? "UNKNOWN_APPLICATION",
          revision: application?.revision.toString() ?? "unresolved",
          change: {},
        });
        return { ok: false, reasonCode: reasonCode ?? "UNKNOWN_APPLICATION" };
      }

      const revoked = await tx.application.updateMany({
        where: { id: application.id, revision: input.expectedRevision },
        data: { lifecycle: "REVOKED", revision: { increment: 1 } },
      });
      if (revoked.count !== 1) {
        await this.appendAudit(tx, {
          operation: "APPLICATION.REVOKE",
          applicationId: application.id,
          channelId: application.channelId,
          tenantId: application.tenantId,
          siteId: application.siteId,
          requestId: context.requestId,
          result: "DENIED",
          reasonCode: "REVISION_CONFLICT",
          revision: application.revision.toString(),
          change: {},
        });
        return { ok: false, reasonCode: "REVISION_CONFLICT" };
      }
      const revokedAt = new Date();
      const identityData = {
        verificationState: "REVOKED" as const,
        revokedAt,
      };
      await tx.webOrigin.updateMany({
        where: { applicationId: application.id, revokedAt: null },
        data: identityData,
      });
      await tx.androidIdentity.updateMany({
        where: { applicationId: application.id, revokedAt: null },
        data: identityData,
      });
      await tx.iosIdentity.updateMany({
        where: { applicationId: application.id, revokedAt: null },
        data: identityData,
      });
      await tx.applicationClientHandle.updateMany({
        where: { applicationId: application.id, state: "ACTIVE" },
        data: { state: "TOMBSTONED", tombstonedAt: revokedAt },
      });
      const updated = await tx.application.findUniqueOrThrow({
        where: { id: application.id },
      });
      const value = { applicationId: updated.id, revision: updated.revision };
      await this.appendOutbox(tx, {
        ...value,
        tenantId: updated.tenantId,
        siteId: updated.siteId,
        lifecycle: updated.lifecycle,
      });
      await this.appendAudit(tx, {
        operation: "APPLICATION.REVOKE",
        applicationId: updated.id,
        channelId: updated.channelId,
        tenantId: updated.tenantId,
        siteId: updated.siteId,
        requestId: context.requestId,
        result: "SUCCEEDED",
        reasonCode: "REVOKED",
        revision: updated.revision.toString(),
        change: { lifecycle: "REVOKED", identitiesRevoked: true },
      });
      return { ok: true, value };
    });
  }
}
