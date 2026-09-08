/* eslint-disable no-console */
import { PrismaClient } from './generated';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('development_user_seed_refused_in_production');
  }

  // 🔐 passwords for local/dev only (change in prod)
  const rootAdminEmail =
    process.env.SEED_ROOT_ADMIN_EMAIL ?? 'root-admin@example.com';
  const rootAdminPass = process.env.SEED_ROOT_ADMIN_PASS ?? 'RootAdmin123!';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPass = process.env.SEED_ADMIN_PASS ?? 'Admin123!';
  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';
  const userPass = process.env.SEED_USER_PASS ?? 'User123!';

  const rootAdminHash = await bcrypt.hash(rootAdminPass, 10);
  const adminHash = await bcrypt.hash(adminPass, 10);
  const userHash = await bcrypt.hash(userPass, 10);

  // The local-only root administrator remains distinct from the site admin.
  const rootAdmin = await prisma.user.upsert({
    where: { email: rootAdminEmail },
    update: { password: rootAdminHash, role: 'root-admin' },
    create: {
      email: rootAdminEmail,
      password: rootAdminHash,
      role: 'root-admin',
    },
    select: { id: true, role: true },
  });

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminHash, role: 'admin' },
    create: {
      email: adminEmail,
      password: adminHash,
      role: 'admin',
    },
    select: { id: true, role: true },
  });

  // Upsert Normal User
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { password: userHash, role: 'user' },
    create: {
      email: userEmail,
      password: userHash,
      role: 'user',
    },
    select: { id: true, role: true },
  });

  console.log('[seed:user-service] root-admin ->', rootAdmin);
  console.log('[seed:user-service] admin      ->', admin);
  console.log('[seed:user-service] user       ->', user);
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
