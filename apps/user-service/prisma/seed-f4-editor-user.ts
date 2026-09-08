/* eslint-disable no-console */
import * as bcrypt from 'bcryptjs';

import { PrismaClient } from './generated';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('development_editor_user_seed_refused_in_production');
  }

  const email = process.env.SEED_EDITOR_EMAIL ?? 'editor@example.com';
  const password = process.env.SEED_EDITOR_PASS ?? 'Editor123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const editor = await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash, role: 'user' },
    create: { email, password: passwordHash, role: 'user' },
    select: { id: true, role: true },
  });

  console.log('[seed:f4-editor-user] editor ->', editor);
}

void main()
  .catch((error: unknown) => {
    console.error('[seed:f4-editor-user] ERROR:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
