import { BadRequestException } from "@nestjs/common";
import { checkoutStockHash, type CheckoutStockFacts } from "@nebula/clients";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hash = /^[0-9a-f]{64}$/;
export const STOCK_INT_MAX = 2_147_483_647;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function invalid(): never {
  throw new BadRequestException("checkout_stock_invalid");
}

export function stockIdentity(value: unknown): {
  intentId: string;
  payloadHash: string;
} {
  if (
    !record(value) ||
    typeof value.intentId !== "string" ||
    !uuid.test(value.intentId) ||
    typeof value.payloadHash !== "string" ||
    !hash.test(value.payloadHash)
  )
    invalid();
  return { intentId: value.intentId, payloadHash: value.payloadHash };
}

export function stockReservation(
  value: unknown,
): CheckoutStockFacts & ReturnType<typeof stockIdentity> {
  const identity = stockIdentity(value);
  if (
    !record(value) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3,8}$/.test(value.currency) ||
    !Array.isArray(value.lines) ||
    value.lines.length < 1 ||
    value.lines.length > 100
  )
    invalid();
  const lines: CheckoutStockFacts["lines"] = [];
  const selections = new Set<string>();
  const versions = new Map<string, number>();
  for (const raw of value.lines as unknown[]) {
    if (
      !record(raw) ||
      typeof raw.productId !== "string" ||
      !uuid.test(raw.productId)
    )
      invalid();
    const variantId = raw.variantId ?? "";
    if (
      typeof variantId !== "string" ||
      (variantId !== "" && !uuid.test(variantId))
    )
      invalid();
    const quantity = raw.quantity;
    const expectedVersion = raw.expectedVersion;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > STOCK_INT_MAX ||
      typeof expectedVersion !== "number" ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1 ||
      expectedVersion >= STOCK_INT_MAX
    )
      invalid();
    if (
      typeof raw.sku !== "string" ||
      raw.sku.length < 1 ||
      raw.sku.length > 120 ||
      raw.sku.trim() !== raw.sku ||
      typeof raw.unitPrice !== "string" ||
      !/^(0|[1-9][0-9]{0,15})\.[0-9]{2}$/.test(raw.unitPrice)
    )
      invalid();
    const options = raw.selectedOptions ?? {};
    if (
      !record(options) ||
      Object.keys(options).length > 3 ||
      (variantId === ""
        ? Object.keys(options).length !== 0
        : Object.keys(options).length === 0)
    )
      invalid();
    const selectedOptions: Record<string, string> = {};
    for (const [key, option] of Object.entries(options)) {
      if (
        key.length < 1 ||
        key.length > 40 ||
        key.trim() !== key ||
        typeof option !== "string" ||
        option.length < 1 ||
        option.length > 80 ||
        option.trim() !== option ||
        ["__proto__", "constructor", "prototype"].includes(key)
      )
        invalid();
      selectedOptions[key] = option;
    }
    const selection = `${raw.productId}:${variantId || "base"}`;
    if (
      selections.has(selection) ||
      (versions.has(raw.productId) &&
        versions.get(raw.productId) !== expectedVersion)
    )
      invalid();
    selections.add(selection);
    versions.set(raw.productId, expectedVersion);
    lines.push({
      productId: raw.productId,
      variantId,
      quantity,
      expectedVersion,
      sku: raw.sku,
      unitPrice: raw.unitPrice,
      selectedOptions,
    });
  }
  const facts = { currency: value.currency, lines };
  if (checkoutStockHash(facts) !== identity.payloadHash) invalid();
  return { ...identity, ...facts };
}
