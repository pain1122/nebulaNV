import { PrismaClient, Prisma } from './generated/client';
const prisma = new PrismaClient();

async function upsertJson(ns: string, key: string, value: any, env = 'default') {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    update: {
      valueJson: value,
      valueString: null,
      valueNumber: null,
      valueBool: null,
    },
    create: { namespace: ns, environment: env, key, valueJson: value },
  });
}

async function upsertString(ns: string, key: string, value: string, env = 'default') {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    update: {
      valueString: value,
      valueNumber: null,
      valueBool: null,
      valueJson: Prisma.DbNull,
    },
    create: { namespace: ns, environment: env, key, valueString: value },
  });
}

// (optional) if you ever want pure numeric settings
async function upsertNumber(ns: string, key: string, value: number, env = 'default') {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: ns, environment: env, key } },
    update: {
      valueNumber: value,
      valueString: null,
      valueBool: null,
      valueJson: Prisma.DbNull,
    },
    create: { namespace: ns, environment: env, key, valueNumber: value },
  });
}

async function main() {
  // existing
  await upsertJson('i18n', 'supported_locales', ['en', 'de', 'fa']);

  // 💰 currencies (ONLY symbol info, no TTL here)
  await upsertJson('pricing', 'currencies', {
    USD: { symbol: '$' },
    EUR: { symbol: '€' },
    RIAL: { symbol: '﷼' },
  });

  // default currency string (product-service can read this)
  await upsertString('pricing', 'default_currency', 'USD');

  // ⏱ cart TTL – completely separate from currencies
  await upsertNumber('order', 'cart_ttl_minutes', 30);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
