import { PrismaClient } from "./generated";

const prisma = new PrismaClient();

async function main() {
  // -------------------------------------
  // BLOG SCOPE
  // -------------------------------------

  const blogCategories = [
    { slug: "guide",       title: "راهنمای خرید",           sortOrder: 1 },
    { slug: "maintenance", title: "نگهداری و عیب‌یابی",     sortOrder: 2 },
    { slug: "compare",     title: "مقایسه لوازم خانگی",     sortOrder: 3 },
  ];

  for (const c of blogCategories) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: { scope: "blog", kind: "category", slug: c.slug },
      },
      update: {},
      create: {
        scope: "blog",
        kind: "category",
        slug: c.slug,
        title: c.title,
        sortOrder: c.sortOrder ?? 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }

  const blogTags = [
    { slug: "bosch-fridge",  title: "یخچال بوش" },
    { slug: "bosch-washer",  title: "ماشین لباسشویی بوش" },
    { slug: "bosch-dish",    title: "ماشین ظرفشویی بوش" },
    { slug: "bosch-oven",    title: "فر و اجاق‌گاز بوش" },
  ];

  for (const t of blogTags) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: { scope: "blog", kind: "tag", slug: t.slug },
      },
      update: {},
      create: {
        scope: "blog",
        kind: "tag",
        slug: t.slug,
        title: t.title,
        sortOrder: 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }

  // -------------------------------------
  // PRODUCT SCOPE
  // -------------------------------------

  // 1) Default product category (for settings: defaultProductCategoryTaxonomyId)
  const productCategories = [
    {
      slug: "uncategorized",
      title: "بدون دسته‌بندی",
      sortOrder: 0,
      isSystem: true,
      isHidden: false,
      description: "دسته پیش‌فرض برای محصولاتی که هنوز دسته‌بندی نشده‌اند.",
    },
    {
      slug: "major-appliances",
      title: "لوازم خانگی بزرگ",
      sortOrder: 1,
      isSystem: false,
      isHidden: false,
      description: "یخچال، ماشین لباسشویی، ظرفشویی و سایر لوازم بزرگ.",
    },
    {
      slug: "refrigerators",
      title: "یخچال و فریزر",
      sortOrder: 2,
      isSystem: false,
      isHidden: false,
      description: "انواع یخچال فریزرهای بوش.",
    },
    {
      slug: "washers",
      title: "ماشین لباسشویی",
      sortOrder: 3,
      isSystem: false,
      isHidden: false,
      description: "انواع ماشین لباسشویی و خشک‌کن بوش.",
    },
    {
      slug: "dishwashers",
      title: "ماشین ظرفشویی",
      sortOrder: 4,
      isSystem: false,
      isHidden: false,
      description: "ماشین ظرفشویی‌های رومیزی و مبله بوش.",
    },
  ];

  for (const c of productCategories) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "category.default",
          slug: c.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "category.default",
        slug: c.slug,
        title: c.title,
        description: c.description ?? null,
        sortOrder: c.sortOrder ?? 0,
        isHidden: c.isHidden ?? false,
        isSystem: c.isSystem ?? false,
        meta: {},
      },
    });
  }

  // 2) Product tags (flat, non-tree)
  const productTags = [
    { slug: "bosch-original",      title: "بوش اصل" },
    { slug: "energy-efficient",    title: "کم‌مصرف و کم‌مصرف انرژی" },
    { slug: "silent-operation",    title: "کم‌صدا" },
    { slug: "smart-home",          title: "هوشمند و قابل اتصال" },
    { slug: "compact-size",        title: "کم‌جا و کامپکت" },
  ];

  for (const t of productTags) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "tag",
          slug: t.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "tag",
        slug: t.slug,
        title: t.title,
        sortOrder: 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }

  // 3) Product brands
  const productBrands = [
    {
      slug: "bosch",
      title: "Bosch",
      description: "برند اصلی بوش آلمان.",
      sortOrder: 1,
      isSystem: true,
    },
    {
      slug: "coopers-bosch",
      title: "CoopersBosch",
      description: "اکسسوری‌ها و محصولات برند کوپرزبوش.",
      sortOrder: 2,
      isSystem: false,
    },
  ];

  for (const b of productBrands) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "brand",
          slug: b.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "brand",
        slug: b.slug,
        title: b.title,
        description: b.description ?? null,
        sortOrder: b.sortOrder ?? 0,
        isHidden: false,
        isSystem: b.isSystem ?? false,
        meta: {},
      },
    });
  }

  // 4) Generic attributes (families only – values can be added via API later)
  const productAttributes = [
    {
      slug: "energy-class",
      title: "رده مصرف انرژی",
      description: "برچسب مصرف انرژی دستگاه (A، B، C و ...).",
    },
    {
      slug: "capacity",
      title: "ظرفیت",
      description: "ظرفیت اسمی دستگاه (لیتر، کیلوگرم و ...).",
    },
    {
      slug: "color",
      title: "رنگ",
      description: "رنگ بدنه دستگاه.",
    },
    {
      slug: "dimensions",
      title: "ابعاد",
      description: "ابعاد کلی دستگاه.",
    },
  ];

  for (const a of productAttributes) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "attribute",
          slug: a.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "attribute",
        slug: a.slug,
        title: a.title,
        description: a.description ?? null,
        sortOrder: 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }

  // 5) Variable attributes (families you intend to use for variants)
  const variableAttributes = [
    {
      slug: "size",
      title: "سایز",
      description: "سایز/گنجایش متغیر محصول برای مدل‌های متنوع.",
    },
    {
      slug: "finish",
      title: "نوع بدنه / فینیش",
      description: "استیل، شیشه‌ای، رنگی و ...",
    },
  ];

  for (const a of variableAttributes) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "attribute.variable",
          slug: a.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "attribute.variable",
        slug: a.slug,
        title: a.title,
        description: a.description ?? null,
        sortOrder: 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }

  // 6) Example package/group taxonomy (optional, can be used later)
  const productPackages = [
    {
      slug: "kitchen-starter-pack",
      title: "پک استارت آشپزخانه",
      description: "پکیج پیشنهادی شامل چند لوازم خانگی اصلی آشپزخانه.",
    },
  ];

  for (const p of productPackages) {
    await prisma.taxonomy.upsert({
      where: {
        scope_kind_slug: {
          scope: "product",
          kind: "package",
          slug: p.slug,
        },
      },
      update: {},
      create: {
        scope: "product",
        kind: "package",
        slug: p.slug,
        title: p.title,
        description: p.description ?? null,
        sortOrder: 0,
        isHidden: false,
        isSystem: false,
        meta: {},
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
