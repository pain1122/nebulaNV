import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { Prisma, type CheckoutReceipt } from "../../prisma/generated/client";
import { OrderService } from "../../src/order/order.service";
import type { PrismaService } from "../../src/prisma.service";
import type { CartProduct, StoredCart } from "../../src/order/cart-contract";
import { PRODUCT_ID, VARIANT_ID, product } from "./cart.fixture";
import { storedOrder } from "./order.fixture";
import { attemptStore } from "./checkout-attempt.fixture";
export function harness(initialProduct: CartProduct = product()) {
  let authority = initialProduct;
  let productFailure: unknown;
  let currency = "USD";
  let mutateDuringQuote: (() => void) | undefined;
  let order = storedOrder();
  const receipts: CheckoutReceipt[] = [];
  const attempts = attemptStore();
  const receiptCreate = jest.fn(({ data }: { data: CheckoutReceipt }) => {
    const row = { ...data, id: VARIANT_ID };
    receipts.push(row);
    return Promise.resolve(row);
  });
  const receiptFind = jest.fn(
    ({
      where,
    }: {
      where: { userId_keyHash: { userId: string; keyHash: string } };
    }) =>
      Promise.resolve(
        receipts.find(
          (row) =>
            row.userId === where.userId_keyHash.userId &&
            row.keyHash === where.userId_keyHash.keyHash,
        ) ?? null,
      ),
  );
  let cart: StoredCart | null = {
    id: VARIANT_ID,
    userId: "owner",
    currency,
    expiresAt: new Date(Date.now() + 60000),
    createdAt: new Date(),
    updatedAt: new Date(),
    identityRealmId: null,
    subjectId: null,
    items: [
      {
        id: PRODUCT_ID,
        cartId: VARIANT_ID,
        productId: PRODUCT_ID,
        variantId:
          initialProduct.selectionMode === "VARIANT" ? VARIANT_ID : null,
        selectionKey:
          initialProduct.selectionMode === "VARIANT"
            ? `variant:${VARIANT_ID}`
            : `base:${PRODUCT_ID}`,
        selectedOptions:
          initialProduct.selectionMode === "VARIANT" ? { colour: "Blue" } : {},
        sku: initialProduct.selectionMode === "VARIANT" ? "DESK-BLUE" : "DESK",
        name: "Desk",
        quantity: 2,
        unitPrice: new Prisma.Decimal(
          initialProduct.selectionMode === "VARIANT" ? "7.25" : "0.10",
        ),
        meta: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
  const create = jest.fn(
    ({
      data,
    }: {
      data: {
        id: string;
        orderNumber: string;
        currency: string;
        subtotal: string;
        total: string;
        meta?: { note: string };
        items: {
          create: {
            productId: string;
            variantId: string | null;
            selectedOptions: Record<string, string>;
            sku: string;
            name: string;
            quantity: number;
            unitPrice: string;
            lineTotal: string;
          }[];
        };
      };
    }) => {
      order = storedOrder({
        id: data.id,
        orderNumber: data.orderNumber,
        currency: data.currency,
        subtotal: new Prisma.Decimal(data.subtotal),
        total: new Prisma.Decimal(data.total),
        meta: data.meta ?? null,
        items: data.items.create.map((item, index) => ({
          ...storedOrder().items[0],
          ...item,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.lineTotal),
          id: `item-${index}`,
        })),
      });
      return Promise.resolve(order);
    },
  );
  const clear = jest.fn(() => {
    cart = null;
    return Promise.resolve();
  });
  const tx = {
    checkoutAttempt: attempts.delegate,
    checkoutReceipt: {
      findUnique: receiptFind,
      create: receiptCreate,
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { orderId: string };
          data: { createdAt: Date; replayUntil: Date };
        }) => {
          const row = receipts.find(
            (entry) => entry.orderId === where.orderId,
          )!;
          Object.assign(row, data);
          return Promise.resolve(row);
        },
      ),
    },
    $queryRaw: jest.fn(),
    cart: { findUnique: jest.fn(() => Promise.resolve(cart)), delete: clear },
    cartItem: { deleteMany: jest.fn() },
    order: {
      create,
      findFirst: jest.fn(() => Promise.resolve(order)),
      findMany: jest.fn(() => Promise.resolve([order])),
      update: jest.fn(() => Promise.resolve(order)),
    },
  };
  const transaction = jest.fn(
    async (work: (value: typeof tx) => Promise<unknown>) => work(tx),
  );
  const getProduct = jest.fn(() => {
    mutateDuringQuote?.();
    return productFailure
      ? throwError(() => productFailure)
      : of({ data: authority });
  });
  const stock = {
    reserve: jest.fn((identity: { intentId: string; payloadHash: string }) =>
      of({ ...identity, state: "HELD" }),
    ),
    finalize: jest.fn((identity: { intentId: string; payloadHash: string }) =>
      of({ ...identity, state: "FINALIZED" }),
    ),
    cancel: jest.fn((identity: { intentId: string; payloadHash: string }) =>
      of({ ...identity, state: "CANCELLED" }),
    ),
  };
  const svc = new OrderService(
    { ...tx, $transaction: transaction } as unknown as PrismaService,
    {} as ClientGrpc,
    {} as ClientGrpc,
  );
  Object.assign(svc, {
    productSvc: {
      GetProduct: getProduct,
      ReserveCheckoutStock: stock.reserve,
      FinalizeCheckoutStock: stock.finalize,
      CancelCheckoutStock: stock.cancel,
      RestoreCheckoutStock: () => {
        throw new Error("unexpected_restore_call");
      },
    },
    settingsSvc: { GetString: () => of({ found: true, value: currency }) },
  });
  return {
    tx,
    attempts,
    stock,
    svc,
    create,
    clear,
    transaction,
    getProduct,
    receipts,
    receiptCreate,
    receiptFind,
    cart: () => cart,
    order: () => order,
    change: (value: CartProduct) => {
      authority = value;
    },
    fail: (value: unknown) => {
      productFailure = value;
    },
    currency: (value: string) => {
      currency = value;
    },
    duringQuote: (work: () => void) => {
      mutateDuringQuote = work;
    },
  };
}
