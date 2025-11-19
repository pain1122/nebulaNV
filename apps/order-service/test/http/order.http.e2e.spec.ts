// apps/order-service/test/http/order.http.e2e.spec.ts
import { httpJson } from "../utils/http";
import { randomUUID } from "crypto";

const AUTH_HTTP = process.env.AUTH_HTTP_URL!;
const ORDER_HTTP = process.env.ORDER_HTTP_URL!;

type LoginResp = { accessToken: string };

describe("order-service HTTP (cart + checkout + orders)", () => {
  let userToken: string;
  let adminToken: string;
  let cartItemId: string;
  let orderId: string;

  beforeAll(async () => {
    // user
    const u = await httpJson<LoginResp>( "POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password:   process.env.SEED_USER_PASS  ?? "User123!",
    });
    userToken = u.accessToken;

    // admin (not strictly needed yet, but we'll keep it aligned)
    const a = await httpJson<LoginResp>( "POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password:   process.env.SEED_ADMIN_PASS  ?? "Admin123!",
    });
    adminToken = a.accessToken;
  });

  it("GET /orders/cart (user) returns a cart", async () => {
    const res = await httpJson<any>(
      "GET",
      `${ORDER_HTTP}/orders/cart`,
      undefined,
      { authorization: `Bearer ${userToken}` },
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.items).toBeDefined();
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  it("POST /orders/cart/items creates a cart item", async () => {
    const productId = randomUUID(); // order-service doesn't validate against product DB (yet)

    const res = await httpJson<any>(
      "POST",
      `${ORDER_HTTP}/orders/cart/items`,
      { productId, quantity: 2 },
      { authorization: `Bearer ${userToken}` },
    );

    expect(res.data.items.length).toBeGreaterThan(0);
    const item = res.data.items[0];
    expect(item.productId).toBe(productId);
    expect(item.quantity).toBe(2);

    cartItemId = item.id;
  });

  it("PATCH /orders/cart/items/:id updates quantity", async () => {
    const res = await httpJson<any>(
      "PATCH",
      `${ORDER_HTTP}/orders/cart/items/${cartItemId}`,
      { quantity: 3 },
      { authorization: `Bearer ${userToken}` },
    );

    const item = res.data.items.find((i: any) => i.id === cartItemId);
    expect(item).toBeTruthy();
    expect(item.quantity).toBe(3);
  });

  it("POST /orders/checkout creates an order and clears cart", async () => {
    const res = await httpJson<any>(
      "POST",
      `${ORDER_HTTP}/orders/checkout`,
      { note: "Test checkout" },
      { authorization: `Bearer ${userToken}` },
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.meta).toBeTruthy();
    expect(res.data.meta.seeded).toBeUndefined(); // just sanity

    orderId = res.data.id;

    // cart should now be empty
    const cart = await httpJson<any>(
      "GET",
      `${ORDER_HTTP}/orders/cart`,
      undefined,
      { authorization: `Bearer ${userToken}` },
    );
    expect(cart.data.items.length).toBe(0);
  });

  it("GET /orders lists includes the created order", async () => {
    const res = await httpJson<any>(
      "GET",
      `${ORDER_HTTP}/orders`,
      undefined,
      { authorization: `Bearer ${userToken}` },
    );

    expect(res.data.length).toBeGreaterThan(0);
    const hit = res.data.find((o: any) => o.id === orderId);
    expect(!!hit).toBe(true);
  });

  it("GET /orders/:id returns the created order", async () => {
    const res = await httpJson<any>(
      "GET",
      `${ORDER_HTTP}/orders/${orderId}`,
      undefined,
      { authorization: `Bearer ${userToken}` },
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it("PATCH /orders/:id/status (admin) updates status", async () => {
    const res = await httpJson<any>(
      "PATCH",
      `${ORDER_HTTP}/orders/${orderId}/status`,
      { status: "PAID" },
      { authorization: `Bearer ${adminToken}` },
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.status).toBe("PAID");
  });
});
