import { ConflictException } from "@nestjs/common";
import { Prisma } from "../../prisma/generated/client";
import { boundedMoney, type StoredCart } from "./cart-contract";

export function stableFacts(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableFacts).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableFacts(item)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function capturedCart(cart: StoredCart): string {
  return stableFacts({
    id: cart.id,
    userId: cart.userId,
    currency: cart.currency,
    expiresAt: cart.expiresAt?.toISOString(),
    updatedAt: cart.updatedAt?.toISOString(),
    items: [...cart.items]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        selectionKey: item.selectionKey,
        selectedOptions: item.selectedOptions,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        meta: item.meta,
        updatedAt: item.updatedAt?.toISOString(),
      })),
  });
}

export function requireSameCart(expected: string, current: StoredCart) {
  if (expected !== capturedCart(current))
    throw new ConflictException("checkout_cart_changed");
}

export type StoredOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;
const json = (value: Prisma.JsonValue | null) =>
  value === null ? "" : JSON.stringify(value);
const money = (value: Prisma.Decimal) => boundedMoney(value).toFixed(2);

// Only persisted facts: reads never join today's catalogue or storage provider.
export function orderReply(order: StoredOrder) {
  return {
    ...(order.version === undefined ? {} : { version: order.version }),
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    currency: order.currency,
    checkoutMode: order.checkoutMode,
    subtotal: money(order.subtotal),
    discountTotal: money(order.discountTotal),
    taxTotal: money(order.taxTotal),
    total: money(order.total),
    shippingAddress: json(order.shippingAddress),
    billingAddress: json(order.billingAddress),
    meta: json(order.meta),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: [...order.items]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        selectedOptions: item.selectedOptions as Record<string, string>,
        sku: item.sku ?? "",
        name: item.name,
        quantity: item.quantity,
        unitPrice: money(item.unitPrice),
        lineTotal: money(item.lineTotal),
        meta: json(item.meta),
      })),
  };
}
