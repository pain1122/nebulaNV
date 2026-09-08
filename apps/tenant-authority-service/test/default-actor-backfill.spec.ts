import type { PrismaClient } from "../prisma/generated/client";
import {
  appendAuthorityAuditEventV2,
  type AuthorityTransaction,
} from "../src/authority/authority-audit.repository";
import type { AuthorityAuditSigner } from "../src/authority/authority-audit.signer";
import { recordDefaultActorBackfillEvidence } from "../src/authority/default-actor-backfill";
import { DEFAULT_DEVELOPMENT_AUTHORITY } from "../src/authority/default-development-authority.manifest";

const DEFAULT_REALM_ID =
  DEFAULT_DEVELOPMENT_AUTHORITY.identityControlPlane.realms.defaultConsumer.id;

function fixtureTransaction() {
  const membership = {
    id: "c1000000-0000-4000-8000-000000000001",
    tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
    userId: "d1000000-0000-4000-8000-000000000001",
    identityRealmId: DEFAULT_REALM_ID,
    subjectId: "d1000000-0000-4000-8000-000000000001",
    revision: 7n,
  };
  const platformGrant = {
    id: "c2000000-0000-4000-8000-000000000001",
    userId: "d2000000-0000-4000-8000-000000000001",
    identityRealmId: DEFAULT_REALM_ID,
    subjectId: "d2000000-0000-4000-8000-000000000001",
    revision: 3n,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    identityRealm: {
      findUnique: jest.fn().mockResolvedValue({
        id: DEFAULT_REALM_ID,
        kind: "LICENSED_ROOT_CONSUMER",
        owningCustomerTenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        licensedRootTenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        isRootDefault: true,
        lifecycle: "PROVISIONING",
      }),
    },
    membership: { findMany: jest.fn().mockResolvedValue([membership]) },
    platformGrant: {
      findMany: jest.fn().mockResolvedValue([platformGrant]),
    },
    authorityInvalidationOutbox: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    authorityAuditEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  return { tx, membership, platformGrant };
}

describe("default-realm actor backfill evidence", () => {
  const sign = jest.fn().mockReturnValue("a".repeat(64));
  const signer = {
    keyId: "default-actor-test-v2",
    sign,
  } as unknown as AuthorityAuditSigner;

  beforeEach(() => jest.clearAllMocks());

  it("writes bounded v2 evidence once and then returns ALREADY_CURRENT", async () => {
    const { tx } = fixtureTransaction();
    const transaction = jest.fn(
      async (work: (client: unknown) => Promise<unknown>) => work(tx),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaClient;

    await expect(
      recordDefaultActorBackfillEvidence(prisma, signer),
    ).resolves.toBe("CREATED");
    const outboxCalls = tx.authorityInvalidationOutbox.createMany.mock
      .calls as unknown as Array<[{ data: Array<Record<string, unknown>> }]>;
    const outboxCall = outboxCalls[0];
    const createdRows = outboxCall[0].data;
    expect(createdRows).toHaveLength(2);
    expect(
      createdRows.every(
        (row) =>
          row.payloadVersion === 2 &&
          row.identityRealmId === DEFAULT_REALM_ID &&
          row.subjectId !== undefined,
      ),
    ).toBe(true);
    expect(
      JSON.stringify(createdRows, (_, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    ).not.toMatch(/email|credential|token|session|membershipGeneration/i);
    const auditCalls = tx.authorityAuditEvent.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    const auditCall = auditCalls[0];
    expect(auditCall[0].data).toMatchObject({
      eventVersion: 2,
      schemaVersion: 2,
      operation: "DEFAULT_ACTOR.BACKFILL",
    });

    tx.authorityInvalidationOutbox.findMany.mockResolvedValueOnce(
      createdRows.map((row) => ({
        aggregateKind: row.aggregateKind,
        aggregateId: row.aggregateId,
        tenantId: row.tenantId,
        identityRealmId: row.identityRealmId,
        subjectId: row.subjectId,
        revision: row.revision,
        payloadVersion: row.payloadVersion,
        payload: row.payload,
        state: "PENDING",
      })),
    );
    tx.authorityAuditEvent.findFirst.mockResolvedValueOnce({ id: "audit-v2" });

    await expect(
      recordDefaultActorBackfillEvidence(prisma, signer),
    ).resolves.toBe("ALREADY_CURRENT");
    expect(tx.authorityInvalidationOutbox.createMany).toHaveBeenCalledTimes(1);
    expect(tx.authorityAuditEvent.create).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it("fails closed before writing when the persisted pair is contradictory", async () => {
    const { tx } = fixtureTransaction();
    tx.membership.findMany.mockResolvedValueOnce([
      {
        id: "c1000000-0000-4000-8000-000000000001",
        tenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        userId: "d1000000-0000-4000-8000-000000000001",
        identityRealmId: DEFAULT_REALM_ID,
        subjectId: "d1000000-0000-4000-8000-000000000099",
        revision: 7n,
      },
    ]);
    const prisma = {
      $transaction: jest.fn(
        async (work: (client: unknown) => Promise<unknown>) => work(tx),
      ),
    } as unknown as PrismaClient;

    await expect(
      recordDefaultActorBackfillEvidence(prisma, signer),
    ).rejects.toThrow("default_actor_backfill_pair_conflict");
    expect(tx.authorityInvalidationOutbox.createMany).not.toHaveBeenCalled();
    expect(tx.authorityAuditEvent.create).not.toHaveBeenCalled();
  });

  it.each(["missing", "wrong-owner", "revoked"] as const)(
    "rejects a %s default realm before evidence writes",
    async (kind) => {
      const { tx } = fixtureTransaction();
      const realm = {
        id: DEFAULT_REALM_ID,
        kind: "LICENSED_ROOT_CONSUMER",
        owningCustomerTenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        licensedRootTenantId: DEFAULT_DEVELOPMENT_AUTHORITY.tenant.id,
        isRootDefault: true,
        lifecycle: "PROVISIONING",
      };
      tx.identityRealm.findUnique.mockResolvedValueOnce(
        kind === "missing"
          ? null
          : {
              ...realm,
              ...(kind === "wrong-owner"
                ? {
                    owningCustomerTenantId:
                      "a1000000-0000-4000-8000-000000000099",
                  }
                : { lifecycle: "REVOKED" }),
            },
      );
      const prisma = {
        $transaction: jest.fn(
          async (work: (client: unknown) => Promise<unknown>) => work(tx),
        ),
      } as unknown as PrismaClient;
      await expect(
        recordDefaultActorBackfillEvidence(prisma, signer),
      ).rejects.toThrow("default_actor_backfill_realm_invalid");
      expect(tx.authorityInvalidationOutbox.createMany).not.toHaveBeenCalled();
      expect(tx.authorityAuditEvent.create).not.toHaveBeenCalled();
    },
  );

  it.each(["outbox-only", "audit-only"] as const)(
    "rejects %s partial evidence without adding or repairing history",
    async (kind) => {
      const { tx } = fixtureTransaction();
      if (kind === "outbox-only") {
        tx.authorityInvalidationOutbox.findMany.mockResolvedValueOnce([
          { aggregateKind: "MEMBERSHIP_DEFAULT_ACTOR" },
        ]);
      } else {
        tx.authorityAuditEvent.findFirst.mockResolvedValueOnce({
          id: "partial-audit",
        });
      }
      const prisma = {
        $transaction: jest.fn(
          async (work: (client: unknown) => Promise<unknown>) => work(tx),
        ),
      } as unknown as PrismaClient;
      await expect(
        recordDefaultActorBackfillEvidence(prisma, signer),
      ).rejects.toThrow("default_actor_backfill_evidence_conflict");
      expect(tx.authorityInvalidationOutbox.createMany).not.toHaveBeenCalled();
      expect(tx.authorityAuditEvent.create).not.toHaveBeenCalled();
    },
  );

  it("includes the realm actor and previous hash in the signed v2 event", async () => {
    const { tx } = fixtureTransaction();
    tx.authorityAuditEvent.findFirst.mockResolvedValueOnce({
      partitionSequence: 7n,
      eventHash: "b".repeat(64),
    });
    await appendAuthorityAuditEventV2(
      tx as unknown as AuthorityTransaction,
      signer,
      {
        authorizationPath: "RECOVERY",
        operation: "TEST",
        targetResourceType: "TEST",
        targetResourceId: "test",
        requestId: "test",
        result: "SUCCEEDED",
        reasonCode: "TEST",
        revision: "1",
        change: {},
        actorIdentityRealmId: DEFAULT_REALM_ID,
        actorSubjectId: "d1000000-0000-4000-8000-000000000001",
      },
    );
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        eventVersion: 2,
        schemaVersion: 2,
        partitionSequence: "8",
        previousEventHash: "b".repeat(64),
        actorIdentityRealmId: DEFAULT_REALM_ID,
        actorSubjectId: "d1000000-0000-4000-8000-000000000001",
      }),
    );
    const calls = tx.authorityAuditEvent.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({
      eventHash: "a".repeat(64),
      partitionSequence: 8n,
    });
  });

  it("rejects a half-populated v2 audit actor before touching the database", async () => {
    const tx = {
      $queryRaw: jest.fn(),
      authorityAuditEvent: { findFirst: jest.fn(), create: jest.fn() },
    } as unknown as AuthorityTransaction;

    await expect(
      appendAuthorityAuditEventV2(tx, signer, {
        authorizationPath: "RECOVERY",
        operation: "TEST",
        targetResourceType: "TEST",
        targetResourceId: "test",
        requestId: "test",
        result: "FAILED",
        reasonCode: "TEST",
        revision: "1",
        change: {},
        actorIdentityRealmId: DEFAULT_REALM_ID,
      }),
    ).rejects.toThrow("authority_audit_v2_actor_pair_partial");
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
