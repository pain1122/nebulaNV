import { PrismaClient, Prisma } from './generated';
const prisma = new PrismaClient();

async function upsertJson(ns: string, key: string, value: any, env = 'default') {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    update: { valueJson: value, valueString: null, valueNumber: null, valueBool: null },
    create: { namespace: ns, environment: env, key, valueJson: value },
  });
}

// NEW: seed a string setting
async function upsertString(ns: string, key: string, value: string, env = 'default') {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    update: {
      valueString: value,
      valueNumber: null,
      valueBool: null,
      valueJson: Prisma.DbNull, // clear JSON column explicitly
    },
    create: { namespace: ns, environment: env, key, valueString: value },
  });
}

async function main() {
  await upsertJson('i18n', 'supported_locales', ['en', 'de', 'fa']);

  // Default product category (slug-based). We'll resolve this to an ID at runtime.
  await upsertString('product', 'default_category_slug', 'undefined');
  // (We still intentionally do NOT set 'product.defaultProductCategoryId' here.)
}

main().finally(() => prisma.$disconnect());
