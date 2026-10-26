import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { checkoutStockHash, type CheckoutStockFacts } from "@nebula/clients";
import { Prisma, type CheckoutAttempt } from "../../prisma/generated/client";
import { boundedMoney, cartId, cartMoney, cartQuantity } from "./cart-contract";

export const CHECKOUT_LEASE_MS = 120_000;
export const CHECKOUT_RPC_MS = 10_000;
export const CHECKOUT_WAIT_MS = 10_000;
export const ACTIVE_CHECKOUT_STATES = [
  "PREPARED",
  "ORDER_COMMITTED",
  "CANCELLING",
] as const;
export const checkoutPending = (cause?: unknown) =>
  new ServiceUnavailableException("checkout_recovery_pending", { cause });
export interface CheckoutPayload {
  orderNumber: string;
  note: string;
  currency: string;
  subtotal: string;
  total: string;
  stock: CheckoutStockFacts;
  items: Array<{
    productId: string;
    variantId: string | null;
    selectedOptions: Record<string, string>;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function invalid(): never {
  throw new ServiceUnavailableException("checkout_attempt_invalid");
}
function parse(value: unknown): CheckoutPayload {
  if (
    !record(value) ||
    typeof value.orderNumber !== "string" ||
    !value.orderNumber ||
    typeof value.note !== "string" ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3,8}$/.test(value.currency) ||
    typeof value.subtotal !== "string" ||
    typeof value.total !== "string" ||
    !record(value.stock) ||
    value.stock.currency !== value.currency ||
    !Array.isArray(value.stock.lines) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 100 ||
    value.stock.lines.length !== value.items.length
  )
    invalid();
  const items: CheckoutPayload["items"] = [];
  const lines: CheckoutStockFacts["lines"] = [];
  const selections = new Set<string>();
  const versions = new Map<string, number>();
  let total = new Prisma.Decimal(0);
  for (let index = 0; index < value.items.length; index++) {
    const raw: unknown = value.items[index];
    const line: unknown = value.stock.lines[index];
    if (!record(raw) || !record(line)) invalid();
    cartId(raw.productId, "product_id");
    if (raw.variantId !== null) cartId(raw.variantId, "variant_id");
    cartQuantity(raw.quantity);
    if (
      typeof raw.sku !== "string" ||
      !raw.sku ||
      raw.sku.length > 120 ||
      typeof raw.name !== "string" ||
      !raw.name ||
      !record(raw.selectedOptions)
    )
      invalid();
    const selectedOptions: Record<string, string> = {};
    for (const [key, option] of Object.entries(raw.selectedOptions)) {
      if (
        !key ||
        key.length > 40 ||
        typeof option !== "string" ||
        !option ||
        option.length > 80 ||
        ["__proto__", "constructor", "prototype"].includes(key)
      )
        invalid();
      selectedOptions[key] = option;
    }
    if (
      raw.variantId === null
        ? Object.keys(selectedOptions).length !== 0
        : Object.keys(selectedOptions).length < 1 ||
          Object.keys(selectedOptions).length > 3
    )
      invalid();
    const unitPrice = cartMoney(raw.unitPrice).toFixed(2);
    const lineTotal = boundedMoney(
      new Prisma.Decimal(unitPrice).mul(raw.quantity),
    ).toFixed(2);
    if (
      raw.lineTotal !== lineTotal ||
      typeof line.expectedVersion !== "number" ||
      !Number.isInteger(line.expectedVersion) ||
      line.expectedVersion < 1 ||
      line.expectedVersion >= 2147483647
    )
      invalid();
    const selection = `${raw.productId}:${raw.variantId ?? "base"}`;
    if (
      selections.has(selection) ||
      (versions.has(raw.productId) &&
        versions.get(raw.productId) !== line.expectedVersion)
    )
      invalid();
    selections.add(selection);
    versions.set(raw.productId, line.expectedVersion);
    const expected = {
      productId: raw.productId,
      variantId: raw.variantId ?? "",
      quantity: raw.quantity,
      expectedVersion: line.expectedVersion,
      sku: raw.sku,
      unitPrice,
      selectedOptions,
    };
    if (
      checkoutStockHash({ currency: value.currency, lines: [expected] }) !==
      checkoutStockHash({
        currency: value.currency,
        lines: [line as unknown as CheckoutStockFacts["lines"][number]],
      })
    )
      invalid();
    items.push({
      productId: raw.productId,
      variantId: raw.variantId,
      quantity: raw.quantity,
      selectedOptions,
      sku: raw.sku,
      name: raw.name,
      unitPrice,
      lineTotal,
    });
    lines.push(expected);
    total = boundedMoney(total.add(lineTotal));
  }
  if (
    cartMoney(value.subtotal).toFixed(2) !== total.toFixed(2) ||
    value.total !== value.subtotal
  )
    invalid();
  return {
    orderNumber: value.orderNumber,
    note: value.note,
    currency: value.currency,
    subtotal: value.subtotal,
    total: value.total,
    stock: { currency: value.currency, lines },
    items,
  };
}
export function checkoutPayloadBody(
  payload: CheckoutPayload,
): Prisma.InputJsonObject {
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized) > 2 * 1024 * 1024)
    throw new BadRequestException("checkout_response_too_large");
  parse(payload);
  return JSON.parse(serialized) as Prisma.InputJsonObject;
}
export function attemptPayload(attempt: CheckoutAttempt): CheckoutPayload {
  try {
    const payload = parse(attempt.payload);
    if (checkoutStockHash(payload.stock) !== attempt.stockHash) invalid();
    return payload;
  } catch (error) {
    if (
      error instanceof ServiceUnavailableException &&
      error.message === "checkout_attempt_invalid"
    )
      throw error;
    throw new ServiceUnavailableException("checkout_attempt_invalid", {
      cause: error,
    });
  }
}
