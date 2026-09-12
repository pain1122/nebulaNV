import * as bcrypt from "bcryptjs";
import type { PrismaClient } from "../prisma/generated/client";
import { REALM_AUTH_DEPLOYMENTS } from "../src/config/realm-deployments";
import {
  rollbackStagedOperator,
  stageOperatorRecoveryCredential,
  validateBcryptRounds,
  validateRecoveryPassword,
} from "../src/migration/r4-operator-staging";

const operator = REALM_AUTH_DEPLOYMENTS.OPERATOR;
const boundary = {
  identityRealmId: operator.identityRealmId,
  kind: "PLATFORM_OPERATOR",
  principalClass: "PLATFORM_OPERATOR",
  lifecycle: "PROVISIONING",
  admissionMode: "SHADOW",
};

function mockPrisma(input: {
  subjects?: unknown[];
  subject?: unknown;
  subjectCount?: number;
  credential?: unknown;
  sessions?: number;
  transactionConflicts?: number;
  validBoundary?: boolean;
}) {
  let transactionConflicts = input.transactionConflicts ?? 0;
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    realmBoundary: {
      findUnique: jest
        .fn()
        .mockResolvedValue(input.validBoundary === false ? null : boundary),
    },
    realmSubject: {
      findMany: jest.fn().mockResolvedValue(input.subjects ?? []),
      findUnique: jest.fn().mockResolvedValue(input.subject ?? null),
      count: jest.fn().mockResolvedValue(input.subjectCount ?? 0),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    localCredential: {
      findUnique: jest.fn().mockResolvedValue(input.credential ?? null),
      create: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
    loginIdentifier: { count: jest.fn().mockResolvedValue(0) },
    externalIdentityLink: { count: jest.fn().mockResolvedValue(0) },
    authSession: { count: jest.fn().mockResolvedValue(input.sessions ?? 0) },
    legacySessionBridge: { count: jest.fn().mockResolvedValue(0) },
    rootSsoExchangeGrant: { count: jest.fn().mockResolvedValue(0) },
    authAuditEvent: { count: jest.fn().mockResolvedValue(0) },
    authOutboxEvent: { count: jest.fn().mockResolvedValue(0) },
  };
  const transaction = jest.fn(
    (work: (client: typeof tx) => Promise<unknown>) => {
      if (transactionConflicts > 0) {
        transactionConflicts -= 1;
        return Promise.reject(
          Object.assign(new Error("transaction conflict"), { code: "P2034" }),
        );
      }
      return work(tx);
    },
  );
  return {
    tx,
    transaction,
    prisma: { $transaction: transaction } as unknown as PrismaClient,
  };
}

describe("R4 operator staging", () => {
  it("creates only the fixed provisioning subject and local credential", async () => {
    const { prisma, tx } = mockPrisma({});
    await expect(
      stageOperatorRecoveryCredential(prisma, {
        password: "OperatorRecovery123!",
        bcryptRounds: 8,
        now: new Date("2026-09-12T10:00:00.000Z"),
      }),
    ).resolves.toBe("CREATED");
    expect(tx.realmSubject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: operator.stagedOperatorSubjectId,
        identityRealmId: operator.identityRealmId,
        principalClass: "PLATFORM_OPERATOR",
        lifecycle: "PROVISIONING",
        credentialGeneration: 1n,
        sessionGeneration: 1n,
      }) as unknown,
    });
    expect(tx.localCredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectId: operator.stagedOperatorSubjectId,
        algorithm: "BCRYPT",
        parameters: { cost: 8 },
        revision: 1n,
      }) as unknown,
    });
  });

  it("accepts only an exact matching rerun", async () => {
    const password = "OperatorRecovery123!";
    const passwordHash = await bcrypt.hash(password, 8);
    const subject = {
      id: operator.stagedOperatorSubjectId,
      identityRealmId: operator.identityRealmId,
      principalClass: "PLATFORM_OPERATOR",
      lifecycle: "PROVISIONING",
      credentialGeneration: 1n,
      sessionGeneration: 1n,
    };
    const credential = {
      passwordHash,
      algorithm: "BCRYPT",
      parameters: { cost: 8 },
      revision: 1n,
    };
    const { prisma } = mockPrisma({ subjects: [subject], credential });
    await expect(
      stageOperatorRecoveryCredential(prisma, {
        password,
        bcryptRounds: 8,
      }),
    ).resolves.toBe("ALREADY_CURRENT");
    await expect(
      stageOperatorRecoveryCredential(prisma, {
        password: "DifferentRecovery123!",
        bcryptRounds: 8,
      }),
    ).rejects.toThrow("r4_operator_staging_credential_mismatch");
  });

  it("refuses rollback after any session evidence", async () => {
    const subject = {
      identityRealmId: operator.identityRealmId,
      principalClass: "PLATFORM_OPERATOR",
      lifecycle: "PROVISIONING",
      credentialGeneration: 1n,
      sessionGeneration: 1n,
    };
    const { prisma, tx } = mockPrisma({
      subject,
      subjectCount: 1,
      credential: { revision: 1n },
      sessions: 1,
    });
    await expect(rollbackStagedOperator(prisma)).rejects.toThrow(
      "r4_operator_staging_rollback_no_use_proof_failed",
    );
    expect(tx.realmSubject.delete).not.toHaveBeenCalled();
  });

  it("does not treat an unrelated operator subject as an absent staged state", async () => {
    const { prisma, tx } = mockPrisma({ subjectCount: 1 });
    await expect(rollbackStagedOperator(prisma)).rejects.toThrow(
      "r4_operator_staging_rollback_no_use_proof_failed",
    );
    expect(tx.realmSubject.delete).not.toHaveBeenCalled();
  });

  it("retries only a bounded serializable transaction conflict", async () => {
    const { prisma, transaction } = mockPrisma({ transactionConflicts: 1 });
    await expect(
      stageOperatorRecoveryCredential(prisma, {
        password: "OperatorRecovery123!",
        bcryptRounds: 8,
      }),
    ).resolves.toBe("CREATED");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the operator boundary is unavailable", async () => {
    const { prisma, tx } = mockPrisma({ validBoundary: false });
    await expect(
      stageOperatorRecoveryCredential(prisma, {
        password: "OperatorRecovery123!",
        bcryptRounds: 8,
      }),
    ).rejects.toThrow("r4_operator_staging_boundary_invalid");
    expect(tx.realmSubject.create).not.toHaveBeenCalled();
    expect(tx.localCredential.create).not.toHaveBeenCalled();
  });

  it("validates recovery input without weakening the existing bcrypt range", () => {
    expect(() => validateRecoveryPassword("short")).toThrow(
      "r4_operator_staging_password_invalid",
    );
    expect(() => validateRecoveryPassword("ValidRecovery123!")).not.toThrow();
    expect(() => validateBcryptRounds(7)).toThrow(
      "r4_operator_staging_bcrypt_rounds_invalid",
    );
    expect(() => validateBcryptRounds(10)).not.toThrow();
  });
});
