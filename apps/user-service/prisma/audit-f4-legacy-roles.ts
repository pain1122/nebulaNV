/* eslint-disable no-console */
import { createHash } from 'node:crypto';

import { PrismaClient } from './generated';
import {
  classifyF4LegacyRole,
  type F4LegacyRole,
  type F4LegacyRoleMigrationDecision,
} from '../src/migration/f4-legacy-role-migration';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type LegacyUserRole = Readonly<{ id: string; role: string }>;

export type F4LegacyRoleAudit = Readonly<{
  compatibilityMode: 'LEGACY_PRIMARY';
  backfillStatus: 'READY' | 'BLOCKED';
  totalUsers: number;
  roleCounts: Readonly<Record<F4LegacyRole | 'INVALID', number>>;
  candidates: ReadonlyArray<
    Readonly<{
      userId: string;
      decision: F4LegacyRoleMigrationDecision;
    }>
  >;
  invalidRoles: ReadonlyArray<
    Readonly<{
      userId: string;
      valueSha256: string;
    }>
  >;
  invalidUserIds: ReadonlyArray<string>;
  blockers: ReadonlyArray<
    | 'INVALID_LEGACY_ROLE'
    | 'INVALID_USER_ID'
    | 'EXACTLY_ONE_ROOT_ADMIN_REQUIRED'
  >;
}>;

export function buildF4LegacyRoleAudit(
  users: ReadonlyArray<LegacyUserRole>,
): F4LegacyRoleAudit {
  const roleCounts: Record<F4LegacyRole | 'INVALID', number> = {
    user: 0,
    admin: 0,
    'root-admin': 0,
    INVALID: 0,
  };
  const candidates: Array<{
    userId: string;
    decision: F4LegacyRoleMigrationDecision;
  }> = [];
  const invalidRoles: Array<{ userId: string; valueSha256: string }> = [];
  const invalidUserIds: string[] = [];

  for (const user of users) {
    if (!UUID_V4.test(user.id)) invalidUserIds.push(user.id);

    const decision = classifyF4LegacyRole(user.role);
    if (decision === null) {
      roleCounts.INVALID += 1;
      invalidRoles.push({
        userId: user.id,
        valueSha256: createHash('sha256').update(user.role).digest('hex'),
      });
      continue;
    }

    roleCounts[decision.sourceRole] += 1;
    candidates.push({ userId: user.id, decision });
  }

  const blockers: F4LegacyRoleAudit['blockers'][number][] = [];
  if (invalidRoles.length > 0) blockers.push('INVALID_LEGACY_ROLE');
  if (invalidUserIds.length > 0) blockers.push('INVALID_USER_ID');
  if (roleCounts['root-admin'] !== 1) {
    blockers.push('EXACTLY_ONE_ROOT_ADMIN_REQUIRED');
  }

  return {
    compatibilityMode: 'LEGACY_PRIMARY',
    backfillStatus: blockers.length === 0 ? 'READY' : 'BLOCKED',
    totalUsers: users.length,
    roleCounts,
    candidates: candidates.sort((left, right) =>
      left.userId.localeCompare(right.userId),
    ),
    invalidRoles: invalidRoles.sort((left, right) =>
      left.userId.localeCompare(right.userId),
    ),
    invalidUserIds: invalidUserIds.sort(),
    blockers,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, role: true },
    });
    const audit = buildF4LegacyRoleAudit(users);

    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(audit, null, 2));
      return;
    }

    console.log(
      JSON.stringify(
        {
          compatibilityMode: audit.compatibilityMode,
          backfillStatus: audit.backfillStatus,
          totalUsers: audit.totalUsers,
          roleCounts: audit.roleCounts,
          invalidRoleCount: audit.invalidRoles.length,
          invalidUserIdCount: audit.invalidUserIds.length,
          blockers: audit.blockers,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error('[audit:f4-legacy-roles] ERROR', error);
    process.exitCode = 1;
  });
}
