import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Upsert system “Undefined” category
  const undef = await prisma.productCategory.upsert({
    where: { slug: 'undefined' },
    update: { title: 'Undefined', isHidden: true, isSystem: true },
    create: { slug: 'undefined', title: 'Undefined', isHidden: true, isSystem: true },
    select: { id: true },
  });

  // 2) Set product.default_category_id by ID if not set
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: 'product', environment: 'default', key: 'default_category_id' } },
    update: {
      valueString: undef.id, // store the UUID as string (simple + fast)
      valueJson: null, valueNumber: null, valueBool: null,
    },
    create: {
      namespace: 'product',
      environment: 'default',
      key: 'default_category_id',
      valueString: undef.id,
    },
  });

  // Optional: theme + i18n samples
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: 'i18n', environment: 'default', key: 'default_locale' } },
    update: { valueString: 'en' },
    create: { namespace: 'i18n', environment: 'default', key: 'default_locale', valueString: 'en' },
  });

  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: 'theme', environment: 'default', key: 'active_theme' } },
    update: { valueString: 'nebula' },
    create: { namespace: 'theme', environment: 'default', key: 'active_theme', valueString: 'nebula' },
  });
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });