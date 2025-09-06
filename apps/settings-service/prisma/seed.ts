import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { namespace_environment_key: { namespace: 'i18n', environment: 'default', key: 'supported_locales' } },
    update: { valueJson: ['en','de','fa'], valueString: null, valueNumber: null, valueBool: null },
    create: { namespace: 'i18n', environment: 'default', key: 'supported_locales', valueJson: ['en','de','fa'] }
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
