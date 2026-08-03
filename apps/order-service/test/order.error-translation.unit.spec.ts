import { status } from "@grpc/grpc-js";
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
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

function productClient(error: unknown): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue({
      GetProduct: jest.fn().mockReturnValue(throwError(() => error)),
    }),
  } as unknown as ClientGrpc;
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
