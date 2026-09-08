import { randomUUID } from "node:crypto";
import type { Prisma } from "../../prisma/generated/client";
import {
  AuthorityAuditSigner,
  type CanonicalJson,
} from "./authority-audit.signer";

export type AuthorityTransaction = Prisma.TransactionClient;

export type AuthorityAuditDraft = Readonly<{
  authorizationPath: "SERVICE_OPERATION" | "RECOVERY";
  operation: string;
  applicationId?: string;
  channelId?: string;
  tenantId?: string;
  siteId?: string;
  targetResourceType: string;
  targetResourceId: string;
  requestId: string;
  result: "SUCCEEDED" | "DENIED" | "FAILED";
  reasonCode: string;
  revision: string;
  change: CanonicalJson;
}>;

export type AuthorityAuditV2Draft = AuthorityAuditDraft &
  Readonly<{
    actorUserId?: string;
    actorAuthorityRef?: string;
    actorIdentityRealmId?: string;
    actorSubjectId?: string;
  }>;

const SERVICE_NAME = "tenant-authority-service";

export async function appendAuthorityAuditEvent(
  tx: AuthorityTransaction,
  signer: AuthorityAuditSigner,
  draft: AuthorityAuditDraft,
): Promise<void> {
  const occurredAt = new Date();
  const partitionKey = occurredAt.toISOString().slice(0, 7);
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${partitionKey}, 0)) IS NULL
      AS "lockAcquired"
  `;
  const previous = await tx.authorityAuditEvent.findFirst({
    where: { partitionKey },
    orderBy: { partitionSequence: "desc" },
    select: { partitionSequence: true, eventHash: true },
  });
  const partitionSequence = (previous?.partitionSequence ?? 0n) + 1n;
  const id = randomUUID();
  const canonicalEvent: CanonicalJson = {
    id,
    partitionKey,
    partitionSequence: partitionSequence.toString(),
    occurredAt: occurredAt.toISOString(),
    eventVersion: 1,
    schemaVersion: 1,
    actorUserId: null,
    actorAuthorityRef: null,
    authorizationPath: draft.authorizationPath,
    operation: draft.operation,
    applicationId: draft.applicationId ?? null,
    channelId: draft.channelId ?? null,
    callerService: SERVICE_NAME,
    targetService: SERVICE_NAME,
    targetTenantId: draft.tenantId ?? null,
    targetSiteId: draft.siteId ?? null,
    targetResourceType: draft.targetResourceType,
    targetResourceId: draft.targetResourceId,
    requestId: draft.requestId,
    result: draft.result,
    reasonCode: draft.reasonCode,
    authorityRevision: draft.revision,
    change: draft.change,
    previousEventHash: previous?.eventHash ?? null,
    integrityKeyId: signer.keyId,
  };
  await tx.authorityAuditEvent.create({
    // The v1 seed also runs before additive v2 columns exist. Return only a
    // v1 field instead of Prisma's default selection of every current column.
    select: { id: true },
    data: {
      id,
      partitionKey,
      partitionSequence,
      occurredAt,
      authorizationPath: draft.authorizationPath,
      operation: draft.operation,
      applicationId: draft.applicationId,
      channelId: draft.channelId,
      callerService: SERVICE_NAME,
      targetService: SERVICE_NAME,
      targetTenantId: draft.tenantId,
      targetSiteId: draft.siteId,
      targetResourceType: draft.targetResourceType,
      targetResourceId: draft.targetResourceId,
      requestId: draft.requestId,
      result: draft.result,
      reasonCode: draft.reasonCode,
      authorityRevision: draft.revision,
      change: draft.change as Prisma.InputJsonValue,
      previousEventHash: previous?.eventHash,
      eventHash: signer.sign(canonicalEvent),
      integrityKeyId: signer.keyId,
    },
  });
}

export async function appendAuthorityAuditEventV2(
  tx: AuthorityTransaction,
  signer: AuthorityAuditSigner,
  draft: AuthorityAuditV2Draft,
): Promise<void> {
  const hasRealm = draft.actorIdentityRealmId !== undefined;
  const hasSubject = draft.actorSubjectId !== undefined;
  if (hasRealm !== hasSubject) {
    throw new Error("authority_audit_v2_actor_pair_partial");
  }

  const occurredAt = new Date();
  const partitionKey = occurredAt.toISOString().slice(0, 7);
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${partitionKey}, 0)) IS NULL
      AS "lockAcquired"
  `;
  const previous = await tx.authorityAuditEvent.findFirst({
    where: { partitionKey },
    orderBy: { partitionSequence: "desc" },
    select: { partitionSequence: true, eventHash: true },
  });
  const partitionSequence = (previous?.partitionSequence ?? 0n) + 1n;
  const id = randomUUID();
  const canonicalEvent: CanonicalJson = {
    id,
    partitionKey,
    partitionSequence: partitionSequence.toString(),
    occurredAt: occurredAt.toISOString(),
    eventVersion: 2,
    schemaVersion: 2,
    actorUserId: draft.actorUserId ?? null,
    actorAuthorityRef: draft.actorAuthorityRef ?? null,
    actorIdentityRealmId: draft.actorIdentityRealmId ?? null,
    actorSubjectId: draft.actorSubjectId ?? null,
    authorizationPath: draft.authorizationPath,
    operation: draft.operation,
    applicationId: draft.applicationId ?? null,
    channelId: draft.channelId ?? null,
    callerService: SERVICE_NAME,
    targetService: SERVICE_NAME,
    targetTenantId: draft.tenantId ?? null,
    targetSiteId: draft.siteId ?? null,
    targetResourceType: draft.targetResourceType,
    targetResourceId: draft.targetResourceId,
    requestId: draft.requestId,
    result: draft.result,
    reasonCode: draft.reasonCode,
    authorityRevision: draft.revision,
    change: draft.change,
    previousEventHash: previous?.eventHash ?? null,
    integrityKeyId: signer.keyId,
  };
  await tx.authorityAuditEvent.create({
    data: {
      id,
      partitionKey,
      partitionSequence,
      occurredAt,
      eventVersion: 2,
      schemaVersion: 2,
      actorUserId: draft.actorUserId,
      actorAuthorityRef: draft.actorAuthorityRef,
      actorIdentityRealmId: draft.actorIdentityRealmId,
      actorSubjectId: draft.actorSubjectId,
      authorizationPath: draft.authorizationPath,
      operation: draft.operation,
      applicationId: draft.applicationId,
      channelId: draft.channelId,
      callerService: SERVICE_NAME,
      targetService: SERVICE_NAME,
      targetTenantId: draft.tenantId,
      targetSiteId: draft.siteId,
      targetResourceType: draft.targetResourceType,
      targetResourceId: draft.targetResourceId,
      requestId: draft.requestId,
      result: draft.result,
      reasonCode: draft.reasonCode,
      authorityRevision: draft.revision,
      change: draft.change as Prisma.InputJsonValue,
      previousEventHash: previous?.eventHash,
      eventHash: signer.sign(canonicalEvent),
      integrityKeyId: signer.keyId,
    },
  });
}
