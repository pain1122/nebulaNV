import { productv1 } from "@nebula/protos";
import type { PrismaService } from "../src/prisma.service";
import { CheckoutStockService } from "../src/product/checkout-stock.service";
import type { ProductServiceImpl } from "../src/product/product.service";
import { STOCK_INT_MAX } from "../src/product/checkout-stock-contract";

const intentId = "fd230000-0000-4000-8000-000000000001";
const productId = "fd230000-0000-4000-8000-000000000002";
const variantId = "fd230000-0000-4000-8000-000000000003";
const identity = { intentId, payloadHash: "a".repeat(64) };
function harness() {
  const intent = {
    id: intentId,
    payloadHash: identity.payloadHash,
    state: "FINALIZED",
    lines: [
      {
        productId,
        variantId: null as string | null,
        quantity: 2,
        tracked: true,
      },
    ],
    restoration: null as null | { intentId: string },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    checkoutStockIntent: { findUnique: jest.fn().mockResolvedValue(intent) },
    checkoutStockRestoration: {
      create: jest.fn().mockResolvedValue({ intentId }),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({
        id: productId,
        selectionMode: "BASE",
        trackInventory: true,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const transaction = jest.fn((work: (value: typeof tx) => Promise<unknown>) =>
    work(tx),
  );
  const catalogue = { getPublic: jest.fn() };
  const service = new CheckoutStockService(
    { $transaction: transaction } as unknown as PrismaService,
    catalogue as unknown as ProductServiceImpl,
  );
  return { service, tx, transaction, intent, catalogue };
}
describe("finalized stock restoration", () => {
  it("credits stored tracked quantities and atomically records a separate receipt", async () => {
    const h = harness();
    expect(
      await h.service.restore({ ...identity, quantity: 999, lines: [] }),
    ).toEqual({ ...identity, state: "RESTORED" });
    expect(h.tx.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: productId, stockQuantity: { lte: STOCK_INT_MAX - 2 } },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(h.tx.product.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: productId, version: { lt: STOCK_INT_MAX } },
      data: { version: { increment: 1 } },
    });
    expect(h.tx.checkoutStockRestoration.create).toHaveBeenCalledWith({
      data: { intentId },
    });
    expect(h.catalogue.getPublic).not.toHaveBeenCalled();
  });
  it("replays before any current Product lookup or further credit", async () => {
    const h = harness();
    h.intent.restoration = { intentId };
    expect((await h.service.restore(identity)).state).toBe("RESTORED");
    expect(h.tx.product.findUnique).not.toHaveBeenCalled();
    expect(h.tx.product.updateMany).not.toHaveBeenCalled();
    expect(h.tx.checkoutStockRestoration.create).not.toHaveBeenCalled();
  });
  it("does not credit originally unmanaged lines when tracking later changes", async () => {
    const h = harness();
    h.intent.lines[0].tracked = false;
    await h.service.restore(identity);
    expect(h.tx.product.updateMany).not.toHaveBeenCalled();
    expect(h.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(h.tx.checkoutStockRestoration.create).toHaveBeenCalledTimes(1);
  });
  it("credits original tracked variant counters even if currently unmanaged/inactive", async () => {
    const h = harness();
    h.intent.lines[0].variantId = variantId;
    h.tx.product.findUnique.mockResolvedValue({
      id: productId,
      selectionMode: "VARIANT",
      trackInventory: false,
    });
    await h.service.restore(identity);
    expect(h.tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: {
        id: variantId,
        productId,
        stockQuantity: { lte: STOCK_INT_MAX - 2 },
      },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(h.tx.product.updateMany).toHaveBeenCalledTimes(1);
  });
  it.each(["HELD", "CANCELLED"])(
    "rejects %s instead of using the finalized operation",
    async (state) => {
      const h = harness();
      h.intent.state = state;
      await expect(h.service.restore(identity)).rejects.toThrow(
        "checkout_stock_restore_conflict",
      );
      expect(h.tx.checkoutStockRestoration.create).not.toHaveBeenCalled();
    },
  );
  it("rejects missing intent or changed hash even if a receipt exists", async () => {
    const h = harness();
    h.intent.restoration = { intentId };
    h.intent.payloadHash = "b".repeat(64);
    await expect(h.service.restore(identity)).rejects.toThrow(
      "checkout_stock_restore_conflict",
    );
    h.tx.checkoutStockIntent.findUnique.mockResolvedValue(null);
    await expect(h.service.restore(identity)).rejects.toThrow(
      "checkout_stock_restore_conflict",
    );
    expect(h.tx.product.updateMany).not.toHaveBeenCalled();
  });
  it("rejects missing tracked Products, changed selection mode and capacity conflicts", async () => {
    const missing = harness();
    missing.tx.product.findUnique.mockResolvedValue(null);
    await expect(missing.service.restore(identity)).rejects.toThrow(
      "checkout_stock_restore_conflict",
    );
    const mode = harness();
    mode.tx.product.findUnique.mockResolvedValue({
      id: productId,
      selectionMode: "VARIANT",
      trackInventory: true,
    });
    await expect(mode.service.restore(identity)).rejects.toThrow(
      "checkout_stock_restore_conflict",
    );
    const full = harness();
    full.tx.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(full.service.restore(identity)).rejects.toThrow(
      "checkout_stock_restore_conflict",
    );
    for (const h of [missing, mode, full])
      expect(h.tx.checkoutStockRestoration.create).not.toHaveBeenCalled();
  });
  it("checks identity before opening any transaction and uses existing protobuf fields", async () => {
    const h = harness();
    expect(() => h.service.restore({ ...identity, intentId: "bad" })).toThrow(
      "checkout_stock_invalid",
    );
    expect(h.transaction).not.toHaveBeenCalled();
    const definition = productv1.ProductServiceService.restoreCheckoutStock;
    const decoded = definition.requestDeserialize(
      definition.requestSerialize(
        productv1.CheckoutStockIdentity.create(identity),
      ),
    );
    const result = await h.service.restore(decoded);
    expect(
      definition.responseDeserialize(
        definition.responseSerialize(
          productv1.CheckoutStockResponse.create(result),
        ),
      ),
    ).toMatchObject({ ...identity, state: "RESTORED" });
  });
});
