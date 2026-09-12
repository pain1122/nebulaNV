import * as bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "../../prisma/generated/client";
import { REALM_AUTH_DEPLOYMENTS } from "../config/realm-deployments";

const OPERATOR = REALM_AUTH_DEPLOYMENTS.OPERATOR;
const STAGE_LOCK = "realm-auth:r4-operator-staging:v1";
const BCRYPT = /^\$2[aby]\$([0-9]{2})\$[./A-Za-z0-9]{53}$/;
const SERIALIZABLE_ATTEMPTS = 3;

export type OperatorStageResult = "CREATED" | "ALREADY_CURRENT";
export type OperatorRollbackResult = "ROLLED_BACK" | "ALREADY_ABSENT";

function fail(reason: string): never {
  throw new Error(`r4_operator_staging_${reason}`);
}

function retryableTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function serializableStagingTransaction<T>(
  prisma: PrismaClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        !retryableTransactionConflict(error) ||
        attempt === SERIALIZABLE_ATTEMPTS
      ) {
        throw error;
      }
    }
  }
  fail("transaction_retry_exhausted");
}

export function validateRecoveryPassword(password: string): void {
  if (
    password.length < 16 ||
    password.length > 128 ||
    /[\r\n\0]/.test(password)
  ) {
    fail("password_invalid");
  }
}

export function validateBcryptRounds(rounds: number): void {
  if (!Number.isInteger(rounds) || rounds < 8 || rounds > 15) {
    fail("bcrypt_rounds_invalid");
  }
}

async function requireOperatorShadow(
  tx: Prisma.TransactionClient,
): Promise<void> {
  const boundary = await tx.realmBoundary.findUnique({
    where: { singleton: true },
    select: {
      identityRealmId: true,
      kind: true,
      principalClass: true,
      lifecycle: true,
      admissionMode: true,
    },
  });
  if (
    boundary?.identityRealmId !== OPERATOR.identityRealmId ||
    boundary.kind !== "PLATFORM_OPERATOR" ||
    boundary.principalClass !== "PLATFORM_OPERATOR" ||
    boundary.lifecycle !== "PROVISIONING" ||
    boundary.admissionMode !== "SHADOW"
  ) {
    fail("boundary_invalid");
  }
}

async function relatedCounts(tx: Prisma.TransactionClient) {
  const subjectId = OPERATOR.stagedOperatorSubjectId;
  const [
    identifiers,
    externalIdentities,
    sessions,
    bridges,
    rootSsoGrants,
    audits,
    outboxEvents,
  ] = await Promise.all([
    tx.loginIdentifier.count({ where: { subjectId } }),
    tx.externalIdentityLink.count({ where: { subjectId } }),
    tx.authSession.count({ where: { subjectId } }),
    tx.legacySessionBridge.count({ where: { subjectId } }),
    tx.rootSsoExchangeGrant.count(),
    tx.authAuditEvent.count(),
    tx.authOutboxEvent.count(),
  ]);
  return {
    identifiers,
    externalIdentities,
    sessions,
    bridges,
    rootSsoGrants,
    audits,
    outboxEvents,
  };
}

function hasAnyRelatedRow(counts: Awaited<ReturnType<typeof relatedCounts>>) {
  return Object.values(counts).some((count) => count !== 0);
}

function credentialCost(
  credential: {
    passwordHash: string;
    algorithm: string;
    parameters: Prisma.JsonValue;
    revision: bigint;
  } | null,
): number | null {
  const hashCost = credential ? BCRYPT.exec(credential.passwordHash) : null;
  const parameters =
    credential?.parameters &&
    typeof credential.parameters === "object" &&
    !Array.isArray(credential.parameters)
      ? credential.parameters
      : null;
  if (
    credential?.algorithm !== "BCRYPT" ||
    credential.revision !== 1n ||
    !hashCost ||
    !parameters ||
    Object.keys(parameters).join(",") !== "cost" ||
    parameters.cost !== Number(hashCost[1])
  ) {
    return null;
  }
  return Number(hashCost[1]);
}

export async function stageOperatorRecoveryCredential(
  prisma: PrismaClient,
  input: { password: string; bcryptRounds: number; now?: Date },
): Promise<OperatorStageResult> {
  validateRecoveryPassword(input.password);
  validateBcryptRounds(input.bcryptRounds);
  const now = input.now ?? new Date();
  return serializableStagingTransaction(prisma, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${STAGE_LOCK}, 0))`;
    await requireOperatorShadow(tx);
    const [subjects, credential, counts] = await Promise.all([
      tx.realmSubject.findMany({
        select: {
          id: true,
          identityRealmId: true,
          principalClass: true,
          lifecycle: true,
          credentialGeneration: true,
          sessionGeneration: true,
        },
      }),
      tx.localCredential.findUnique({
        where: {
          identityRealmId_subjectId: {
            identityRealmId: OPERATOR.identityRealmId,
            subjectId: OPERATOR.stagedOperatorSubjectId,
          },
        },
        select: {
          passwordHash: true,
          algorithm: true,
          parameters: true,
          revision: true,
        },
      }),
      relatedCounts(tx),
    ]);
    if (subjects.length === 0 && credential === null) {
      if (hasAnyRelatedRow(counts)) fail("orphan_related_row");
      const passwordHash = await bcrypt.hash(
        input.password,
        input.bcryptRounds,
      );
      await tx.realmSubject.create({
        data: {
          id: OPERATOR.stagedOperatorSubjectId,
          identityRealmId: OPERATOR.identityRealmId,
          principalClass: "PLATFORM_OPERATOR",
          lifecycle: "PROVISIONING",
          credentialGeneration: 1n,
          sessionGeneration: 1n,
        },
      });
      await tx.localCredential.create({
        data: {
          identityRealmId: OPERATOR.identityRealmId,
          subjectId: OPERATOR.stagedOperatorSubjectId,
          passwordHash,
          algorithm: "BCRYPT",
          parameters: { cost: input.bcryptRounds },
          revision: 1n,
          changedAt: now,
        },
      });
      return "CREATED";
    }
    const subject = subjects[0];
    if (
      subjects.length !== 1 ||
      subject?.id !== OPERATOR.stagedOperatorSubjectId ||
      subject.identityRealmId !== OPERATOR.identityRealmId ||
      subject.principalClass !== "PLATFORM_OPERATOR" ||
      subject.lifecycle !== "PROVISIONING" ||
      subject.credentialGeneration !== 1n ||
      subject.sessionGeneration !== 1n ||
      credential === null ||
      credentialCost(credential) !== input.bcryptRounds ||
      hasAnyRelatedRow(counts)
    ) {
      fail("existing_state_conflict");
    }
    if (!(await bcrypt.compare(input.password, credential.passwordHash))) {
      fail("credential_mismatch");
    }
    return "ALREADY_CURRENT";
  });
}

export async function verifyOperatorRecoveryCredential(
  prisma: PrismaClient,
  password: string,
): Promise<void> {
  validateRecoveryPassword(password);
  const result = await serializableStagingTransaction(prisma, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${STAGE_LOCK}, 0))`;
    await requireOperatorShadow(tx);
    const [subject, subjectCount, credential, counts] = await Promise.all([
      tx.realmSubject.findUnique({
        where: { id: OPERATOR.stagedOperatorSubjectId },
        select: {
          identityRealmId: true,
          principalClass: true,
          lifecycle: true,
          credentialGeneration: true,
          sessionGeneration: true,
        },
      }),
      tx.realmSubject.count(),
      tx.localCredential.findUnique({
        where: {
          identityRealmId_subjectId: {
            identityRealmId: OPERATOR.identityRealmId,
            subjectId: OPERATOR.stagedOperatorSubjectId,
          },
        },
        select: {
          passwordHash: true,
          algorithm: true,
          parameters: true,
          revision: true,
        },
      }),
      relatedCounts(tx),
    ]);
    if (
      subjectCount !== 1 ||
      subject?.identityRealmId !== OPERATOR.identityRealmId ||
      subject.principalClass !== "PLATFORM_OPERATOR" ||
      subject.lifecycle !== "PROVISIONING" ||
      subject.credentialGeneration !== 1n ||
      subject.sessionGeneration !== 1n ||
      credential === null ||
      credentialCost(credential) === null ||
      hasAnyRelatedRow(counts)
    ) {
      fail("recovery_state_invalid");
    }
    return bcrypt.compare(password, credential.passwordHash);
  });
  if (!result) fail("credential_mismatch");
}

export async function rollbackStagedOperator(
  prisma: PrismaClient,
): Promise<OperatorRollbackResult> {
  return serializableStagingTransaction(prisma, async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${STAGE_LOCK}, 0))`;
    await requireOperatorShadow(tx);
    const [subject, subjectCount, credential, counts] = await Promise.all([
      tx.realmSubject.findUnique({
        where: { id: OPERATOR.stagedOperatorSubjectId },
        select: {
          identityRealmId: true,
          principalClass: true,
          lifecycle: true,
          credentialGeneration: true,
          sessionGeneration: true,
        },
      }),
      tx.realmSubject.count(),
      tx.localCredential.findUnique({
        where: {
          identityRealmId_subjectId: {
            identityRealmId: OPERATOR.identityRealmId,
            subjectId: OPERATOR.stagedOperatorSubjectId,
          },
        },
        select: {
          passwordHash: true,
          algorithm: true,
          parameters: true,
          revision: true,
        },
      }),
      relatedCounts(tx),
    ]);
    if (
      subjectCount === 0 &&
      !subject &&
      !credential &&
      !hasAnyRelatedRow(counts)
    ) {
      return "ALREADY_ABSENT";
    }
    if (
      subjectCount !== 1 ||
      subject?.identityRealmId !== OPERATOR.identityRealmId ||
      subject.principalClass !== "PLATFORM_OPERATOR" ||
      subject.lifecycle !== "PROVISIONING" ||
      subject.credentialGeneration !== 1n ||
      subject.sessionGeneration !== 1n ||
      credentialCost(credential) === null ||
      hasAnyRelatedRow(counts)
    ) {
      fail("rollback_no_use_proof_failed");
    }
    await tx.localCredential.delete({
      where: {
        identityRealmId_subjectId: {
          identityRealmId: OPERATOR.identityRealmId,
          subjectId: OPERATOR.stagedOperatorSubjectId,
        },
      },
    });
    await tx.realmSubject.delete({
      where: { id: OPERATOR.stagedOperatorSubjectId },
    });
    return "ROLLED_BACK";
  });
}
