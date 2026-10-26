import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { OrderService } from "../src/order/order.service";
import type { PrismaService } from "../src/prisma.service";
import {
  PRODUCT_ID,
  VARIANT_ID,
  product,
  variantProduct,
} from "./utils/cart.fixture";

type ItemRow = {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  selectionKey: string;
  selectedOptions: Record<string, string>;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  meta: null;
};
type CartRow = {
  id: string;
  userId: string;
  currency: string;
  expiresAt: Date | null;
  items: ItemRow[];
};
type ItemData = Omit<ItemRow, "id" | "meta" | "unitPrice"> & {
  unitPrice: { toString(): string };
};
const ITEM_ID = "cc2021df-562b-433d-a749-26cc16487ab4";
// Mutable storage double proves service decisions, not PostgreSQL concurrency.
function harness(initialProduct = product()) {
  let stored: CartRow | null = null;
  let rowId = 0;
  const cart = {
    findUnique: jest.fn(({ where }: { where: { userId: string } }) =>
      stored?.userId === where.userId ? structuredClone(stored) : null,
    ),
    create: jest.fn(({ data }: { data: Omit<CartRow, "id" | "items"> }) => {
      stored = { id: PRODUCT_ID, ...data, items: [] };
      return structuredClone(stored);
    }),
    update: jest.fn(
      ({
        data,
      }: {
        data: Partial<Pick<CartRow, "currency" | "expiresAt">>;
      }) => {
        Object.assign(stored!, data);
        return structuredClone(stored);
      },
    ),
    delete: jest.fn(() => {
      stored = null;
    }),
  };
  const cartItem = {
    create: jest.fn(({ data }: { data: ItemData }) => {
      const item = {
        id: rowId++ ? VARIANT_ID : ITEM_ID,
        meta: null,
        ...data,
        unitPrice: data.unitPrice.toString(),
      };
      stored!.items.push(item);
      return item;
    }),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Omit<ItemData, "cartId">;
      }) =>
        Object.assign(stored!.items.find((item) => item.id === where.id)!, {
          ...data,
          unitPrice: data.unitPrice.toString(),
        }),
    ),
    delete: jest.fn(({ where }: { where: { id: string } }) => {
      stored!.items = stored!.items.filter((item) => item.id !== where.id);
    }),
    deleteMany: jest.fn(() => {
      stored!.items = [];
    }),
  };
  const tx = {
    checkoutAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    checkoutReceipt: { findUnique: jest.fn().mockResolvedValue(null) },
    cart,
    cartItem,
    $queryRaw: jest.fn(() => []),
    order: { create: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn(
      async (work: (context: typeof tx) => Promise<unknown>) => {
        const saved = structuredClone(stored);
        try {
          return await work(tx);
        } catch (error) {
          stored = saved;
          throw error;
        }
      },
    ),
  };
  const svc = new OrderService(
    prisma as unknown as PrismaService,
    {} as ClientGrpc,
    {} as ClientGrpc,
  );
  const getProduct = jest.fn(() => of({ data: initialProduct }));
  Object.assign(svc, {
    productSvc: { GetProduct: getProduct },
    settingsSvc: {
      GetString: jest.fn(({ namespace }: { namespace: string }) =>
        of({ found: true, value: namespace === "pricing" ? "USD" : "30" }),
      ),
    },
  });
  return {
    svc,
    tx,
    prisma,
    getProduct,
    setCart(value: CartRow) {
      stored = value;
    },
    stored: () => structuredClone(stored),
  };
}

describe("Cart owner mutations", () => {
  it("returns an explicit conflict for bounded transaction contention", async () => {
    const h = harness();
    h.prisma.$transaction.mockRejectedValueOnce({ code: "P2028" });
    await expect(
      h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 }),
    ).rejects.toMatchObject({ status: 409, message: "cart_write_conflict" });
    expect(h.stored()).toBeNull();
  });

  it("normalizes valid uppercase UUIDs to the stored selection identity", async () => {
    const h = harness(variantProduct());
    const reply = await h.svc.addToCart("owner", {
      productId: PRODUCT_ID.toUpperCase(),
      variantId: VARIANT_ID.toUpperCase(),
      quantity: 1,
    });
    expect(reply.data.items[0]).toMatchObject({
      productId: PRODUCT_ID,
      variantId: VARIANT_ID,
    });
    await expect(
      h.svc.removeCartItem("owner", reply.data.items[0].id.toUpperCase()),
    ).resolves.toMatchObject({ data: { items: [] } });
  });
  it("merges a base selection, refreshes effective price, and removes zero without a Product lookup", async () => {
    const h = harness();
    await h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 2 });
    const added = await h.svc.addToCart("owner", {
      productId: PRODUCT_ID,
      quantity: 1,
    });
    expect(added.data).toMatchObject({
      subtotal: "0.30",
      items: [{ quantity: 3, unitPrice: "0.10" }],
    });
    h.getProduct.mockReturnValue(
      of({ data: product({ effectivePriceAmount: "0.05" }) }),
    );
    expect(
      (await h.svc.updateCartItem("owner", ITEM_ID, { quantity: 2 })).data
        .total,
    ).toBe("0.10");
    h.getProduct.mockReturnValue(throwError(() => new Error("unavailable")));
    expect(
      (await h.svc.updateCartItem("owner", ITEM_ID, { quantity: 0 })).data,
    ).toMatchObject({ items: [], total: "0.00" });
    expect(h.tx.$queryRaw).toHaveBeenCalledWith(
      expect.anything(),
      "nebula-cart:owner",
    );
  });

  it("stores authoritative variant facts and denies ambiguous base input", async () => {
    const h = harness(variantProduct());
    await expect(
      h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 }),
    ).rejects.toThrow("product_variant_required");
    const added = await h.svc.addToCart("owner", {
      productId: PRODUCT_ID,
      variantId: VARIANT_ID,
      quantity: 2,
    });
    expect(added.data).toMatchObject({
      total: "14.50",
      items: [
        {
          variantId: VARIANT_ID,
          selectedOptions: { colour: "Blue" },
          sku: "DESK-BLUE",
        },
      ],
    });
    // Checkout's full variant snapshot replacement is covered in checkout.unit.spec.ts.
  });

  it("checks combined stock and rolls back overflow without changing existing rows", async () => {
    const h = harness(product({ stockQuantity: 2 }));
    await h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 2 });
    const before = h.stored();
    await expect(
      h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 }),
    ).rejects.toThrow("cart_insufficient_stock");
    expect(h.stored()).toEqual(before);
    const huge = harness(
      product({ effectivePriceAmount: "9999999999999999.99" }),
    );
    await expect(
      huge.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 2 }),
    ).rejects.toThrow("cart_amount_out_of_range");
    expect(huge.stored()).toBeNull();
  });

  it("rejects invalid owner-boundary input before transactions and RPCs", async () => {
    const h = harness();
    await expect(
      h.svc.addToCart("owner", { productId: "bad", quantity: 1 }),
    ).rejects.toThrow("product_id_invalid");
    await expect(
      h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: -1 }),
    ).rejects.toThrow("cart_quantity_invalid");
    await expect(
      h.svc.updateCartItem("owner", ITEM_ID, { quantity: -1 }),
    ).rejects.toThrow("cart_quantity_invalid");
    expect(h.getProduct).not.toHaveBeenCalled();
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cannot update/remove another cart's item and does not create a cart on missing-item edits", async () => {
    const h = harness();
    await h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 });
    const before = h.stored();
    h.tx.cart.create.mockClear();
    await expect(
      h.svc.updateCartItem("other", ITEM_ID, { quantity: 1 }),
    ).rejects.toThrow("cart_item_not_found");
    await expect(h.svc.removeCartItem("other", ITEM_ID)).rejects.toThrow(
      "cart_item_not_found",
    );
    expect(h.tx.cart.create).not.toHaveBeenCalled();
    expect(h.stored()).toEqual(before);
    expect(h.tx.cart.findUnique).toHaveBeenCalledWith({
      where: { userId: "other" },
      include: { items: true },
    });
  });

  it("cleans populated expired carts child-first and denies expired checkout", async () => {
    const h = harness();
    await h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 });
    h.setCart({ ...h.stored()!, expiresAt: new Date(Date.now() - 1) });
    await expect(
      h.svc.checkout("owner", "cart-expired-checkout-key"),
    ).rejects.toThrow("cart_empty");
    expect(h.tx.order.create).not.toHaveBeenCalled();
    const empty = await h.svc.getCartForUser("owner");
    expect(empty.data).toMatchObject({ items: [], total: "0.00" });
    expect(h.tx.cartItem.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      h.tx.cart.delete.mock.invocationCallOrder[0],
    );
  });

  it("assigns configured TTL to a legacy null-expiry cart without rewriting its items", async () => {
    const h = harness();
    await h.svc.addToCart("owner", { productId: PRODUCT_ID, quantity: 1 });
    const before = h.stored()!;
    h.setCart({ ...before, expiresAt: null });
    const result = await h.svc.getCartForUser("owner");
    expect(result.data.items).toMatchObject([
      { quantity: 1, unitPrice: "0.10" },
    ]);
    expect(result.data.expiresAt).toMatch(/^\d{4}-/);
    expect(h.stored()!.items).toEqual(before.items);
    expect(h.tx.cart.delete).not.toHaveBeenCalled();
  });
});
