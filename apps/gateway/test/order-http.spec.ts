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
import {
  TEST_ADMIN_IDENTITY_HEADERS,
  TEST_APPLICATION_REGISTRY_JSON,
} from "./application-fixture";

const ID = "cc2021df-562b-433d-a749-26cc16487ab4";
const PRODUCT_ID = "28ed8f3d-981f-48c0-a2bf-3922de1af08c";
const KEY = "018f6b70-19a2-7b90-a8ab-123456789abc";

function quietLogger(): StructuredLogger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

describe("gateway Order HTTP routes", () => {
  let app: INestApplication;
  let actorRole: "user" | "admin";
  let orders: Record<string, jest.Mock>;
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  beforeEach(async () => {
    actorRole = "user";
    orders = {
      getCart: jest
        .fn()
        .mockResolvedValue({ id: ID, userId: "user-1", items: [] }),
      addToCart: jest
        .fn()
        .mockResolvedValue({ id: ID, userId: "user-1", items: [] }),
      updateCartItem: jest.fn(),
      removeCartItem: jest.fn(),
      checkout: jest.fn(),
      startDemoPayment: jest
        .fn()
        .mockResolvedValue({ order: { id: ID }, attempt: { mode: "DEMO" } }),
      resolveDemoPayment: jest
        .fn()
        .mockResolvedValue({ order: { id: ID }, attempt: { mode: "DEMO" } }),
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn(),
      adminList: jest
        .fn()
        .mockResolvedValue({ data: [], page: 1, limit: 20, total: 0 }),
      adminGet: jest.fn().mockResolvedValue({ id: ID, userId: PRODUCT_ID }),
      updateStatus: jest.fn().mockResolvedValue({ id: ID }),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [GatewayOrderController],
      providers: [
        Reflector,
        { provide: GatewayOrderApiService, useValue: orders },
        {
          provide: GatewayAuthResolver,
          useValue: {
            resolve: jest.fn().mockImplementation(() =>
              Promise.resolve({
                kind: "authenticated",
                identity: {
                  userId: "user-1",
                  role: actorRole,
                  sessionRef: "session-1",
                },
              }),
            ),
          },
        },
        {
          provide: GatewayIdempotencyService,
          useValue: {
            begin: jest.fn().mockResolvedValue({
              kind: "started",
              lease: {
                storageKey: "key",
                requestHash: "a".repeat(64),
                serializedInFlight: "state",
              },
            }),
            complete: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureGatewayHttp(app, {
      applicationRegistry: registry,
      jsonLimitBytes: 262_144,
      logger: quietLogger(),
      nodeEnv: "test",
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it("restricts demo start/outcome by application and role, validates input and requires keys", async () => {
    const path = `/api/v1/orders/${ID}/demo-payment-attempts`;
    const adminPath = `/api/v1/admin/orders/${ID}/demo-payment-attempts/${PRODUCT_ID}/outcome`;
    const userHeaders = {
      "X-Nebula-Client-ID": "mobile-local",
      Authorization: "Bearer user-token",
      "Idempotency-Key": KEY,
    };
    const adminHeaders = {
      ...TEST_ADMIN_IDENTITY_HEADERS,
      Authorization: "Bearer admin-token",
      "Idempotency-Key": KEY,
    };
    for (const body of [
      {},
      { expectedVersion: null },
      { expectedVersion: "1" },
      { expectedVersion: 2147483646 },
      { expectedVersion: 1, userId: ID },
      { expectedVersion: 1, amount: "0.00" },
    ])
      await request(app.getHttpServer())
        .post(path)
        .set(userHeaders)
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set({
        "X-Nebula-Client-ID": "mobile-local",
        Authorization: "Bearer user-token",
      })
      .send({ expectedVersion: 1 })
      .expect(400);
    await request(app.getHttpServer())
      .post(path.replace(ID, "bad-id"))
      .set(userHeaders)
      .send({ expectedVersion: 1 })
      .expect(400);
    await request(app.getHttpServer())
      .post(path)
      .set(adminHeaders)
      .send({ expectedVersion: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .post(adminPath)
      .set(adminHeaders)
      .send({ expectedVersion: 2, outcome: "FAILED" })
      .expect(403);
    expect(orders.startDemoPayment).not.toHaveBeenCalled();
    expect(orders.resolveDemoPayment).not.toHaveBeenCalled();
    const started = await request(app.getHttpServer())
      .post(path)
      .set(userHeaders)
      .send({ expectedVersion: 1 })
      .expect(201);
    expect(started.body.data.attempt.mode).toBe("DEMO");
    expect(orders.startDemoPayment).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      { expectedVersion: 1 },
    );
    actorRole = "admin";
    await request(app.getHttpServer())
      .post(path)
      .set(userHeaders)
      .send({ expectedVersion: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .post(adminPath)
      .set(userHeaders)
      .send({ expectedVersion: 2, outcome: "FAILED" })
      .expect(403);
    for (const body of [
      { expectedVersion: 2 },
      { expectedVersion: 2, outcome: "PAID" },
      { expectedVersion: 2, outcome: null },
      { expectedVersion: 2147483647, outcome: "FAILED" },
      { expectedVersion: 2, outcome: "FAILED", attemptId: ID },
    ])
      await request(app.getHttpServer())
        .post(adminPath)
        .set(adminHeaders)
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .post(adminPath.replace(PRODUCT_ID, "bad-id"))
      .set(adminHeaders)
      .send({ expectedVersion: 2, outcome: "FAILED" })
      .expect(400);
    expect(orders.resolveDemoPayment).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(adminPath)
      .set(adminHeaders)
      .send({ expectedVersion: 2, outcome: "UNKNOWN" })
      .expect(200);
    expect(orders.resolveDemoPayment).toHaveBeenCalledWith(
      expect.anything(),
      ID,
      PRODUCT_ID,
      { expectedVersion: 2, outcome: "UNKNOWN" },
    );
  });

  it("passes variant identity through the real HTTP DTO and rejects null/overflow quantities", async () => {
    const variantId = "8e2df5b8-f116-4fc8-b229-84abdf9a1830";
    const headers = {
      "X-Nebula-Client-ID": "mobile-local",
      Authorization: "Bearer user-token",
      "Idempotency-Key": KEY,
    };
    for (const changes of [
      { variantId: null },
      { quantity: 2147483648 },
      { quantity: 1.5 },
    ]) {
      await request(app.getHttpServer())
        .post("/api/v1/orders/cart/items")
        .set(headers)
        .send({ productId: PRODUCT_ID, variantId, quantity: 1, ...changes })
        .expect(400);
    }
    expect(orders.addToCart).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post("/api/v1/orders/cart/items")
      .set(headers)
      .send({ productId: PRODUCT_ID, variantId, quantity: 1 })
      .expect(200);
    expect(orders.addToCart).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        productId: PRODUCT_ID,
        variantId,
        quantity: 1,
      }),
    );
  });

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

  it("provides separate admin reads and preserves the status mutation", async () => {
    actorRole = "admin";
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${ID}/status`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .set("Idempotency-Key", KEY)
      .send({ status: "PAID", expectedVersion: 1 })
      .expect(200);
    expect(orders.updateStatus).toHaveBeenCalledWith(
      expect.any(Object),
      ID,
      expect.objectContaining({ status: "PAID", expectedVersion: 1 }),
    );

    await request(app.getHttpServer())
      .get("/api/v1/admin/orders")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${ID}`)
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(200);
    expect(detail.body.data).toEqual({ id: ID, userId: PRODUCT_ID });
    expect(orders.adminGet).toHaveBeenCalledWith(expect.anything(), ID);
    expect(orders.get).not.toHaveBeenCalled();
    expect(orders.list).not.toHaveBeenCalled();
  });
  it("rejects missing/stale-shaped version inputs and body actor authority before delegation", async () => {
    actorRole = "admin";
    for (const body of [
      { status: "PAID" },
      { status: "PAID", expectedVersion: 0 },
      { status: "PAID", expectedVersion: "1" },
      { status: "PAID", expectedVersion: 2147483647 },
      { status: "PAID", expectedVersion: 1, actorId: PRODUCT_ID },
    ]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${ID}/status`)
        .set(TEST_ADMIN_IDENTITY_HEADERS)
        .set("Authorization", "Bearer admin-token")
        .set("Idempotency-Key", KEY)
        .send(body)
        .expect(400);
    }
    expect(orders.updateStatus).not.toHaveBeenCalled();
  });

  it("restricts admin reads by both application and verified role", async () => {
    for (const path of ["/api/v1/admin/orders", `/api/v1/admin/orders/${ID}`]) {
      await request(app.getHttpServer())
        .get(path)
        .set(TEST_ADMIN_IDENTITY_HEADERS)
        .set("Authorization", "Bearer user-token")
        .expect(403);
      actorRole = "admin";
      await request(app.getHttpServer())
        .get(path)
        .set("X-Nebula-Client-ID", "mobile-local")
        .set("Authorization", "Bearer admin-token")
        .expect(403);
      actorRole = "user";
    }
    expect(orders.adminList).not.toHaveBeenCalled();
    expect(orders.adminGet).not.toHaveBeenCalled();
  });

  it("validates admin filters before forwarding and returns page metadata", async () => {
    actorRole = "admin";
    for (const query of [
      "limit=101",
      "page=0",
      "page=1.5",
      "page=1000001",
      "status=REFUNDED",
      "userId=bad",
      "sort=id",
      "limit=",
    ]) {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/orders?${query}`)
        .set(TEST_ADMIN_IDENTITY_HEADERS)
        .set("Authorization", "Bearer admin-token")
        .expect(400);
    }
    await request(app.getHttpServer())
      .get("/api/v1/admin/orders/not-a-uuid")
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(400);
    expect(orders.adminList).not.toHaveBeenCalled();
    expect(orders.adminGet).not.toHaveBeenCalled();
    const result = await request(app.getHttpServer())
      .get(
        `/api/v1/admin/orders?status=PENDING&userId=${PRODUCT_ID}&page=1&limit=20`,
      )
      .set(TEST_ADMIN_IDENTITY_HEADERS)
      .set("Authorization", "Bearer admin-token")
      .expect(200);
    expect(orders.adminList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "PENDING",
        userId: PRODUCT_ID,
        page: 1,
        limit: 20,
      }),
    );
    expect(result.body).toMatchObject({
      data: [],
      meta: {
        pagination: {
          profile: "page-limit-total",
          page: 1,
          limit: 20,
          total: 0,
        },
      },
    });
  });
});
