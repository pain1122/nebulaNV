// apps/order-service/test/grpc/order.e2e.spec.ts
import * as grpc from "@grpc/grpc-js";
import * as jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { call, loadClient, mdBearer, mdS2S, mergeMd } from "./helpers";
import { httpJson } from "../utils/http";

const ORDER_GRPC = process.env.ORDER_GRPC_URL || "127.0.0.1:50056";
const ORDER_PROTO = require.resolve("@nebula/protos/order.proto");
const AUTH_HTTP = process.env.AUTH_HTTP_URL!;
const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL!;
const MISSING_ID = "11111111-1111-4111-8111-111111111111";

type LoginResp = { accessToken: string };

type GrpcCallback<T = unknown> = (
  err: grpc.ServiceError | null,
  res: T,
) => void;
type GrpcUnary = (req: unknown, md: grpc.Metadata, cb: GrpcCallback) => void;

type OrderClient = grpc.Client & {
  GetCart: GrpcUnary;
  AddToCart: GrpcUnary;
  UpdateCartItem: GrpcUnary;
  RemoveCartItem: GrpcUnary;
  Checkout: GrpcUnary;
  GetOrder: GrpcUnary;
  ListOrders: GrpcUnary;
  UpdateOrderStatus: GrpcUnary;
  AdminGetOrder: GrpcUnary;
  AdminListOrders: GrpcUnary;
  StartDemoPayment: GrpcUnary;
  ResolveDemoPayment: GrpcUnary;
};

describe("OrderService gRPC (cart + checkout + orders)", () => {
  let client: OrderClient;
  let userId: string;
  let userToken: string;
  let orderId: string;
  let cartItemId: string;
  let productId: string;
  let adminToken: string;
  const checkoutKey = `grpc-checkout-${randomUUID()}`;
  let checkoutResponse: unknown;

  beforeAll(async () => {
    client = loadClient<OrderClient>(
      ORDER_PROTO,
      "order",
      "OrderService",
      ORDER_GRPC,
    );

    // admin login for product creation
    const a = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    });
    adminToken = a.accessToken;

    const user = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    });
    userToken = user.accessToken;
    const payload = jwt.decode(userToken);
    if (!payload || typeof payload !== "object" || !payload.sub) {
      throw new Error("seed user token is missing sub");
    }
    userId = String(payload.sub);

    // create product via product-service HTTP
    const p = await httpJson<any>(
      "POST",
      `${PRODUCT_HTTP}/products`,
      {
        data: {
          title: "OrderSvc gRPC Product",
          price: 99.99,
          status: "ACTIVE",
        },
      },
      { authorization: `Bearer ${adminToken}` },
    );
    productId = p.data.id;
  });

  it("GetCart rejects a signed request body without a verified actor", async () => {
    await expect(
      call<any>(client, "GetCart", { userId }, mdS2S()),
    ).rejects.toMatchObject({ code: grpc.status.UNAUTHENTICATED });
  });

  it("GetCart returns an empty cart for a new user", async () => {
    const res = await call<any>(
      client,
      "GetCart",
      { userId },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );
    expect(res.data).toBeTruthy();
    expect(res.data.userId).toBe(userId);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.subtotal).toMatch(/^\d+\.\d{2}$/);
    expect(res.data.total).toBe(res.data.subtotal);
    expect(res.data.expiresAt).toMatch(/^\d{4}-/);
  });

  it("AddToCart returns NOT_FOUND for a missing product", async () => {
    await expect(
      call<any>(
        client,
        "AddToCart",
        {
          userId,
          productId: MISSING_ID,
          quantity: 1,
        },
        mergeMd(mdS2S(userToken), mdBearer(userToken)),
      ),
    ).rejects.toMatchObject({
      code: grpc.status.NOT_FOUND,
      details: "product_not_found",
    });
  });

  it("AddToCart adds an item", async () => {
    const res = await call<any>(
      client,
      "AddToCart",
      { userId, productId, quantity: 2 },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );

    expect(res.data).toBeTruthy();
    expect(res.data.items.length).toBeGreaterThan(0);
    const item = res.data.items[0];
    expect(item.productId).toBe(productId);
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe("99.99");
    expect(item.lineTotal).toBe("199.98");
    expect(item.selectedOptions).toEqual({});
    expect(item.variantId).toBeUndefined();
    cartItemId = item.id;
  });

  it("UpdateCartItem changes quantity", async () => {
    const res = await call<any>(
      client,
      "UpdateCartItem",
      { userId, itemId: cartItemId, quantity: 3 },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );

    const item = res.data.items.find((i: any) => i.id === cartItemId);
    expect(item).toBeTruthy();
    expect(item.quantity).toBe(3);
  });

  it("Checkout creates an order and empties cart", async () => {
    const res = await call<any>(
      client,
      "Checkout",
      {
        userId,
        note: "gRPC checkout",
        idempotencyKey: checkoutKey,
      },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.userId).toBe(userId);
    expect(res.data.items.length).toBeGreaterThan(0);
    const snapshot = res as {
      data: {
        checkoutMode: string;
        items: { selectedOptions: Record<string, string>; unitPrice: string }[];
      };
    };
    expect(snapshot.data.checkoutMode).toBe("DEMO_NO_PAYMENT");
    expect(snapshot.data.items[0].selectedOptions).toEqual({});
    expect(snapshot.data.items[0].unitPrice).toMatch(/^\d+\.\d{2}$/);

    orderId = res.data.id;
    checkoutResponse = (res as { data: unknown }).data;
    const replay = await call<{ data: unknown }>(
      client,
      "Checkout",
      { userId, note: "gRPC checkout", idempotencyKey: checkoutKey },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );
    expect(replay.data).toEqual(checkoutResponse);

    // cart should be empty now
    const cart = await call<any>(
      client,
      "GetCart",
      { userId },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );
    expect(cart.data.items.length).toBe(0);
  });

  it("ListOrders contains the created order", async () => {
    const res = await call<any>(
      client,
      "ListOrders",
      { userId },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );

    expect(res.data.length).toBeGreaterThan(0);
    const hit = res.data.find((o: any) => o.id === orderId);
    expect(!!hit).toBe(true);
  });

  it("GetOrder returns the created order", async () => {
    const res = await call<any>(
      client,
      "GetOrder",
      { userId, id: orderId },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.userId).toBe(userId);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it("admin signed reads are paginated and deny ordinary users and invalid bounds", async () => {
    const metadata = mergeMd(mdS2S(adminToken), mdBearer(adminToken));
    const detail = await call<{ data: { id: string; userId: string } }>(
      client,
      "AdminGetOrder",
      { id: orderId },
      metadata,
    );
    expect(detail.data).toMatchObject({ id: orderId, userId });
    const list = await call<{
      data: { id: string }[];
      page: number;
      limit: number;
      total: number;
    }>(
      client,
      "AdminListOrders",
      { userId, status: "PENDING", page: 1, limit: 100 },
      metadata,
    );
    expect(list).toMatchObject({ page: 1, limit: 100 });
    expect(list.data.some((row) => row.id === orderId)).toBe(true);
    expect(list.total).toBeGreaterThanOrEqual(list.data.length);
    for (const method of ["AdminGetOrder", "AdminListOrders"])
      await expect(
        call(
          client,
          method,
          { id: orderId },
          mergeMd(mdS2S(userToken), mdBearer(userToken)),
        ),
      ).rejects.toMatchObject({ code: grpc.status.PERMISSION_DENIED });
    await expect(
      call(client, "AdminListOrders", { limit: 0 }, metadata),
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
    await expect(
      call(client, "AdminGetOrder", { id: MISSING_ID }, metadata),
    ).rejects.toMatchObject({ code: grpc.status.NOT_FOUND });
  });

  it("UpdateOrderStatus changes status to PAID (admin S2S)", async () => {
    const res = await call<any>(
      client,
      "UpdateOrderStatus",
      {
        id: orderId,
        status: "PAID",
        expectedVersion: 1,
        idempotencyKey: `grpc-status-${randomUUID()}`,
      },
      mergeMd(mdS2S(adminToken), mdBearer(adminToken)),
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.status).toBe("PAID");
  });

  it("demo RPCs enforce actor roles and command validation at Order", async () => {
    const userMd = mergeMd(mdS2S(userToken), mdBearer(userToken));
    const adminMd = mergeMd(mdS2S(adminToken), mdBearer(adminToken));
    const start = {
      id: MISSING_ID,
      expectedVersion: 1,
      idempotencyKey: `grpc-demo-start-${randomUUID()}`,
    };
    const outcome = { ...start, attemptId: MISSING_ID, outcome: "FAILED" };
    await expect(
      call(client, "StartDemoPayment", start, adminMd),
    ).rejects.toMatchObject({ code: grpc.status.PERMISSION_DENIED });
    await expect(
      call(client, "ResolveDemoPayment", outcome, userMd),
    ).rejects.toMatchObject({ code: grpc.status.PERMISSION_DENIED });
    await expect(
      call(
        client,
        "StartDemoPayment",
        { ...start, expectedVersion: 2147483646 },
        userMd,
      ),
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
    await expect(
      call(
        client,
        "StartDemoPayment",
        { ...start, expectedVersion: undefined },
        userMd,
      ),
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
    await expect(
      call(
        client,
        "ResolveDemoPayment",
        { ...outcome, outcome: "PAID" },
        adminMd,
      ),
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
    await expect(
      call(client, "StartDemoPayment", start, userMd),
    ).rejects.toMatchObject({ code: grpc.status.NOT_FOUND });
    await expect(
      call(client, "ResolveDemoPayment", outcome, adminMd),
    ).rejects.toMatchObject({ code: grpc.status.NOT_FOUND });
  });

  it("UpdateOrderStatus returns NOT_FOUND for a missing order", async () => {
    await expect(
      call<any>(
        client,
        "UpdateOrderStatus",
        {
          id: MISSING_ID,
          status: "PAID",
          expectedVersion: 1,
          idempotencyKey: `grpc-status-missing-${randomUUID()}`,
        },
        mergeMd(mdS2S(adminToken), mdBearer(adminToken)),
      ),
    ).rejects.toMatchObject({
      code: grpc.status.NOT_FOUND,
      details: "order_not_found",
    });
  });

  it("Checkout replay retains its original response after admin status changes", async () => {
    const replay = await call<{ data: unknown }>(
      client,
      "Checkout",
      { userId, note: "gRPC checkout", idempotencyKey: checkoutKey },
      mergeMd(mdS2S(userToken), mdBearer(userToken)),
    );
    expect(replay.data).toEqual(checkoutResponse);
  });
});
