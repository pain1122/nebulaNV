// apps/order-service/test/http/order.http.e2e.spec.ts
import { httpJson } from "../utils/http";
import { randomUUID } from "node:crypto";

const AUTH_HTTP = process.env.AUTH_HTTP_URL!;
const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL!;
const ORDER_HTTP = process.env.ORDER_HTTP_URL!;
const MISSING_ID = "11111111-1111-4111-8111-111111111111";

type LoginResp = { accessToken: string };

describe("order-service HTTP (cart + checkout + orders)", () => {
  let userToken: string;
  let adminToken: string;
  let cartItemId: string;
  let orderId: string;
  let productId: string;
  const checkoutKey = `http-checkout-${randomUUID()}`;
  let checkoutResponse: unknown;

  beforeAll(async () => {
    // user
    const u = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    });
    userToken = u.accessToken;

    // admin
    const a = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    });
    adminToken = a.accessToken;

    // create a product we can add to the cart
    const p = await httpJson<any>(
      "POST",
      `${PRODUCT_HTTP}/products`,
      {
        data: {
          title: "OrderSvc HTTP Product",
          price: 199.99,
          status: "ACTIVE",
        },
      },
      { authorization: `Bearer ${adminToken}` },
    );
    productId = p.data.id;
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
    expect(res.data.subtotal).toMatch(/^\d+\.\d{2}$/);
    expect(res.data.total).toBe(res.data.subtotal);
    expect(res.data.expiresAt).toMatch(/^\d{4}-/);
  });

  it("POST /orders/cart/items returns 404 for a missing product", async () => {
    const res = await fetch(`${ORDER_HTTP}/orders/cart/items`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        productId: MISSING_ID,
        quantity: 1,
      }),
    });
    const body = (await res.json()) as { message?: string };

    expect(res.status).toBe(404);
    expect(body.message).toBe("product_not_found");
  });

  it("POST /orders/cart/items creates a cart item", async () => {
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
    expect(item.unitPrice).toBe("199.99");
    expect(item.lineTotal).toBe("399.98");
    expect(item.selectedOptions).toEqual({});
    expect(item.variantId).toBeUndefined();

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
      {
        authorization: `Bearer ${userToken}`,
        "idempotency-key": checkoutKey,
      },
    );

    expect(res.data).toBeTruthy();
    expect(res.data.id).toBeTruthy();
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.meta).toBeTruthy();
    const snapshot = res as {
      data: {
        meta: string;
        checkoutMode: string;
        items: { selectedOptions: Record<string, string>; unitPrice: string }[];
      };
    };
    expect(JSON.parse(snapshot.data.meta)).toEqual({ note: "Test checkout" });
    expect(snapshot.data.checkoutMode).toBe("DEMO_NO_PAYMENT");
    expect(snapshot.data.items[0].selectedOptions).toEqual({});
    expect(snapshot.data.items[0].unitPrice).toMatch(/^\d+\.\d{2}$/);

    orderId = res.data.id;
    checkoutResponse = (res as { data: unknown }).data;
    const replay = await httpJson<{ data: unknown }>(
      "POST",
      `${ORDER_HTTP}/orders/checkout`,
      { note: "Test checkout" },
      { authorization: `Bearer ${userToken}`, "idempotency-key": checkoutKey },
    );
    expect(replay.data).toEqual(checkoutResponse);

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
    const res = await httpJson<any>("GET", `${ORDER_HTTP}/orders`, undefined, {
      authorization: `Bearer ${userToken}`,
    });

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

  it("admin reads list/detail with bounded filters and deny ordinary users", async () => {
    const detail = await httpJson<{ data: { id: string; userId: string } }>(
      "GET",
      `${ORDER_HTTP}/admin/orders/${orderId}`,
      undefined,
      { authorization: `Bearer ${adminToken}` },
    );
    expect(detail.data.id).toBe(orderId);
    const list = await httpJson<{
      data: { id: string }[];
      page: number;
      limit: number;
      total: number;
    }>(
      "GET",
      `${ORDER_HTTP}/admin/orders?userId=${detail.data.userId}&status=PENDING&page=1&limit=100`,
      undefined,
      { authorization: `Bearer ${adminToken}` },
    );
    expect(list).toMatchObject({ page: 1, limit: 100 });
    expect(list.data.some((row) => row.id === orderId)).toBe(true);
    expect(list.total).toBeGreaterThanOrEqual(list.data.length);
    for (const url of ["admin/orders", `admin/orders/${orderId}`])
      expect(
        (
          await fetch(`${ORDER_HTTP}/${url}`, {
            headers: { authorization: `Bearer ${userToken}` },
          })
        ).status,
      ).toBe(403);
    expect(
      (
        await fetch(`${ORDER_HTTP}/admin/orders?limit=101`, {
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await fetch(`${ORDER_HTTP}/admin/orders/${MISSING_ID}`, {
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(404);
  });

  it("PATCH /orders/:id/status (admin) updates status", async () => {
    const res = await httpJson<any>(
      "PATCH",
      `${ORDER_HTTP}/orders/${orderId}/status`,
      { status: "PAID", expectedVersion: 1 },
      {
        authorization: `Bearer ${adminToken}`,
        "idempotency-key": `http-status-${randomUUID()}`,
      },
    );

    expect(res.data.id).toBe(orderId);
    expect(res.data.status).toBe("PAID");
  });

  it("PATCH /orders/:id/status returns 404 for a missing order", async () => {
    const res = await fetch(`${ORDER_HTTP}/orders/${MISSING_ID}/status`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": "application/json",
        "idempotency-key": `http-status-missing-${randomUUID()}`,
      },
      body: JSON.stringify({ status: "PAID", expectedVersion: 1 }),
    });
    const body = (await res.json()) as { message?: string };

    expect(res.status).toBe(404);
    expect(body.message).toBe("order_not_found");
  });

  it("checkout replay retains its original response after admin status changes", async () => {
    const replay = await httpJson<{ data: unknown }>(
      "POST",
      `${ORDER_HTTP}/orders/checkout`,
      { note: "Test checkout" },
      { authorization: `Bearer ${userToken}`, "idempotency-key": checkoutKey },
    );
    expect(replay.data).toEqual(checkoutResponse);
  });

  it("native demo endpoints reject wrong roles, authority and invalid versions before owner lookup", async () => {
    const start = `${ORDER_HTTP}/orders/${MISSING_ID}/demo-payment-attempts`;
    const outcome = `${ORDER_HTTP}/admin/orders/${MISSING_ID}/demo-payment-attempts/${MISSING_ID}/outcome`;
    const post = (url: string, token: string, body: unknown) =>
      fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "idempotency-key": `http-demo-${randomUUID()}`,
        },
        body: JSON.stringify(body),
      });
    expect((await post(start, adminToken, { expectedVersion: 1 })).status).toBe(
      403,
    );
    expect(
      (
        await post(outcome, userToken, {
          expectedVersion: 2,
          outcome: "FAILED",
        })
      ).status,
    ).toBe(403);
    for (const body of [
      {},
      { expectedVersion: null },
      { expectedVersion: "1" },
      { expectedVersion: 2147483646 },
      { expectedVersion: 1, amount: "0.00" },
    ])
      expect((await post(start, userToken, body)).status).toBe(400);
    expect(
      (await post(outcome, adminToken, { expectedVersion: 2, outcome: "PAID" }))
        .status,
    ).toBe(400);
    expect((await post(start, userToken, { expectedVersion: 1 })).status).toBe(
      404,
    );
    expect(
      (
        await post(outcome, adminToken, {
          expectedVersion: 2,
          outcome: "FAILED",
        })
      ).status,
    ).toBe(404);
  });
});
