import { PrismaClient, ProductStatus } from './generated/client';

const prisma = new PrismaClient();

async function main() {
  // ID of taxonomy row from taxonomy-service (scope=product, kind=category.default)
  const defaultCategoryId =
    process.env.PRODUCT_SEED_DEFAULT_CATEGORY_ID ||
    'REPLACE_ME_WITH_DEFAULT_CATEGORY_ID';

  if (!defaultCategoryId || defaultCategoryId === 'REPLACE_ME_WITH_DEFAULT_CATEGORY_ID') {
    console.warn('⚠️ PRODUCT_SEED_DEFAULT_CATEGORY_ID not set. Skipping product seed.');
    return;
  }

  const count = await prisma.product.count();
  if (count > 0) {
    console.log(`ℹ️ ${count} products already exist, skipping seed.`);
    return;
  }

  const now = new Date();

  await prisma.product.createMany({
    data: [
      {
        id:           undefined as any, // let DB default uuid
        slug:         'demo-widget-1',
        title:        'Demo Widget 1',
        description:  'A demo product linked to default category.',
        excerpt:      'Demo widget #1',
        sku:          'DEMO-001',
        status:       ProductStatus.ACTIVE,
        price:        199.99,
        currency:     'USD',
        categoryId:   defaultCategoryId,
        discountValue: null,
        discountActive: false,
        discountStart:  null,
        discountEnd:    null,
        model3dUrl:     null,
        model3dFormat:  null,
        model3dLiveView:false,
        model3dPosterUrl:null,
        vrPlanImageUrl: null,
        vrEnabled:      false,
        metaTitle:      'Demo Widget 1',
        metaDescription:'Seeded demo product 1',
        metaKeywords:   null,
        customSchema:   null,
        noindex:        false,
        isFeatured:     false,
        featureSort:    0,
        promoTitle:     null,
        promoBadge:     null,
        promoActive:    false,
        promoStart:     null,
        promoEnd:       null,
        tags:           [],
        complementaryIds: [],
        deletedAt:      null,
        createdAt:      now,
        updatedAt:      now,
      },
      {
        id:           undefined as any,
        slug:         'demo-widget-2',
        title:        'Demo Widget 2',
        description:  'Another demo product for the same category.',
        excerpt:      'Demo widget #2',
        sku:          'DEMO-002',
        status:       ProductStatus.ACTIVE,
        price:        349.0,
        currency:     'USD',
        categoryId:   defaultCategoryId,
        discountValue: null,
        discountActive: false,
        discountStart:  null,
        discountEnd:    null,
        model3dUrl:     null,
        model3dFormat:  null,
        model3dLiveView:false,
        model3dPosterUrl:null,
        vrPlanImageUrl: null,
        vrEnabled:      false,
        metaTitle:      'Demo Widget 2',
        metaDescription:'Seeded demo product 2',
        metaKeywords:   null,
        customSchema:   null,
        noindex:        false,
        isFeatured:     false,
        featureSort:    0,
        promoTitle:     null,
        promoBadge:     null,
        promoActive:    false,
        promoStart:     null,
        promoEnd:       null,
        tags:           [],
        complementaryIds: [],
        deletedAt:      null,
        createdAt:      now,
        updatedAt:      now,
      },
    ],
  });

  console.log('✅ product-service seeded with demo products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
