import { createHash } from "node:crypto";

export interface CheckoutStockFacts {
  currency: string;
  lines: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    expectedVersion: number;
    sku: string;
    unitPrice: string;
    selectedOptions: Record<string, string>;
  }>;
}

// Call only after the owning boundary validates facts; independent of wire order.
export function checkoutStockHash(facts: CheckoutStockFacts): string {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const lines = facts.lines
    .map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      expectedVersion: line.expectedVersion,
      sku: line.sku,
      unitPrice: line.unitPrice,
      selectedOptions: Object.fromEntries(
        Object.entries(line.selectedOptions).sort(([a], [b]) => compare(a, b)),
      ),
    }))
    .sort((a, b) =>
      compare(`${a.productId}:${a.variantId}`, `${b.productId}:${b.variantId}`),
    );
  return createHash("sha256")
    .update(JSON.stringify({ currency: facts.currency, lines }))
    .digest("hex");
}
