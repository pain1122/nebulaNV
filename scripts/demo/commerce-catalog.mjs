import assert from "node:assert/strict";
export const COMMERCE_NAMESPACE = "nebula-demo-d2-v1";
export const COMMERCE_MAX_QUANTITY = 2_147_483_647;
export const COMMERCE_SCENARIOS = Object.freeze([
  { key: "pending", status: "PENDING", allocated: true },
  { key: "processing", status: "PAYMENT_PROCESSING", allocated: true },
  { key: "failed", status: "PENDING", allocated: false },
  { key: "payment-cancelled", status: "PENDING", allocated: false },
  { key: "paid", status: "PAID", allocated: true },
  { key: "fulfilled", status: "FULFILLED", allocated: true },
  { key: "cancelled", status: "CANCELLED", allocated: false },
]);
export function buildCommerceCatalog(profile = "showcase") {
  assert.ok(
    ["showcase", "limits"].includes(profile),
    "demo_d2_invalid_profile",
  );
  return {
    namespace: COMMERCE_NAMESPACE,
    schemaVersion: 1,
    profile,
    products: [
      {
        key: "base",
        title: "D2 everyday base",
        price: 12.5,
        selectionMode: "BASE",
        trackInventory: true,
        stockQuantity: 40,
      },
      {
        key: "variant",
        title: "D2 configurable choice",
        price: 25,
        selectionMode: "VARIANT",
        trackInventory: true,
        stockQuantity: 0,
      },
      {
        key: "free",
        title: "D2 free unmanaged item",
        price: 0,
        selectionMode: "BASE",
        trackInventory: false,
        stockQuantity: 0,
      },
    ],
    variant: {
      options: { Color: "Blue", Size: "M" },
      priceOverride: 20,
      stockQuantity: 24,
    },
    scenarios: COMMERCE_SCENARIOS,
    cart: {
      base: 1,
      variant: 1,
      free: profile === "limits" ? COMMERCE_MAX_QUANTITY : 3,
    },
    orderQuantities: { base: 2, variant: 1, free: 3 },
    orderTotal: "45.00",
    cartTotal: "32.50",
  };
}
