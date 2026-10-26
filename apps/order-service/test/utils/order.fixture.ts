import { Prisma, OrderStatus } from "../../prisma/generated/client";
import type { StoredOrder } from "../../src/order/checkout-contract";
import { PRODUCT_ID, VARIANT_ID } from "./cart.fixture";

export function storedOrder(overrides: Partial<StoredOrder> = {}): StoredOrder {
  return {
    id: VARIANT_ID,
    orderNumber: "ORD-demo",
    userId: "owner",
    identityRealmId: null,
    subjectId: null,
    status: OrderStatus.PENDING,
    version: 1,
    currency: "USD",
    checkoutMode: "DEMO_NO_PAYMENT",
    subtotal: new Prisma.Decimal("0.30"),
    discountTotal: new Prisma.Decimal(0),
    taxTotal: new Prisma.Decimal(0),
    total: new Prisma.Decimal("0.30"),
    shippingAddress: null,
    billingAddress: null,
    meta: null,
    createdAt: new Date("2026-10-13T12:00:00Z"),
    updatedAt: new Date("2026-10-13T12:00:00Z"),
    items: [
      {
        id: PRODUCT_ID,
        orderId: VARIANT_ID,
        productId: PRODUCT_ID,
        variantId: null,
        selectedOptions: {},
        sku: "DESK",
        name: "Desk",
        quantity: 3,
        unitPrice: new Prisma.Decimal("0.10"),
        lineTotal: new Prisma.Decimal("0.30"),
        meta: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  };
}
