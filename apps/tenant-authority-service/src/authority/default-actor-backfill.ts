import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { AuthorityAuditSigner } from "./authority-audit.signer";
import {
  appendAuthorityAuditEventV2,
  type AuthorityTransaction,
} from "./authority-audit.repository";
import { DEFAULT_DEVELOPMENT_AUTHORITY } from "./default-development-authority.manifest";

const BACKFILL_LOCK = "tenant-authority:default-actor-backfill:v1";
const DEFAULT_REALM_ID =
  DEFAULT_DEVELOPMENT_AUTHORITY.identityControlPlane.realms.defaultConsumer.id;

export type DefaultActorBackfillResult = "CREATED" | "ALREADY_CURRENT";

type ExpectedActorEvidence = Readonly<{
  aggregateKind: "MEMBERSHIP_DEFAULT_ACTOR" | "PLATFORM_GRANT_DEFAULT_ACTOR";
  aggregateId: string;
  tenantId: string | null;
  identityRealmId: string;
  subjectId: string;
  revision: bigint;
}>;

function canonical(value: unknown): string {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function sameRows(actual: readonly unknown[], expected: readonly unknown[]) {
  return (
    canonical(
      [...actual].sort((left, right) =>
        canonical(left).localeCompare(canonical(right)),
      ),
    ) ===
    canonical(
      [...expected].sort((left, right) =>
        canonical(left).localeCompare(canonical(right)),
      ),
    )
  );
}

function evidencePayload(row: ExpectedActorEvidence): Prisma.InputJsonValue {
  return {
    schemaVersion: 2,
    aggregateKind: row.aggregateKind,
    aggregateId: row.aggregateId,
    tenantId: row.tenantId,
    identityRealmId: row.identityRealmId,
    subjectId: row.subjectId,
    revision: row.revision.toString(),
  };
}

async function inspectDefaultActorState(tx: AuthorityTransaction) {
  const realm = await tx.identityRealm.findUnique({
    where: { id: DEFAULT_REALM_ID },
    select: {
      id: true,
      kind: true,
      owningCustomerTenantId: true,
      licensedRootTenantId: true,
      isRootDefault: true,
      lifecycle: true,
    },
  });
  const expectedTenantId = DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id;
  if (
    !realm ||
    realm.kind !== "LICENSED_ROOT_CONSUMER" ||
    realm.owningCustomerTenantId !== expectedTenantId ||
    realm.licensedRootTenantId !== expectedTenantId ||
    !realm.isRootDefault ||
    realm.lifecycle === "REVOKED"
  ) {
    throw new Error("default_actor_backfill_realm_invalid");
  }

  const [memberships, platformGrants] = await Promise.all([
    tx.membership.findMany({
      select: {
        id: true,
        tenantId: true,
        userId: true,
        identityRealmId: true,
        subjectId: true,
        revision: true,
      },
    }),
    tx.platformGrant.findMany({
      select: {
        id: true,
        userId: true,
        identityRealmId: true,
        subjectId: true,
        revision: true,
      },
    }),
  ]);

  if (
    memberships.some(
      (row) =>
        row.identityRealmId !== DEFAULT_REALM_ID ||
        row.subjectId !== row.userId,
    ) ||
    platformGrants.some(
      (row) =>
        row.identityRealmId !== DEFAULT_REALM_ID ||
        row.subjectId !== row.userId,
    )
  ) {
    throw new Error("default_actor_backfill_pair_conflict");
  }

  const expected: ExpectedActorEvidence[] = [
    ...memberships.map((row) => ({
      aggregateKind: "MEMBERSHIP_DEFAULT_ACTOR" as const,
      aggregateId: row.id,
      tenantId: row.tenantId,
      identityRealmId: row.identityRealmId as string,
      subjectId: row.subjectId as string,
      revision: row.revision,
    })),
    ...platformGrants.map((row) => ({
      aggregateKind: "PLATFORM_GRANT_DEFAULT_ACTOR" as const,
      aggregateId: row.id,
      tenantId: null,
      identityRealmId: row.identityRealmId as string,
      subjectId: row.subjectId as string,
      revision: row.revision,
    })),
  ].sort((left, right) =>
    `${left.aggregateKind}:${left.aggregateId}`.localeCompare(
      `${right.aggregateKind}:${right.aggregateId}`,
    ),
  );
  const digest = createHash("sha256")
    .update(canonical(expected), "utf8")
    .digest("hex");
  const requestId = `default-actor-backfill-v2:${digest}`;

  const existing = expected.length
    ? await tx.authorityInvalidationOutbox.findMany({
        where: {
          OR: expected.map((row) => ({
            aggregateKind: row.aggregateKind,
            aggregateId: row.aggregateId,
            revision: row.revision,
          })),
        },
        select: {
          aggregateKind: true,
          aggregateId: true,
          tenantId: true,
          identityRealmId: true,
          subjectId: true,
          revision: true,
          payloadVersion: true,
          payload: true,
          state: true,
        },
      })
    : [];
  const audit = await tx.authorityAuditEvent.findFirst({
    where: {
      operation: "DEFAULT_ACTOR.BACKFILL",
      requestId,
      eventVersion: 2,
      schemaVersion: 2,
      result: "SUCCEEDED",
      reasonCode: "CREATED_V2",
    },
    select: { id: true },
  });
  const comparableExpected = expected.map((row) => ({
    aggregateKind: row.aggregateKind,
    aggregateId: row.aggregateId,
    tenantId: row.tenantId,
    identityRealmId: row.identityRealmId,
    subjectId: row.subjectId,
    revision: row.revision,
    payloadVersion: 2,
    payload: evidencePayload(row),
    state: "PENDING",
  }));

  return {
    expected,
    digest,
    requestId,
    existing,
    audit,
    exact: sameRows(existing, comparableExpected) && audit !== null,
  };
}

export async function recordDefaultActorBackfillEvidence(
  prisma: PrismaClient,
  signer = new AuthorityAuditSigner(),
): Promise<DefaultActorBackfillResult> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${BACKFILL_LOCK}, 0))
          IS NULL AS "lockAcquired"
      `;
      const state = await inspectDefaultActorState(tx);
      if (state.exact) return "ALREADY_CURRENT";
      if (state.existing.length !== 0 || state.audit !== null) {
        throw new Error("default_actor_backfill_evidence_conflict");
      }

      if (state.expected.length) {
        await tx.authorityInvalidationOutbox.createMany({
          data: state.expected.map((row) => ({
            id: randomUUID(),
            aggregateKind: row.aggregateKind,
            aggregateId: row.aggregateId,
            tenantId: row.tenantId,
            identityRealmId: row.identityRealmId,
            subjectId: row.subjectId,
            revision: row.revision,
            payloadVersion: 2,
            payload: evidencePayload(row),
          })),
        });
      }
      await appendAuthorityAuditEventV2(tx, signer, {
        authorizationPath: "RECOVERY",
        operation: "DEFAULT_ACTOR.BACKFILL",
        tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        targetResourceType: "DEFAULT_ACTOR_BACKFILL",
        targetResourceId: DEFAULT_REALM_ID,
        requestId: state.requestId,
        result: "SUCCEEDED",
        reasonCode: "CREATED_V2",
        revision: "2",
        change: {
          identityRealmId: DEFAULT_REALM_ID,
          membershipCount: state.expected.filter(
            (row) => row.aggregateKind === "MEMBERSHIP_DEFAULT_ACTOR",
          ).length,
          platformGrantCount: state.expected.filter(
            (row) => row.aggregateKind === "PLATFORM_GRANT_DEFAULT_ACTOR",
          ).length,
          evidenceDigest: state.digest,
        },
      });
      return "CREATED";
    },
    { isolationLevel: "Serializable" },
  );
}
