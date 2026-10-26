import "reflect-metadata";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  ALLOWED_S2S_CALLERS_KEY,
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
} from "@nebula/grpc-auth";
import { checkoutStockHash } from "@nebula/clients";
import { productv1 } from "@nebula/protos";
import { Prisma } from "../prisma/generated";
import type { PrismaService } from "../src/prisma.service";
import { CheckoutStockService } from "../src/product/checkout-stock.service";
import { stockReservation } from "../src/product/checkout-stock-contract";
import { CheckoutStockGrpcController } from "../src/product/grpc/checkout-stock-grpc.controller";
import type { ProductServiceImpl } from "../src/product/product.service";

const productId = "fd100000-0000-4000-8000-000000000001";
const intentId = "fd200000-0000-4000-8000-000000000001";
const variantId = "fd300000-0000-4000-8000-000000000001";
function request() {
  const facts = {
    currency: "USD",
    lines: [
      {
        productId,
        variantId: "",
        quantity: 2,
        expectedVersion: 1,
        sku: "DESK",
        unitPrice: "7.25",
        selectedOptions: {},
      },
    ],
  };
  return { ...facts, intentId, payloadHash: checkoutStockHash(facts) };
}
function harness() {
  const product = {
    id: productId,
    currency: "USD",
    selectionMode: "BASE",
    sku: "DESK",
    price: new Prisma.Decimal("7.25"),
    trackInventory: true,
    discountActive: false,
    discountType: null,
    discountValue: null,
    discountStart: null,
    discountEnd: null,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    checkoutStockIntent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: intentId,
        payloadHash: request().payloadHash,
        state: "HELD",
      }),
      update: jest.fn().mockResolvedValue({
        id: intentId,
        payloadHash: request().payloadHash,
        state: "CANCELLED",
      }),
    },
    checkoutStockLine: {
      create: jest
        .fn<Promise<unknown>, [Prisma.CheckoutStockLineCreateArgs]>()
        .mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    product: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue({}),
    },
    productVariant: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((run: (value: typeof tx) => unknown) => run(tx)),
  };
  const catalogue = { getPublic: jest.fn().mockResolvedValue({}) };
  const stock = new CheckoutStockService(
    prisma as unknown as PrismaService,
    catalogue as unknown as ProductServiceImpl,
  );
  return { stock, prisma, tx, catalogue, product };
}

describe("Product checkout stock owner", () => {
  it("does not open a transaction when current publication eligibility fails", async () => {
    const { stock, catalogue, prisma } = harness();
    catalogue.getPublic.mockRejectedValue(new Error("dependency_unavailable"));
    await expect(stock.reserve(request())).rejects.toThrow(
      "dependency_unavailable",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    { currency: "EUR" },
    { sku: "CHANGED" },
    { price: new Prisma.Decimal("7.26") },
    { selectionMode: "VARIANT" },
  ])("denies commercial drift before the quantity write: %s", async (drift) => {
    const { stock, tx, product } = harness();
    tx.product.findUniqueOrThrow.mockResolvedValue({ ...product, ...drift });
    await expect(stock.reserve(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.checkoutStockLine.create).not.toHaveBeenCalled();
  });

  it("denies a raced stock depletion rather than recording a hold", async () => {
    const { stock, tx } = harness();
    tx.product.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await expect(stock.reserve(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.checkoutStockLine.create).not.toHaveBeenCalled();
  });
  it.each(["reserve", "finalize", "cancel", "restore"])(
    "%s is signed internal Order-only with no admin actor requirement",
    (method) => {
      const handler: unknown = Object.getOwnPropertyDescriptor(
        CheckoutStockGrpcController.prototype,
        method,
      )?.value;
      expect(typeof handler).toBe("function");
      if (typeof handler !== "function")
        throw new Error("stock_receiver_missing");
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(INTERNAL_ONLY_KEY, handler)).toBe(true);
      expect(Reflect.getMetadata(ALLOWED_S2S_CALLERS_KEY, handler)).toEqual([
        "order-service",
      ]);
    },
  );

  it("roundtrips exact amounts/base options through the actual codec", () => {
    const decoded = productv1.ReserveCheckoutStockRequest.decode(
      productv1.ReserveCheckoutStockRequest.encode(
        productv1.ReserveCheckoutStockRequest.create(request()),
      ).finish(),
    );
    expect(stockReservation(decoded)).toEqual(request());
    const response = productv1.CheckoutStockResponse.decode(
      productv1.CheckoutStockResponse.encode(
        productv1.CheckoutStockResponse.create({
          intentId,
          payloadHash: request().payloadHash,
          state: "HELD",
        }),
      ).finish(),
    );
    expect(response).toMatchObject({
      intentId,
      payloadHash: request().payloadHash,
      state: "HELD",
    });
    expect(() =>
      stockReservation(productv1.ReserveCheckoutStockRequest.create()),
    ).toThrow(BadRequestException);
  });

  it.each([0, -1, 1.5, 2_147_483_648, null, "2"])(
    "rejects quantity %s before any persistence",
    async (quantity) => {
      const { stock, prisma } = harness();
      const input = request();
      await expect(
        stock.reserve({ ...input, lines: [{ ...input.lines[0], quantity }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects changed hash, repeated selections and nonexact money", () => {
    const input = request();
    expect(() =>
      stockReservation({ ...input, payloadHash: "b".repeat(64) }),
    ).toThrow(BadRequestException);
    expect(() =>
      stockReservation({ ...input, lines: [...input.lines, ...input.lines] }),
    ).toThrow(BadRequestException);
    expect(() =>
      stockReservation({
        ...input,
        lines: [{ ...input.lines[0], unitPrice: "7.2" }],
      }),
    ).toThrow(BadRequestException);
    expect(() => stockReservation({ ...input, lines: [] })).toThrow(
      BadRequestException,
    );
    expect(() =>
      stockReservation({
        ...input,
        lines: Array.from({ length: 101 }, () => input.lines[0]),
      }),
    ).toThrow(BadRequestException);
  });

  it("hashes selections and options independently of property/list order", () => {
    const first = {
      ...request().lines[0],
      variantId,
      selectedOptions: { Size: "M", Color: "Blue" },
    };
    const second = { ...first, variantId: intentId };
    expect(checkoutStockHash({ currency: "USD", lines: [first, second] })).toBe(
      checkoutStockHash({
        currency: "USD",
        lines: [
          { ...second, selectedOptions: { Color: "Blue", Size: "M" } },
          first,
        ],
      }),
    );
    expect(checkoutStockHash({ currency: "USD", lines: [first] })).not.toBe(
      checkoutStockHash({
        currency: "USD",
        lines: [{ ...first, quantity: 3 }],
      }),
    );
  });

  it("quotes before opening the transaction then claims version and decrements exact base quantity", async () => {
    const { stock, tx, catalogue } = harness();
    await expect(stock.reserve(request())).resolves.toMatchObject({
      state: "HELD",
    });
    expect(catalogue.getPublic).toHaveBeenCalledWith(productId);
    expect(tx.product.updateMany).toHaveBeenLastCalledWith({
      where: { id: productId, stockQuantity: { gte: 2 } },
      data: { stockQuantity: { decrement: 2 } },
    });
    expect(tx.checkoutStockLine.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        tracked: true,
        heldProductId: productId,
        heldVariantId: null,
        quantity: 2,
      },
    });
  });

  it("preserves zero numeric overrides and discounts in variant price checks", async () => {
    const { stock, tx, product } = harness();
    tx.product.findUniqueOrThrow.mockResolvedValue({
      ...product,
      selectionMode: "VARIANT",
      discountActive: true,
      discountType: "FIXED",
      discountValue: new Prisma.Decimal(1),
    });
    tx.productVariant.findFirst.mockResolvedValue({
      id: variantId,
      sku: "ZERO",
      priceOverride: new Prisma.Decimal(0),
      options: { Color: "Blue" },
    });
    const facts = {
      currency: "USD",
      lines: [
        {
          ...request().lines[0],
          variantId,
          sku: "ZERO",
          unitPrice: "0.00",
          selectedOptions: { Color: "Blue" },
        },
      ],
    };
    await stock.reserve({
      ...facts,
      intentId,
      payloadHash: checkoutStockHash(facts),
    });
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: variantId, productId, stockQuantity: { gte: 2 } },
      data: { stockQuantity: { decrement: 2 } },
    });
  });

  it("unmanaged inventory creates a hold without a quantity decrement", async () => {
    const { stock, tx, product } = harness();
    tx.product.findUniqueOrThrow.mockResolvedValue({
      ...product,
      trackInventory: false,
    });
    await stock.reserve(request());
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.checkoutStockLine.create.mock.calls[0]?.[0]).toMatchObject({
      data: { tracked: false, heldProductId: productId },
    });
  });

  it.each(["HELD", "FINALIZED", "CANCELLED"])(
    "reserve replays %s without current availability or another decrement",
    async (state) => {
      const { stock, tx, catalogue } = harness();
      tx.checkoutStockIntent.findUnique.mockResolvedValue({
        id: intentId,
        payloadHash: request().payloadHash,
        state,
      });
      expect((await stock.reserve(request())).state).toBe(state);
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(catalogue.getPublic).not.toHaveBeenCalled();
    },
  );

  it("cancel before reserve creates a permanent tombstone; finalize of missing intent conflicts", async () => {
    const { stock, tx } = harness();
    await stock.cancel(request());
    expect(tx.checkoutStockIntent.create).toHaveBeenCalledWith({
      data: {
        id: intentId,
        payloadHash: request().payloadHash,
        state: "CANCELLED",
      },
    });
    await expect(stock.finalize(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it("cancel restores held tracked quantities, detaches protective references and fences version overflow", async () => {
    const { stock, tx } = harness();
    tx.checkoutStockIntent.findUnique.mockResolvedValue({
      id: intentId,
      payloadHash: request().payloadHash,
      state: "HELD",
      lines: [{ productId, variantId: null, quantity: 2, tracked: true }],
    });
    await stock.cancel(request());
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: productId, version: { lt: 2_147_483_647 } },
      data: { version: { increment: 1 } },
    });
    expect(tx.checkoutStockLine.updateMany).toHaveBeenCalledWith({
      where: { intentId },
      data: { heldProductId: null, heldVariantId: null },
    });
  });

  it("finalize does not decrement again and cancel cannot reverse a finalized purchase", async () => {
    const { stock, tx } = harness();
    tx.checkoutStockIntent.findUnique.mockResolvedValue({
      id: intentId,
      payloadHash: request().payloadHash,
      state: "HELD",
      lines: [{ productId, quantity: 2, tracked: true }],
    });
    tx.checkoutStockIntent.update.mockResolvedValue({
      id: intentId,
      payloadHash: request().payloadHash,
      state: "FINALIZED",
    });
    expect((await stock.finalize(request())).state).toBe("FINALIZED");
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
    tx.checkoutStockIntent.findUnique.mockResolvedValue({
      id: intentId,
      payloadHash: request().payloadHash,
      state: "FINALIZED",
    });
    await expect(stock.cancel(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejects changed identity hash and stale parent claim", async () => {
    const { stock, tx } = harness();
    tx.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(stock.reserve(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.checkoutStockLine.create).not.toHaveBeenCalled();
    tx.checkoutStockIntent.findUnique.mockResolvedValue({
      id: intentId,
      payloadHash: "b".repeat(64),
      state: "HELD",
    });
    await expect(stock.reserve(request())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
