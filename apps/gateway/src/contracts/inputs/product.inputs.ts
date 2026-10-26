import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

const PRODUCT_WRITE_FIELDS = Object.freeze([
  "title",
  "slug",
  "sku",
  "price",
  "currency",
  "status",
  "selectionMode",
  "content",
  "excerpt",
  "categoryId",
  "brandId",
  "tagIds",
  "thumbnailMediaId",
  "thumbnailTitle",
  "thumbnailAlt",
  "model3dFormat",
  "model3dLiveView",
  "vrEnabled",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "customSchema",
  "noindex",
  "isFeatured",
  "featureSort",
  "promoTitle",
  "promoBadge",
  "promoActive",
  "discountType",
  "discountValue",
  "discountActive",
  "discountStart",
  "discountEnd",
  "tags",
  "complementaryIds",
  "trackInventory",
  "stockQuantity",
] as const);

const PRODUCT_PATCH_MUTATION_FIELDS = Object.freeze([
  ...PRODUCT_WRITE_FIELDS,
  "clearBrand",
  "clearThumbnailMedia",
] as const);

const PRODUCT_PATCH_FIELDS = Object.freeze([
  ...PRODUCT_PATCH_MUTATION_FIELDS,
  "expectedVersion",
] as const);

export const PRODUCT_INPUT_PROFILES = Object.freeze({
  "product-public-list": profile({
    query: ["q", "categoryId", "page", "limit"],
  }),
  "product-admin-list": profile({
    query: ["q", "categoryId", "page", "limit", "status", "includeDeleted"],
  }),
  "product-write": profile({
    body: PRODUCT_WRITE_FIELDS,
    requiredBody: ["title", "price"],
  }),
  "product-patch": profile({
    params: ["id"],
    body: PRODUCT_PATCH_FIELDS,
    requiredParams: ["id"],
    requiredBody: ["expectedVersion"],
    rules: [
      {
        kind: "at-least-one",
        location: "body",
        fields: PRODUCT_PATCH_MUTATION_FIELDS,
      },
    ],
  }),
  "variant-write": profile({
    params: ["id"],
    body: [
      "sku",
      "options",
      "priceOverride",
      "stockQuantity",
      "active",
      "sortOrder",
      "expectedVersion",
    ],
    requiredParams: ["id"],
    requiredBody: ["sku", "options", "expectedVersion"],
  }),
  "variant-patch": profile({
    params: ["id", "variantId"],
    body: [
      "sku",
      "options",
      "priceOverride",
      "clearPriceOverride",
      "stockQuantity",
      "active",
      "sortOrder",
      "expectedVersion",
    ],
    requiredParams: ["id", "variantId"],
    requiredBody: ["expectedVersion"],
    rules: [
      {
        kind: "at-least-one",
        location: "body",
        fields: [
          "sku",
          "options",
          "priceOverride",
          "clearPriceOverride",
          "stockQuantity",
          "active",
          "sortOrder",
        ],
      },
    ],
  }),
  "variant-delete": profile({
    params: ["id", "variantId"],
    query: ["expectedVersion"],
    requiredParams: ["id", "variantId"],
    requiredQuery: ["expectedVersion"],
  }),
  "product-bulk-discount": profile({
    body: [
      "ids",
      "categoryId",
      "status",
      "q",
      "discountType",
      "discountValue",
      "discountActive",
      "discountStart",
      "discountEnd",
    ],
    rules: [
      {
        kind: "at-least-one",
        location: "body",
        fields: ["ids", "categoryId", "status", "q"],
      },
      {
        kind: "at-least-one",
        location: "body",
        fields: [
          "discountType",
          "discountValue",
          "discountActive",
          "discountStart",
          "discountEnd",
        ],
      },
    ],
  }),
  "gallery-admin-list": profile({
    params: ["id"],
    query: ["includeDeleted"],
    requiredParams: ["id"],
  }),
  "gallery-add": profile({
    params: ["id"],
    body: ["images"],
    requiredParams: ["id"],
    requiredBody: ["images"],
    rules: [
      { kind: "max-items", location: "body", field: "images", maximum: 50 },
    ],
  }),
  "gallery-metadata": profile({
    params: ["id", "imageId"],
    requiredParams: ["id", "imageId"],
    body: ["title", "alt", "expectedVersion"],
    requiredBody: ["expectedVersion"],
    rules: [
      { kind: "at-least-one", location: "body", fields: ["title", "alt"] },
    ],
  }),
  "gallery-order": profile({
    params: ["id"],
    body: ["orders"],
    requiredParams: ["id"],
    requiredBody: ["orders"],
    rules: [
      {
        kind: "max-items",
        location: "body",
        field: "orders",
        maximum: 200,
      },
    ],
  }),
  "gallery-remove": profile({
    params: ["id", "imageId"],
    query: ["hardDelete"],
    requiredParams: ["id", "imageId"],
  }),
} satisfies GatewayInputProfileGroup);
