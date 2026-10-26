import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { isUUID } from "class-validator";
import { Prisma } from "../../prisma/generated/client";

export const MAX_CART_QUANTITY = 2147483647;
const MAX_AMOUNT = new Prisma.Decimal("9999999999999999.99");

export function cartId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !isUUID(value, "4")) {
    throw new BadRequestException(`${label}_invalid`);
  }
}

export function cartQuantity(
  value: unknown,
  allowZero = false,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > MAX_CART_QUANTITY
  ) {
    throw new BadRequestException("cart_quantity_invalid");
  }
}

// No implicit conversion of missing/malformed prices into free merchandise.
export function cartMoney(value: unknown): Prisma.Decimal {
  let amount: Prisma.Decimal;
  try {
    if (typeof value !== "string" || !/^\d+\.\d{2}$/.test(value))
      throw new Error();
    amount = new Prisma.Decimal(value);
  } catch {
    throw new ServiceUnavailableException("product_price_contract_invalid");
  }
  return boundedMoney(amount);
}

export function boundedMoney(amount: Prisma.Decimal): Prisma.Decimal {
  if (
    !amount.isFinite() ||
    amount.isNegative() ||
    amount.greaterThan(MAX_AMOUNT) ||
    amount.decimalPlaces() > 2
  ) {
    throw new BadRequestException("cart_amount_out_of_range");
  }
  return amount;
}

export interface CartProduct {
  id?: string;
  version?: number;
  title?: string;
  sku?: string;
  currency?: string;
  status?: string;
  deletedAt?: string;
  availability?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  selectionMode?: string;
  effectivePriceAmount?: string;
  variants?: {
    id: string;
    productId: string;
    sku: string;
    active: boolean;
    deletedAt: string;
    availability: string;
    stockQuantity: number;
    options: Record<string, string>;
    effectivePriceAmount: string;
  }[];
}

export function cartQuote(
  product: CartProduct,
  productId: string,
  variantId: string | undefined,
  currency: string,
) {
  if (product.currency !== currency)
    throw new BadRequestException("product_currency_mismatch");
  if (
    product.id !== productId ||
    !product.title ||
    product.status !== "ACTIVE" ||
    product.deletedAt ||
    product.availability !== "AVAILABLE"
  ) {
    throw new BadRequestException("product_unavailable");
  }
  if (typeof product.trackInventory !== "boolean")
    throw new ServiceUnavailableException("product_inventory_contract_invalid");
  let selected: CartProduct | NonNullable<CartProduct["variants"]>[number] =
    product;
  let options: Record<string, string> = {};
  if (product.selectionMode === "BASE") {
    if (variantId !== undefined)
      throw new BadRequestException("product_base_selection_required");
  } else if (product.selectionMode === "VARIANT") {
    if (!variantId) throw new BadRequestException("product_variant_required");
    const variant = product.variants?.find((entry) => entry.id === variantId);
    if (
      !variant ||
      variant.productId !== productId ||
      !variant.active ||
      variant.deletedAt ||
      variant.availability !== "AVAILABLE"
    ) {
      throw new BadRequestException("product_variant_unavailable");
    }
    if (
      !variant.options ||
      !Object.keys(variant.options).length ||
      Object.values(variant.options).some(
        (value) => typeof value !== "string" || !value,
      )
    ) {
      throw new ServiceUnavailableException("product_options_contract_invalid");
    }
    selected = variant;
    options = { ...variant.options };
  } else {
    throw new ServiceUnavailableException("product_selection_contract_invalid");
  }
  if (
    !selected.sku ||
    !Number.isInteger(selected.stockQuantity) ||
    selected.stockQuantity! < 0 ||
    selected.stockQuantity! > MAX_CART_QUANTITY
  ) {
    throw new ServiceUnavailableException("product_inventory_contract_invalid");
  }
  return {
    productId,
    variantId: variantId ?? null,
    selectionKey: variantId ? `variant:${variantId}` : `base:${productId}`,
    selectedOptions: options,
    name: product.title,
    sku: selected.sku,
    unitPrice: cartMoney(selected.effectivePriceAmount),
    trackInventory: product.trackInventory,
    stockQuantity: selected.stockQuantity!,
  };
}

export function checkCartStock(
  quote: { trackInventory: boolean; stockQuantity: number },
  quantity: number,
) {
  cartQuantity(quantity);
  if (quote.trackInventory && quantity > quote.stockQuantity)
    throw new BadRequestException("cart_insufficient_stock");
}

export type StoredCart = Prisma.CartGetPayload<{ include: { items: true } }>;

export function cartReply(cart: StoredCart) {
  let subtotal = new Prisma.Decimal(0);
  const items = [...cart.items]
    .sort((a, b) =>
      a.selectionKey < b.selectionKey
        ? -1
        : a.selectionKey > b.selectionKey
          ? 1
          : 0,
    )
    .map((item) => {
      cartQuantity(item.quantity);
      const unitPrice = boundedMoney(new Prisma.Decimal(item.unitPrice));
      const lineTotal = boundedMoney(unitPrice.mul(item.quantity));
      subtotal = boundedMoney(subtotal.plus(lineTotal));
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        selectedOptions: item.selectedOptions as Record<string, string>,
        sku: item.sku ?? "",
        name: item.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        meta: item.meta === null ? "" : JSON.stringify(item.meta),
      };
    });
  return {
    id: cart.id,
    userId: cart.userId,
    currency: cart.currency,
    expiresAt: cart.expiresAt?.toISOString() ?? "",
    items,
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2),
  };
}
