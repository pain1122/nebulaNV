import type { CartProduct } from "../../src/order/cart-contract";
export const PRODUCT_ID = "451c1290-8074-4fca-b748-4116592e7875";
export const VARIANT_ID = "8e2df5b8-f116-4fc8-b229-84abdf9a1830";
export function product(overrides: Partial<CartProduct> = {}): CartProduct {
  return {
    id: PRODUCT_ID,
    version: 1,
    title: "Desk",
    sku: "DESK",
    currency: "USD",
    status: "ACTIVE",
    deletedAt: "",
    availability: "AVAILABLE",
    selectionMode: "BASE",
    trackInventory: true,
    stockQuantity: 9,
    effectivePriceAmount: "0.10",
    ...overrides,
  };
}
export function variantProduct(): CartProduct {
  return product({
    selectionMode: "VARIANT",
    variants: [
      {
        id: VARIANT_ID,
        productId: PRODUCT_ID,
        sku: "DESK-BLUE",
        active: true,
        deletedAt: "",
        availability: "AVAILABLE",
        stockQuantity: 3,
        options: { colour: "Blue" },
        effectivePriceAmount: "7.25",
      },
    ],
  });
}
