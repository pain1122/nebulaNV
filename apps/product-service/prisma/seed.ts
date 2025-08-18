// apps/product-service/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { slug: 'undefined' },            // slug must be unique
    update: {
      title: 'Undefined',
      isHidden: true,                        // ensure it stays hidden if it already exists
    },
    create: {
      slug: 'undefined',
      title: 'Undefined',
      isHidden: true,                        // hidden on first create
    },
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
