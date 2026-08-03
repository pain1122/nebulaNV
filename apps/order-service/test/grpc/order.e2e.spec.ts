// apps/order-service/test/grpc/order.e2e.spec.ts
import * as grpc from "@grpc/grpc-js";
import * as jwt from "jsonwebtoken";
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
};

describe("OrderService gRPC (cart + checkout + orders)", () => {
  let client: OrderClient;
  let userId: string;
  let userToken: string;
  let orderId: string;
  let cartItemId: string;
  let productId: string;
  let adminToken: string;

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
      { data: { title: "OrderSvc gRPC Product", price: 99.99 } },
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
      mergeMd(mdS2S(), mdBearer(userToken)),
    );
    expect(res.data).toBeTruthy();
    expect(res.data.userId).toBe(userId);
    expect(Array.isArray(res.data.items)).toBe(true);
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
        mergeMd(mdS2S(), mdBearer(userToken)),
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
      mergeMd(mdS2S(), mdBearer(userToken)),
    );

    expect(res.data).toBeTruthy();
    expect(res.data.items.length).toBeGreaterThan(0);
    const item = res.data.items[0];
    expect(item.productId).toBe(productId);
    expect(item.quantity).toBe(2);
    cartItemId = item.id;
  });

  it("UpdateCartItem changes quantity", async () => {
    const res = await call<any>(
      client,
      "UpdateCartItem",
      { userId, itemId: cartItemId, quantity: 3 },
      mergeMd(mdS2S(), mdBearer(userToken)),
    );

    const item = res.data.items.find((i: any) => i.id === cartItemId);
    expect(item).toBeTruthy();
    expect(item.quantity).toBe(3);
  });

  it("Checkout creates an order and empties cart", async () => {
    const res = await call<any>(
      client,
      "Checkout",
      { userId, note: "gRPC checkout" },
      mergeMd(mdS2S(), mdBearer(userToken)),
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.userId).toBe(userId);
    expect(res.data.items.length).toBeGreaterThan(0);

    orderId = res.data.id;

    // cart should be empty now
    const cart = await call<any>(
      client,
      "GetCart",
      { userId },
      mergeMd(mdS2S(), mdBearer(userToken)),
    );
    expect(cart.data.items.length).toBe(0);
  });

  it("ListOrders contains the created order", async () => {
    const res = await call<any>(
      client,
      "ListOrders",
      { userId },
      mergeMd(mdS2S(), mdBearer(userToken)),
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
      mergeMd(mdS2S(), mdBearer(userToken)),
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.userId).toBe(userId);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it("UpdateOrderStatus changes status to PAID (admin S2S)", async () => {
    const res = await call<any>(
      client,
      "UpdateOrderStatus",
      { id: orderId, status: "PAID" },
      mergeMd(mdS2S(), mdBearer(adminToken)),
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.status).toBe("PAID");
  });

  it("UpdateOrderStatus returns NOT_FOUND for a missing order", async () => {
    await expect(
      call<any>(
        client,
        "UpdateOrderStatus",
        { id: MISSING_ID, status: "PAID" },
        mergeMd(mdS2S(), mdBearer(adminToken)),
      ),
    ).rejects.toMatchObject({
      code: grpc.status.NOT_FOUND,
      details: "order_not_found",
    });
  });
});
