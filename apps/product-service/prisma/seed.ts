import { PrismaClient  } from './generated/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Upsert system “Undefined” category
  const undef = await prisma.productCategory.upsert({
    where: { slug: 'undefined' },
    update: { title: 'Undefined', isHidden: true, isSystem: true },
    create: { slug: 'undefined', title: 'Undefined', isHidden: true, isSystem: true },
    select: { id: true },
  });
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });