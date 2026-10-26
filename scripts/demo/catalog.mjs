export const DEMO_NAMESPACE = "nebula-demo-d1-v1";
export const DEMO_SCHEMA_VERSION = 1;

const base = (key, title, body = {}, expectations = {}) => ({
  key,
  title,
  category: "accessories",
  brand: "nebula",
  tags: ["everyday", "studio"],
  thumbnail: "front",
  gallery: ["front", "detail"],
  body: {
    title,
    slug: `${DEMO_NAMESPACE}-${key}`,
    sku: `DEMO-D1-${key.toUpperCase()}`,
    content: `${title}. A reproducible default-site catalogue example.`,
    excerpt: "A carefully defined Nebula demonstration product.",
    price: 99,
    status: "ACTIVE",
    selectionMode: "BASE",
    trackInventory: false,
    stockQuantity: 0,
    ...body,
  },
  variants: [],
  expectedPublic: true,
  expectedEffectivePrice: body.price ?? 99,
  ...expectations,
});

export function buildD1Catalog(profile = "showcase") {
  if (!["showcase", "limits"].includes(profile))
    throw new Error("demo_profile_invalid");
  const taxonomies = [
    { key: "collection", kind: "category.default", title: "Nebula Collection" },
    {
      key: "accessories",
      kind: "category.default",
      title: "Everyday Accessories",
      parent: "collection",
    },
    {
      key: "hidden",
      kind: "category.default",
      title: "Unreleased Collection",
      isHidden: true,
    },
    { key: "nebula", kind: "brand", title: "Nebula Studio" },
    { key: "everyday", kind: "tag", title: "Everyday" },
    { key: "studio", kind: "tag", title: "Studio Edition" },
    { key: "gift", kind: "tag", title: "Gift Selection" },
  ].map((item, sortOrder) => ({
    ...item,
    slug: `${DEMO_NAMESPACE}-${item.key}`,
    sortOrder,
    isHidden: item.isHidden ?? false,
    description: `Owned demo taxonomy: ${DEMO_NAMESPACE}/${item.key}`,
  }));
  const media = ["front", "detail"].map((key, index) => ({
    key,
    index,
    title:
      index === 0 ? "Nebula patterned front" : "Nebula detail — نمای نزدیک",
    defaultAlt:
      index === 0
        ? "Blue and green generated catalogue pattern"
        : "Detail pattern for the demonstration gallery",
    width: 640,
    height: 480,
  }));
  media[0].recipes = [
    { view: "thumbnail", width: 96, height: 96, fit: "cover", format: "webp" },
    {
      view: "card",
      width: 320,
      height: 200,
      fit: "cover",
      focalPoint: { x: 0.3, y: 0.6 },
      format: "webp",
      watermark: {
        kind: "text",
        text: "NEBULA DEMO",
        position: "bottom-right",
        opacity: 0.6,
      },
    },
    {
      view: "detail",
      width: 640,
      height: 480,
      fit: "inside",
      format: "png",
      watermark: {
        kind: "image",
        mediaKey: "detail",
        width: 64,
        height: 48,
        position: "top-left",
        opacity: 0.5,
      },
    },
    { view: "mobile", width: 180, height: 240, fit: "cover", format: "jpeg" },
  ];
  const products = [
    base(
      "classic",
      "Nebula Canvas Tote",
      {
        metaTitle: "Nebula Canvas Tote",
        metaDescription: "An everyday canvas tote.",
        metaKeywords: "canvas,tote",
        customSchema: JSON.stringify({
          "@type": "Product",
          name: "Nebula Canvas Tote",
        }),
      },
      {
        galleryText: [
          {},
          {
            title: "Tote detail",
            alt: "Close view of the demonstration tote pattern",
          },
        ],
      },
    ),
    base(
      "decorative",
      "Decorative Pattern Sample",
      { thumbnailAlt: "", thumbnailTitle: "Pattern sample" },
      {
        galleryText: [
          { alt: "", title: "" },
          { alt: null, title: null },
        ],
      },
    ),
    base("tracked", "Studio Ceramic Mug", {
      price: 29.99,
      trackInventory: true,
      stockQuantity: 12,
    }),
    base(
      "sold-out",
      "Sold-out Studio Mug",
      { price: 29.99, trackInventory: true, stockQuantity: 0 },
      { expectedPublic: false },
    ),
    base(
      "draft",
      "Unreleased Tote Colour",
      { status: "DRAFT", trackInventory: true, stockQuantity: 7 },
      { expectedPublic: false },
    ),
    base(
      "archived",
      "Retired Studio Edition",
      { status: "ARCHIVED" },
      { expectedPublic: false },
    ),
    base(
      "deleted",
      "Removed Demonstration Item",
      {},
      { softDeleted: true, expectedPublic: false },
    ),
    base("free", "Complimentary Sample", { price: 0 }),
    base("cent", "One-cent Boundary Sample", { price: 0.01 }),
    base(
      "percentage",
      "Seasonal Tote Offer",
      { discountType: "PERCENTAGE", discountValue: 25, discountActive: true },
      { expectedEffectivePrice: 74.25 },
    ),
    base(
      "full-discount",
      "Complimentary Promotion",
      { discountType: "PERCENTAGE", discountValue: 100, discountActive: true },
      { expectedEffectivePrice: 0 },
    ),
    base(
      "fixed-clamp",
      "Fixed-discount Sample",
      {
        price: 29.99,
        discountType: "FIXED",
        discountValue: 50,
        discountActive: true,
      },
      { expectedEffectivePrice: 0 },
    ),
    base("future-offer", "Future Scheduled Offer", {
      discountType: "PERCENTAGE",
      discountValue: 15,
      discountActive: true,
      discountStart: "2099-01-01T00:00:00.000Z",
      discountEnd: "2099-12-31T00:00:00.000Z",
    }),
    base("expired-offer", "Expired Scheduled Offer", {
      discountType: "PERCENTAGE",
      discountValue: 15,
      discountActive: true,
      discountStart: "2000-01-01T00:00:00.000Z",
      discountEnd: "2000-12-31T00:00:00.000Z",
    }),
    base("inactive-offer", "Paused Discount Offer", {
      discountType: "FIXED",
      discountValue: 10,
      discountActive: false,
    }),
    base("featured", "Featured Studio Gift", {
      isFeatured: true,
      featureSort: 1,
      promoTitle: "Studio gift collection",
      promoBadge: "NEW",
      promoActive: true,
      noindex: true,
    }),
    base("unicode", "کیف پارچه‌ای نبولا", {
      content: "A bilingual catalogue example — نمونه فارسی با محتوای کامل.",
      excerpt: "Persian and English content.",
    }),
    base(
      "variants",
      "Studio T-shirt",
      { price: 49.9, selectionMode: "VARIANT", trackInventory: true },
      {
        variants: [
          {
            key: "blue-m",
            sku: "DEMO-D1-SHIRT-BLUE-M",
            options: { Colour: "Blue", Size: "M" },
            priceOverride: 59.9,
            stockQuantity: 5,
            active: true,
            sortOrder: 0,
          },
          {
            key: "red-s",
            sku: "DEMO-D1-SHIRT-RED-S",
            options: { Colour: "Red", Size: "S" },
            stockQuantity: 0,
            active: true,
            sortOrder: 1,
          },
          {
            key: "green-l",
            sku: "DEMO-D1-SHIRT-GREEN-L",
            options: { Colour: "Green", Size: "L" },
            priceOverride: 0,
            stockQuantity: 2,
            active: false,
            sortOrder: 2,
          },
          {
            key: "old-xl",
            sku: "DEMO-D1-SHIRT-OLD-XL",
            options: { Colour: "Old", Size: "XL" },
            stockQuantity: 1,
            active: true,
            sortOrder: 3,
            softDeleted: true,
          },
        ],
      },
    ),
  ];
  if (profile === "limits") {
    for (let index = 0; index < 64; index += 1)
      taxonomies.push({
        key: `limit-tag-${index}`,
        kind: "tag",
        title: `Boundary tag ${index + 1}`,
        slug: `${DEMO_NAMESPACE}-limit-tag-${index}`,
        description: `Owned demo taxonomy: ${DEMO_NAMESPACE}/limit-tag-${index}`,
        isHidden: false,
        sortOrder: index,
      });
    for (let index = 2; index < 50; index += 1)
      media.push({
        key: `gallery-${index}`,
        index,
        width: 320,
        height: 240,
        title: `Boundary gallery image ${index}`.padEnd(200, "x"),
        defaultAlt: `Boundary description ${index}`.padEnd(180, "x"),
      });
    products.push(
      base("scalar-limits", "Boundary ".padEnd(180, "x"), {
        sku: "DEMO-D1-BOUNDARY-".padEnd(120, "X"),
        price: 9_999_999_999_999_998,
        trackInventory: true,
        stockQuantity: 2_147_483_647,
        featureSort: 1_000_000,
        promoActive: true,
        discountType: "FIXED",
        discountValue: 1_000_000,
        discountActive: false,
      }),
      base(
        "relation-limits",
        "Maximum Tag and Gallery Example",
        {},
        {
          tags: Array.from({ length: 64 }, (_, index) => `limit-tag-${index}`),
          gallery: media.map((item) => item.key),
        },
      ),
      base(
        "variant-limits",
        "Fifty-variant Boundary Example",
        { selectionMode: "VARIANT", trackInventory: true },
        {
          variants: Array.from({ length: 50 }, (_, index) => ({
            key: `option-${index}`,
            sku: `DEMO-D1-LIMIT-VARIANT-${index}`,
            options: {
              ["Colour".padEnd(40, "x")]: `Colour-${index}`.padEnd(80, "x"),
              ["Size".padEnd(40, "x")]: "Medium".padEnd(80, "x"),
              ["Material".padEnd(40, "x")]: "Cotton".padEnd(80, "x"),
            },
            stockQuantity: index === 0 ? 2_147_483_647 : 1,
            active: true,
            sortOrder: index,
          })),
        },
      ),
    );
    for (let index = 0; index < 101; index += 1)
      products.push(
        base(
          `page-${String(index).padStart(3, "0")}`,
          `Pagination Example ${index + 1}`,
          { price: 10 },
          { gallery: [], thumbnail: undefined },
        ),
      );
  }
  return {
    namespace: DEMO_NAMESPACE,
    schemaVersion: DEMO_SCHEMA_VERSION,
    profile,
    taxonomies,
    media,
    products,
  };
}

export function negativeProductCases(currency) {
  return [
    ["negative-price", { price: -0.01 }],
    ["price-scale", { price: 0.001 }],
    ["price-range", { price: 10_000_000_000_000_000 }],
    ["negative-stock", { trackInventory: true, stockQuantity: -1 }],
    ["stock-overflow", { trackInventory: true, stockQuantity: 2_147_483_648 }],
    ["untracked-stock", { trackInventory: false, stockQuantity: 1 }],
    ["shop-currency", { currency: currency === "USD" ? "EUR" : "USD" }],
    [
      "percentage-overflow",
      { discountType: "PERCENTAGE", discountValue: 101, discountActive: true },
    ],
    ["discount-without-type", { discountValue: 10, discountActive: true }],
    ["title-length", { title: "x".repeat(181) }],
    ["sku-length", { sku: "X".repeat(121) }],
    [
      "tag-count",
      {
        tagIds: Array.from(
          { length: 65 },
          () => "11111111-1111-4111-8111-111111111111",
        ),
      },
    ],
    ["thumbnail-title-length", { thumbnailTitle: "x".repeat(201) }],
    ["thumbnail-alt-length", { thumbnailAlt: "x".repeat(181) }],
    ["invalid-lifecycle", { status: "PUBLISHED" }],
    [
      "discount-window",
      {
        discountType: "FIXED",
        discountValue: 1,
        discountActive: true,
        discountStart: "2099-12-31T00:00:00.000Z",
        discountEnd: "2099-01-01T00:00:00.000Z",
      },
    ],
    ["legacy-thumbnail", { thumbnailUrl: "https://provider.test/asset" }],
    ...["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"].map((field) => [
      field,
      { [field]: "https://provider.test/asset" },
    ]),
    [
      "caller-authority",
      { actorUserId: "caller", tenantId: "caller", siteId: "caller" },
    ],
  ].map(([key, body]) => ({ key, body, status: 400 }));
}
