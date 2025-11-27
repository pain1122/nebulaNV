import { PrismaClient } from "./generated";

const prisma = new PrismaClient();

async function main() {
  const blogCategories = [
    { slug: "guide", title: "راهنمای خرید", sortOrder: 1 },
    { slug: "maintenance", title: "نگهداری و عیب‌یابی", sortOrder: 2 },
    { slug: "compare", title: "مقایسه", sortOrder: 3 },
  ];

  for (const c of blogCategories) {
    await prisma.taxonomy.upsert({
      where: { scope_kind_slug: { scope: "blog", kind: "category", slug: c.slug } },
      update: {},
      create: { scope: "blog", kind: "category", ...c },
    });
  }

  const blogTags = [
    { slug: "bosch-fridge", title: "یخچال بوش" },
    { slug: "bosch-washer", title: "ماشین لباسشویی بوش" },
  ];

  for (const t of blogTags) {
    await prisma.taxonomy.upsert({
      where: { scope_kind_slug: { scope: "blog", kind: "tag", slug: t.slug } },
      update: {},
      create: { scope: "blog", kind: "tag", ...t },
    });
  }
}

main().finally(() => prisma.$disconnect());
