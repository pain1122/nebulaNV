import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  OrderStatus,
  Prisma,
  type CheckoutReceipt,
} from "../../prisma/generated/client";
import { stableFacts, type orderReply } from "./checkout-contract";

export const CHECKOUT_REPLAY_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const checkoutHash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export function checkoutIntent(key: unknown, note?: string | null) {
  if (typeof key !== "string" || !KEY.test(key))
    throw new BadRequestException("checkout_idempotency_key_invalid");
  if (note !== undefined && note !== null && typeof note !== "string")
    throw new BadRequestException("checkout_note_invalid");
  return {
    keyHash: checkoutHash(key),
    intentHash: checkoutHash(stableFacts({ note: note ?? "" })),
  };
}
function invalid(): never {
  throw new ServiceUnavailableException("checkout_receipt_invalid");
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(
  row: Record<string, unknown>,
  field: string,
  nonempty = false,
): string {
  const value = row[field];
  if (typeof value !== "string" || (nonempty && !value)) return invalid();
  return value;
}
function amount(row: Record<string, unknown>, field: string): string {
  const value = text(row, field);
  if (!/^\d{1,16}\.\d{2}$/.test(value)) return invalid();
  return value;
}
function date(row: Record<string, unknown>, field: string): string {
  const value = text(row, field);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value)
    return invalid();
  return value;
}
function json(row: Record<string, unknown>, field: string): string {
  const value = text(row, field);
  if (value)
    try {
      JSON.parse(value);
    } catch {
      return invalid();
    }
  return value;
}

export function receiptReplay(
  receipt: CheckoutReceipt,
  userId: string,
  intentHash: string,
): ReturnType<typeof orderReply> {
  if (receipt.intentHash !== intentHash)
    throw new ConflictException("checkout_idempotency_conflict");
  if (receipt.replayUntil.getTime() <= Date.now())
    throw new ConflictException("checkout_replay_expired");
  const row = receipt.response;
  if (!record(row) || row.userId !== userId || row.id !== receipt.orderId)
    return invalid();
  return orderSnapshot(row);
}

export function orderSnapshot(row: unknown): ReturnType<typeof orderReply> {
  if (
    !record(row) ||
    row.checkoutMode !== "DEMO_NO_PAYMENT" ||
    !Array.isArray(row.items)
  )
    return invalid();
  const status = text(row, "status");
  if (!Object.values(OrderStatus).includes(status as OrderStatus))
    return invalid();
  if (
    row.version !== undefined &&
    (typeof row.version !== "number" ||
      !Number.isInteger(row.version) ||
      row.version < 1 ||
      row.version > 2147483647)
  )
    return invalid();
  return {
    ...(row.version === undefined ? {} : { version: row.version }),
    id: text(row, "id", true),
    orderNumber: text(row, "orderNumber", true),
    userId: text(row, "userId", true),
    checkoutMode: "DEMO_NO_PAYMENT",
    status: status as OrderStatus,
    currency: text(row, "currency", true),
    subtotal: amount(row, "subtotal"),
    discountTotal: amount(row, "discountTotal"),
    taxTotal: amount(row, "taxTotal"),
    total: amount(row, "total"),
    shippingAddress: json(row, "shippingAddress"),
    billingAddress: json(row, "billingAddress"),
    meta: json(row, "meta"),
    createdAt: date(row, "createdAt"),
    updatedAt: date(row, "updatedAt"),
    items: row.items.map((item) => {
      if (
        !record(item) ||
        !record(item.selectedOptions) ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 2147483647
      )
        return invalid();
      const selectedOptions: Record<string, string> = {};
      for (const [key, value] of Object.entries(item.selectedOptions)) {
        if (typeof value !== "string" || !value) return invalid();
        selectedOptions[key] = value;
      }
      const variantId =
        item.variantId === undefined
          ? undefined
          : text(item, "variantId", true);
      if (
        (variantId === undefined &&
          Object.keys(selectedOptions).length !== 0) ||
        (variantId !== undefined && Object.keys(selectedOptions).length === 0)
      )
        return invalid();
      return {
        id: text(item, "id", true),
        productId: text(item, "productId", true),
        variantId,
        selectedOptions,
        sku: text(item, "sku"),
        name: text(item, "name", true),
        quantity: item.quantity,
        unitPrice: amount(item, "unitPrice"),
        lineTotal: amount(item, "lineTotal"),
        meta: json(item, "meta"),
      };
    }),
  };
}

export function receiptBody(
  reply: ReturnType<typeof orderReply>,
): Prisma.InputJsonObject {
  const serialized = JSON.stringify(reply);
  if (Buffer.byteLength(serialized, "utf8") > MAX_RESPONSE_BYTES)
    throw new BadRequestException("checkout_response_too_large");
  // Generated locally from the explicit serializer; JSON round-trip drops undefined optional fields.
  const value: unknown = JSON.parse(serialized);
  if (!record(value)) return invalid();
  return value as Prisma.InputJsonObject;
}
