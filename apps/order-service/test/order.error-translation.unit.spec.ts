import { Metadata, status } from "@grpc/grpc-js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import type { ProductProxy } from "@nebula/clients";
import {
  createVerifiedServiceDownstreamContext,
  decodeS2SSignedContext,
  type MetadataWithContext,
} from "@nebula/grpc-auth";
import { of, throwError, Observable } from "rxjs";
import { OrderStatus } from "../prisma/generated/client";
import type { PrismaService } from "../src/prisma.service";
import { OrderService } from "../src/order/order.service";
import { CHECKOUT_RPC_MS } from "../src/order/checkout-attempt-contract";

const PRODUCT_ID = "451c1290-8074-4fca-b748-4116592e7875";

function transactional(prisma: PrismaService): PrismaService {
  Object.assign(prisma, {
    checkoutAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn((work: (tx: PrismaService) => unknown) =>
      work(prisma),
    ),
  });
  return prisma;
}

const previousServiceName = process.env.SVC_NAME;
const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

function settingsClient(
  getString = jest.fn().mockReturnValue(of({ value: "" })),
) {
  return {
    getService: jest.fn().mockReturnValue({
      GetString: getString,
      SetString: jest.fn(),
      DeleteString: jest.fn(),
      EnsureBootstrapString: jest.fn(),
    }),
  } as unknown as ClientGrpc;
}

function productClientWith(
  getProduct: (
    request: { id: string },
    metadata?: Metadata,
  ) => Observable<unknown>,
): ClientGrpc {
  const unused = jest.fn().mockReturnValue(of({}));
  const methods = {
    UpdateImageMetadata: unused,
    ReserveCheckoutStock: unused,
    FinalizeCheckoutStock: unused,
    CancelCheckoutStock: unused,
    RestoreCheckoutStock: unused,
    CreateProduct: unused,
    UpdateProduct: unused,
    GetProduct: getProduct,
    ListProducts: unused,
    AdminGetProduct: unused,
    AdminListProducts: unused,
    CreateVariant: unused,
    UpdateVariant: unused,
    DeleteVariant: unused,
    DeleteProduct: unused,
    RestoreProduct: unused,
    HardDeleteProduct: unused,
    ApplyDiscountBulk: unused,
    AddImages: unused,
    ListGallery: unused,
    AdminListGallery: unused,
    ReorderImages: unused,
    RemoveImage: unused,
  } satisfies Record<keyof ProductProxy, typeof unused | typeof getProduct>;
  return {
    getService: jest.fn().mockReturnValue(methods),
  } as unknown as ClientGrpc;
}

function productClient(error: unknown): ClientGrpc {
  return productClientWith(() => throwError(() => error));
}

describe("order downstream error translation", () => {
  it("bounds a stalled TTL read and preserves the existing 30-minute Cart fallback", async () => {
    jest.useFakeTimers();
    try {
      let unsubscribed = false;
      const stalled = new Observable<never>(() => () => {
        unsubscribed = true;
      });
      const create = jest.fn(
        ({ data }: { data: { expiresAt: Date; currency: string } }) => ({
          id: "cart-id",
          userId: "user-id",
          ...data,
          items: [],
        }),
      );
      const prisma = {
        cart: { findUnique: jest.fn().mockResolvedValue(null), create },
      } as unknown as PrismaService;
      const service = new OrderService(
        transactional(prisma),
        productClient(new Error("unused")),
        settingsClient(
          jest.fn(({ namespace }: { namespace: string }) =>
            namespace === "pricing"
              ? of({ found: true, value: "USD" })
              : stalled,
          ),
        ),
      );
      service.onModuleInit();
      const pending = service.getCartForUser("user-id");
      await jest.advanceTimersByTimeAsync(CHECKOUT_RPC_MS);
      const result = await pending;
      expect(unsubscribed).toBe(true);
      expect(result.data.expiresAt).toBe(
        new Date(Date.now() + 30 * 60_000).toISOString(),
      );
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
  beforeAll(() => {
    process.env.SVC_NAME = "order-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "product-service": {
        id: "order-product-test-v1",
        secret: "test-order-to-product-key-0000000000001",
      },
      "settings-service": {
        id: "order-settings-test-v1",
        secret: "test-order-to-settings-key-0000000000001",
      },
    });
  });

  afterAll(() => {
    if (previousServiceName === undefined) {
      delete process.env.SVC_NAME;
    } else {
      process.env.SVC_NAME = previousServiceName;
    }

    if (previousOutboundKeys === undefined) {
      delete process.env.S2S_OUTBOUND_KEYS;
    } else {
      process.env.S2S_OUTBOUND_KEYS = previousOutboundKeys;
    }
  });

  it.each([
    {
      code: status.NOT_FOUND,
      details: "product_not_found",
      exception: NotFoundException,
    },
    {
      code: status.UNAVAILABLE,
      details: "product_unavailable",
      exception: ServiceUnavailableException,
    },
  ])(
    "maps product-service status $code without masking it",
    async ({ code, details, exception }) => {
      const prisma = {
        cart: {
          findUnique: jest.fn().mockResolvedValue({
            id: "cart-id",
            userId: "user-id",
            currency: "USD",
            expiresAt: new Date(Date.now() + 60_000),
            items: [],
          }),
        },
      } as unknown as PrismaService;
      const service = new OrderService(
        transactional(prisma),
        productClient({ code, details }),
        settingsClient(),
      );
      service.onModuleInit();

      await expect(
        service.addToCart("user-id", {
          productId: PRODUCT_ID,
          quantity: 1,
        }),
      ).rejects.toBeInstanceOf(exception);
    },
  );

  it("preserves the intentional 30-minute TTL fallback", async () => {
    const now = Date.now();
    const create = jest
      .fn()
      .mockImplementation(
        ({ data }: { data: { expiresAt: Date; currency: string } }) => ({
          id: "cart-id",
          userId: "user-id",
          currency: data.currency,
          expiresAt: data.expiresAt,
          items: [],
        }),
      );
    const prisma = {
      cart: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;
    const getString = jest.fn(({ namespace }: { namespace: string }) =>
      namespace === "pricing"
        ? of({ found: true, value: "USD" })
        : throwError(() => ({ code: status.UNAVAILABLE })),
    );
    const service = new OrderService(
      transactional(prisma),
      productClient(new Error("unused")),
      settingsClient(getString),
    );
    service.onModuleInit();

    await service.getCartForUser("user-id");

    const expiresAt = create.mock.calls[0]?.[0].data.expiresAt as Date;
    expect(create.mock.calls[0]?.[0].data.currency).toBe("USD");
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + 29 * 60_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 31 * 60_000);
  });

  it("creates a cart in the configured non-USD shop currency", async () => {
    const create = jest.fn(({ data }: { data: { currency: string } }) =>
      Promise.resolve({ id: "cart-id", userId: "user-id", items: [], ...data }),
    );
    const prisma = {
      cart: { findUnique: jest.fn().mockResolvedValue(null), create },
    } as unknown as PrismaService;
    const getString = jest.fn(({ namespace }: { namespace: string }) =>
      of(
        namespace === "pricing"
          ? { found: true, value: " rial " }
          : { found: true, value: "30" },
      ),
    );
    const service = new OrderService(
      transactional(prisma),
      productClient(new Error("unused")),
      settingsClient(getString),
    );
    service.onModuleInit();

    await expect(service.getCartForUser("user-id")).resolves.toMatchObject({
      data: { currency: "RIAL" },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ currency: "RIAL" }),
      include: { items: true },
    });
  });

  it("does not create a cart when shop currency is unavailable", async () => {
    const create = jest.fn();
    const prisma = {
      cart: { findUnique: jest.fn().mockResolvedValue(null), create },
    } as unknown as PrismaService;
    const service = new OrderService(
      transactional(prisma),
      productClient(new Error("unused")),
      settingsClient(
        jest.fn().mockReturnValue(of({ found: false, value: "" })),
      ),
    );
    service.onModuleInit();

    await expect(service.getCartForUser("user-id")).rejects.toEqual(
      new ServiceUnavailableException("shop_currency_not_configured"),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("re-signs nested product and settings calls with the verified ingress context", async () => {
    const cart = {
      id: "cart-id",
      userId: "user-id",
      currency: "USD",
      expiresAt: new Date(Date.now() + 60_000),
      items: [],
    };
    const prisma = {
      cart: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(cart)
          .mockResolvedValueOnce({ ...cart, items: [{ id: "item-id" }] }),
        update: jest.fn().mockImplementation(() =>
          Promise.resolve({
            ...cart,
            items: [
              {
                id: "item-id",
                productId: PRODUCT_ID,
                variantId: null,
                selectionKey: `base:${PRODUCT_ID}`,
                selectedOptions: {},
                sku: "PRODUCT-1",
                name: "Product",
                quantity: 1,
                unitPrice: "10.00",
                meta: null,
              },
            ],
          }),
        ),
      },
      cartItem: {
        create: jest.fn().mockResolvedValue({ id: "item-id" }),
      },
    } as unknown as PrismaService;
    const getProduct = jest.fn().mockReturnValue(
      of({
        data: {
          id: PRODUCT_ID,
          title: "Product",
          price: 10,
          currency: "USD",
          effectivePriceAmount: "10.00",
          status: "ACTIVE",
          selectionMode: "BASE",
          availability: "AVAILABLE",
          trackInventory: false,
          stockQuantity: 0,
          sku: "PRODUCT-1",
        },
      }),
    );
    const getString = jest.fn(({ namespace }: { namespace: string }) =>
      of(
        namespace === "pricing"
          ? { found: true, value: "USD" }
          : { found: true, value: "30" },
      ),
    );
    const service = new OrderService(
      transactional(prisma),
      productClientWith(getProduct),
      settingsClient(getString),
    );
    service.onModuleInit();

    const inbound = new Metadata() as MetadataWithContext;
    inbound.svc = "gateway";
    inbound.svcKind = "gateway";
    inbound.requestId = "req-cart-add-1";
    inbound.requestContext = {
      applicationId: "admin-web",
      tenantId: "tenant-main",
      siteId: "site-main",
      channelId: "browser",
    };
    inbound.signedActor = {
      userId: "user-id",
      role: "user",
      sessionRef: "session-1",
    };
    inbound.user = inbound.signedActor;
    inbound.set("authorization", "Bearer verified-token");
    inbound.set("x-untrusted", "discard-me");
    const downstream = createVerifiedServiceDownstreamContext(inbound);

    await service.addToCart(
      "user-id",
      { productId: PRODUCT_ID, quantity: 1 },
      downstream,
    );

    const productMetadata = getProduct.mock.calls[0]?.[1] as Metadata;
    const settingsMetadata = (
      getString.mock.calls[0] as unknown as [unknown, Metadata]
    )[1];
    for (const [metadata, target, keyId] of [
      [productMetadata, "product-service", "order-product-test-v1"],
      [settingsMetadata, "settings-service", "order-settings-test-v1"],
    ] as const) {
      expect(metadata.get("x-s2s-version")).toEqual(["3"]);
      expect(metadata.get("x-s2s-kind")).toEqual(["service"]);
      expect(metadata.get("x-svc")).toEqual(["order-service"]);
      expect(metadata.get("x-s2s-target")).toEqual([target]);
      expect(metadata.get("x-s2s-key-id")).toEqual([keyId]);
      expect(metadata.get("x-request-id")).toEqual(["req-cart-add-1"]);
      expect(metadata.get("authorization")).toEqual(["Bearer verified-token"]);
      expect(metadata.get("x-untrusted")).toEqual([]);
      const encoded = metadata.get("x-s2s-context")[0];
      expect(typeof encoded).toBe("string");
      expect(decodeS2SSignedContext(String(encoded)).context).toEqual({
        version: "1",
        ...inbound.requestContext,
        actor: inbound.signedActor,
      });
    }
    expect(productMetadata.get("x-s2s-nonce")[0]).not.toBe(
      settingsMetadata.get("x-s2s-nonce")[0],
    );
  });

  it("denies a missing Product currency before adding a cart item", async () => {
    const cartItemCreate = jest.fn();
    const prisma = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: "cart-id",
          userId: "user-id",
          currency: "USD",
          expiresAt: new Date(Date.now() + 60_000),
          items: [],
        }),
      },
      cartItem: { create: cartItemCreate },
    } as unknown as PrismaService;
    const service = new OrderService(
      transactional(prisma),
      productClientWith(() =>
        of({ data: { id: PRODUCT_ID, price: 10, currency: "" } }),
      ),
      settingsClient(
        jest.fn().mockReturnValue(of({ found: true, value: "USD" })),
      ),
    );
    service.onModuleInit();

    await expect(
      service.addToCart("user-id", { productId: PRODUCT_ID, quantity: 1 }),
    ).rejects.toEqual(new BadRequestException("product_currency_mismatch"));
    expect(cartItemCreate).not.toHaveBeenCalled();
  });

  it("denies checkout when shop currency changes before order creation", async () => {
    const orderCreate = jest.fn();
    const prisma = {
      checkoutReceipt: { findUnique: jest.fn().mockResolvedValue(null) },
      checkoutAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: "cart-id",
          userId: "user-id",
          currency: "USD",
          items: [{ id: "item-id", unitPrice: 10, quantity: 1 }],
        }),
      },
      order: { create: orderCreate },
    } as unknown as PrismaService;
    const service = new OrderService(
      transactional(prisma),
      productClient(new Error("unused")),
      settingsClient(
        jest.fn().mockReturnValue(of({ found: true, value: "EUR" })),
      ),
    );
    service.onModuleInit();

    await expect(
      service.checkout("user-id", "currency-checkout-key"),
    ).rejects.toEqual(new ConflictException("cart_currency_mismatch"));
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("maps a missing admin status-update target to not found", async () => {
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const unusedClient = {} as ClientGrpc;
    Object.assign(prisma, {
      $queryRaw: jest.fn().mockResolvedValue([]),
      orderStatusChange: { findUnique: jest.fn().mockResolvedValue(null) },
      orderCancellation: { findUnique: jest.fn().mockResolvedValue(null) },
      demoPaymentAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((work: (tx: PrismaService) => unknown) =>
        work(prisma),
      ),
    });
    const service = new OrderService(prisma, unusedClient, unusedClient);

    await expect(
      service.updateOrderStatusAdmin(
        "11111111-1111-4111-8111-111111111111",
        { status: OrderStatus.PAID, expectedVersion: 1 },
        "status-missing-unit-key",
        { userId: "11111111-1111-4111-8111-111111111112", role: "admin" },
      ),
    ).rejects.toEqual(new NotFoundException("order_not_found"));
  });
});
