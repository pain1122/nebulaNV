import { Metadata, status } from "@grpc/grpc-js";
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  createVerifiedServiceDownstreamContext,
  decodeS2SSignedContext,
  type MetadataWithContext,
} from "@nebula/grpc-auth";
import { of, throwError, type Observable } from "rxjs";
import { OrderStatus } from "../prisma/generated/client";
import type { PrismaService } from "../src/prisma.service";
import { OrderService } from "../src/order/order.service";

const MISSING_ID = "00000000-0000-0000-0000-000000000000";
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
  return {
    getService: jest.fn().mockReturnValue({
      CreateProduct: unused,
      UpdateProduct: unused,
      GetProduct: getProduct,
      ListProducts: unused,
      AdminGetProduct: unused,
      AdminListProducts: unused,
      DeleteProduct: unused,
      RestoreProduct: unused,
      HardDeleteProduct: unused,
      ApplyDiscountBulk: unused,
      AddImages: unused,
      ListGallery: unused,
      AdminListGallery: unused,
      ReorderImages: unused,
      RemoveImage: unused,
    }),
  } as unknown as ClientGrpc;
}

function productClient(error: unknown): ClientGrpc {
  return productClientWith(() => throwError(() => error));
}

describe("order downstream error translation", () => {
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
        prisma,
        productClient({ code, details }),
        settingsClient(),
      );
      service.onModuleInit();

      await expect(
        service.addToCart("user-id", {
          productId: "product-id",
          quantity: 1,
        }),
      ).rejects.toBeInstanceOf(exception);
    },
  );

  it("preserves the intentional 30-minute TTL fallback", async () => {
    const now = Date.now();
    const create = jest
      .fn()
      .mockImplementation(({ data }: { data: { expiresAt: Date } }) => ({
        id: "cart-id",
        userId: "user-id",
        currency: data.expiresAt ? "USD" : "",
        expiresAt: data.expiresAt,
        items: [],
      }));
    const prisma = {
      cart: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;
    const getString = jest
      .fn()
      .mockReturnValue(throwError(() => ({ code: status.UNAVAILABLE })));
    const service = new OrderService(
      prisma,
      productClient(new Error("unused")),
      settingsClient(getString),
    );
    service.onModuleInit();

    await service.getCartForUser("user-id");

    const expiresAt = create.mock.calls[0]?.[0].data.expiresAt as Date;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + 29 * 60_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 31 * 60_000);
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
        update: jest.fn().mockResolvedValue(cart),
      },
      cartItem: {
        create: jest.fn().mockResolvedValue({ id: "item-id" }),
      },
    } as unknown as PrismaService;
    const getProduct = jest.fn().mockReturnValue(
      of({
        data: {
          id: "product-id",
          title: "Product",
          price: 10,
          currency: "USD",
        },
      }),
    );
    const getString = jest.fn().mockReturnValue(of({ value: "30" }));
    const service = new OrderService(
      prisma,
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
      { productId: "product-id", quantity: 1 },
      downstream,
    );

    const productMetadata = getProduct.mock.calls[0]?.[1] as Metadata;
    const settingsMetadata = getString.mock.calls[0]?.[1] as Metadata;
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

  it("maps a missing admin status-update target to not found", async () => {
    const prisma = {
      order: {
        update: jest.fn().mockRejectedValue({ code: "P2025" }),
      },
    } as unknown as PrismaService;
    const unusedClient = {} as ClientGrpc;
    const service = new OrderService(prisma, unusedClient, unusedClient);

    await expect(
      service.updateOrderStatusAdmin(MISSING_ID, OrderStatus.PAID),
    ).rejects.toEqual(new NotFoundException("order_not_found"));
  });
});
