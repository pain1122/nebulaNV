/* eslint-disable no-console */
import { PrismaClient } from './generated';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 🔐 passwords for local/dev only (change in prod)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPass  = process.env.SEED_ADMIN_PASS  ?? 'Admin123!';
  const userEmail  = process.env.SEED_USER_EMAIL  ?? 'user@example.com';
  const userPass   = process.env.SEED_USER_PASS   ?? 'User123!';

  const adminHash = await bcrypt.hash(adminPass, 10);
  const userHash  = await bcrypt.hash(userPass, 10);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHash, role: 'admin' },
    create: {
      email: adminEmail,
      password: adminHash,
      role: 'admin',
      refreshToken: null,
    },
    select: { id: true, email: true, role: true },
  });

  // Upsert Normal User
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { password: userHash, role: 'user' },
    create: {
      email: userEmail,
      password: userHash,
      role: 'user',
      refreshToken: null,
    },
    select: { id: true, email: true, role: true },
  });

  console.log('[seed:user-service] admin  ->', admin);
  console.log('[seed:user-service] user   ->', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('[seed:user-service] ERROR:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
