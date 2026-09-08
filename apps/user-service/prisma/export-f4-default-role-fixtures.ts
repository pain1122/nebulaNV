/* eslint-disable no-console */
import { PrismaClient } from './generated';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('development_role_fixture_export_refused_in_production');
  }
  const emails = {
    rootAdmin: process.env.SEED_ROOT_ADMIN_EMAIL ?? 'root-admin@example.com',
    siteAdmin: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
    editor: process.env.SEED_EDITOR_EMAIL ?? 'editor@example.com',
    user: process.env.SEED_USER_EMAIL ?? 'user@example.com',
  } as const;
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true, email: true, role: true },
    });
    const byEmail = new Map(rows.map((row) => [row.email, row]));
    const fixture = {
      version: 1,
      rootAdminUserId: byEmail.get(emails.rootAdmin)?.id,
      siteAdminUserId: byEmail.get(emails.siteAdmin)?.id,
      editorUserId: byEmail.get(emails.editor)?.id,
      userId: byEmail.get(emails.user)?.id,
    };
    const expectedRoles = {
      rootAdmin: 'root-admin',
      siteAdmin: 'admin',
      editor: 'user',
      user: 'user',
    } as const;
    for (const key of Object.keys(emails) as Array<keyof typeof emails>) {
      const row = byEmail.get(emails[key]);
      if (row === undefined || row.role !== expectedRoles[key]) {
        throw new Error(`development_role_fixture_${key}_missing_or_invalid`);
      }
    }
    if (new Set(Object.values(fixture).slice(1)).size !== 4) {
      throw new Error('development_role_fixture_users_must_be_distinct');
    }
    console.log(JSON.stringify(fixture, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('[export:f4-default-role-fixtures] ERROR', error);
  process.exitCode = 1;
});
