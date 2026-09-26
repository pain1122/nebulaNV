import { profile, type GatewayInputProfileGroup } from "./input-profile.core";

const PRODUCT_WRITE_FIELDS = Object.freeze([
  "title",
  "slug",
  "sku",
  "price",
  "currency",
  "status",
  "content",
  "excerpt",
  "categoryId",
  "thumbnailUrl",
  "model3dUrl",
  "model3dFormat",
  "model3dLiveView",
  "model3dPosterUrl",
  "vrEnabled",
  "vrPlanImageUrl",
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

const PRODUCT_PATCH_FIELDS = Object.freeze([
  ...PRODUCT_WRITE_FIELDS,
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
        fields: PRODUCT_WRITE_FIELDS,
      },
    ],
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
