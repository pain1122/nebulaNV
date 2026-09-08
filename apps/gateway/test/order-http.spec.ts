import { type INestApplication } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import type { StructuredLogger } from "@packages/config";
import request from "supertest";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import { configureGatewayHttp } from "../src/http/configure-http";
import { GatewayRoutePolicyInterceptor } from "../src/http/gateway-route-policy";
import { GatewayOrderApiService } from "../src/order/gateway-order-api.service";
import { GatewayOrderController } from "../src/order/gateway-order.controller";
import { GatewayIdempotencyService } from "../src/state/gateway-idempotency.service";
import { TEST_ADMIN_IDENTITY_HEADERS, TEST_APPLICATION_REGISTRY_JSON } from "./application-fixture";

const ID = "cc2021df-562b-433d-a749-26cc16487ab4";
const PRODUCT_ID = "28ed8f3d-981f-48c0-a2bf-3922de1af08c";
const KEY = "018f6b70-19a2-7b90-a8ab-123456789abc";

function quietLogger(): StructuredLogger {
  return { debug: jest.fn(), error: jest.fn(), log: jest.fn(), warn: jest.fn() };
}

describe("gateway Order HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let orders: Record<string, jest.Mock>;
  const registry = StaticApplicationRegistry.fromJson(TEST_APPLICATION_REGISTRY_JSON, { nodeEnv: "test" });

  beforeEach(async () => {
    actorRole = "user";
    orders = {
      getCart: jest.fn().mockResolvedValue({ id: ID, userId: "user-1", items: [] }),
      addToCart: jest.fn().mockResolvedValue({ id: ID, userId: "user-1", items: [] }),
      updateCartItem: jest.fn(), removeCartItem: jest.fn(), checkout: jest.fn(),
      list: jest.fn().mockResolvedValue([]), get: jest.fn(), updateStatus: jest.fn().mockResolvedValue({ id: ID }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayOrderController],
      providers: [
        Reflector, { provide: GatewayOrderApiService, useValue: orders },
        {
          provide: GatewayAuthResolver,
          useValue: { resolve: jest.fn().mockImplementation(() => Promise.resolve({
            kind: "authenticated",
            identity: { userId: "user-1", role: actorRole, sessionRef: "session-1" },
          })) },
        },
        {
          provide: GatewayIdempotencyService,
          useValue: {
            begin: jest.fn().mockResolvedValue({
              kind: "started",
              lease: { storageKey: "key", requestHash: "a".repeat(64), serializedInFlight: "state" },
            }),
            complete: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, { applicationRegistry: registry, jsonLimitBytes: 262_144, logger: quietLogger(), nodeEnv: "test" });
    await app.init();
  });

  afterEach(async () => app.close());

  it("rejects caller-selected user identity and requires a user actor", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/orders/cart/items")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer user-token")
      .set("Idempotency-Key", KEY)
      .send({ productId: PRODUCT_ID, quantity: 1, userId: "victim" })
      .expect(400);
    expect(orders.addToCart).not.toHaveBeenCalled();

    actorRole = "admin";
    await request(app.getHttpServer())
      .get("/api/v1/orders/cart")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer admin-token")
      .expect(403);
  });

  it("allows the consumer applications but not admin-web on personal routes", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/orders")
      .set({ "X-Nebula-Client-ID": "mobile-local" })
      .set("Authorization", "Bearer user-token")
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/v1/orders")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer user-token")
      .expect(403);
    expect(orders.list).toHaveBeenCalledTimes(1);
  });

  it("keeps admin status as the only selected admin Order operation", async () => {
    actorRole = "admin";
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${ID}/status`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", KEY)
      .send({ status: "PAID" })
      .expect(200);
    expect(orders.updateStatus).toHaveBeenCalledWith(expect.any(Object), ID, "PAID");

    await request(app.getHttpServer())
      .get("/api/v1/admin/orders")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(404);
  });
});
