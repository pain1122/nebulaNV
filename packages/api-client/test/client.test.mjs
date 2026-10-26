import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { createGatewayClient, gatewayOperations } from "../dist/index.js";

function headers(values = {}) {
  const normalized = new Map(
    Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return { get: (name) => normalized.get(name.toLowerCase()) ?? null };
}

function jsonResponse(status, body, responseHeaders = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(responseHeaders),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

test("Cart requests preserve variant identity and decimal-string selection replies", async () => {
  let body;
  const cart = {
    id: "cart",
    userId: "owner",
    currency: "USD",
    expiresAt: "2026-10-13T12:00:00Z",
    subtotal: "0.30",
    total: "0.30",
    items: [
      {
        id: "item",
        productId: "product",
        variantId: "variant",
        sku: "BLUE",
        name: "Desk",
        quantity: 3,
        unitPrice: "0.10",
        lineTotal: "0.30",
        selectedOptions: { Color: "Blue" },
        meta: "",
      },
    ],
  };
  const client = createGatewayClient({
    baseUrl: "http://gateway:3002",
    publicClientId: "mobile-local",
    fetch: async (_, init) => {
      body = JSON.parse(init.body);
      return jsonResponse(201, { data: cart });
    },
  });
  const result = await client.request("orders_cart_add", {
    accessToken: "token",
    idempotencyKey: "cart-selection-0001",
    body: { productId: "product", variantId: "variant", quantity: 3 },
  });
  assert.deepEqual(body, {
    productId: "product",
    variantId: "variant",
    quantity: 3,
  });
  assert.deepEqual(result.data.data, cart);
});

test("generated inventory contains the complete gateway operation surface", () => {
  assert.equal(Object.keys(gatewayOperations).length, 81);
  for (const operation of [
    "orders_demo_payment_start",
    "admin_orders_demo_payment_outcome",
  ]) {
    assert.equal(gatewayOperations[operation].requiresAccessToken, true);
    assert.equal(gatewayOperations[operation].requiresIdempotencyKey, true);
    assert.equal(gatewayOperations[operation].method, "POST");
  }
  for (const operation of ["admin_orders_list", "admin_orders_get"]) {
    assert.equal(gatewayOperations[operation].requiresAccessToken, true);
    assert.equal(gatewayOperations[operation].requiresIdempotencyKey, false);
    assert.equal(gatewayOperations[operation].method, "GET");
  }
  assert.equal(
    gatewayOperations.admin_media_derivatives_regenerate.requiresIdempotencyKey,
    true,
  );
  assert.equal(
    gatewayOperations.admin_media_derivatives_get.pathTemplate,
    "/api/v1/admin/media/{id}/derivatives",
  );
  assert.equal(
    gatewayOperations.products_list.pathTemplate,
    "/api/v1/products",
  );
  assert.equal(
    gatewayOperations.admin_products_create.requiresAccessToken,
    true,
  );
  assert.equal(
    gatewayOperations.admin_products_variants_create.pathTemplate,
    "/api/v1/admin/products/{id}/variants",
  );
});

test("demo payment calls preserve target, attempt, version, outcome and protected headers", async () => {
  const calls = [];
  const reply = {
    order: { id: "order-1", total: "2.70" },
    attempt: { id: "attempt-1", mode: "DEMO" },
  };
  const client = createGatewayClient({
    baseUrl: "http://gateway:3002",
    publicClientId: "admin-web-local",
    applicationOrigin: "http://localhost:3000",
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(200, { data: reply });
    },
  });
  for (const [operation, path, body] of [
    ["orders_demo_payment_start", { id: "order-1" }, { expectedVersion: 1 }],
    [
      "admin_orders_demo_payment_outcome",
      { id: "order-1", attemptId: "attempt-1" },
      { expectedVersion: 2, outcome: "UNKNOWN" },
    ],
  ]) {
    const result = await client.request(operation, {
      accessToken: "verified-token",
      idempotencyKey: "demo-client-command-key",
      path,
      body,
    });
    assert.deepEqual(result.data.data, reply);
    const sent = calls.at(-1);
    assert.equal(sent.init.method, "POST");
    assert.equal(sent.init.headers.Authorization, "Bearer verified-token");
    assert.equal(
      sent.init.headers["Idempotency-Key"],
      "demo-client-command-key",
    );
    assert.deepEqual(JSON.parse(sent.init.body), body);
  }
  assert.equal(
    new URL(calls[0].url).pathname,
    "/api/v1/orders/order-1/demo-payment-attempts",
  );
  assert.equal(
    new URL(calls[1].url).pathname,
    "/api/v1/admin/orders/order-1/demo-payment-attempts/attempt-1/outcome",
  );
  await assert.rejects(
    () =>
      client.request("orders_demo_payment_start", {
        accessToken: "token",
        path: { id: "order-1" },
        body: { expectedVersion: 1 },
      }),
    /gateway_idempotency_key_required/,
  );
});

test("admin Order reads use separate paths and preserve pagination and filters", async () => {
  const urls = [];
  const client = createGatewayClient({
    baseUrl: "https://gateway.example.test",
    publicClientId: "admin-web-local",
    applicationOrigin: "http://localhost:3000",
    fetch: async (url, init) => {
      urls.push(String(url));
      assert.equal(init.headers.Authorization, "Bearer admin-token");
      return jsonResponse(200, {
        data: [],
        meta: {
          pagination: {
            profile: "page-limit-total",
            page: 2,
            limit: 5,
            total: 7,
          },
        },
      });
    },
  });
  const result = await client.request("admin_orders_list", {
    accessToken: "admin-token",
    query: { userId: "customer", status: "PENDING", page: 2, limit: 5 },
  });
  const query = new URL(urls[0]);
  assert.equal(query.pathname, "/api/v1/admin/orders");
  assert.equal(query.searchParams.get("userId"), "customer");
  assert.equal(query.searchParams.get("page"), "2");
  assert.deepEqual(result.data.meta.pagination, {
    profile: "page-limit-total",
    page: 2,
    limit: 5,
    total: 7,
  });
  await client.request("admin_orders_get", {
    accessToken: "admin-token",
    path: { id: "order-1" },
  });
  assert.equal(new URL(urls[1]).pathname, "/api/v1/admin/orders/order-1");
});

test("public calls use only the gateway base, client ID, and typed query", async () => {
  const calls = [];
  const client = createGatewayClient({
    baseUrl: "https://gateway.example.test/",
    publicClientId: "storefront-web",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(
        200,
        { data: [], meta: { pagination: { profile: "page-limit-total" } } },
        { "x-request-id": "request-1" },
      );
    },
  });

  const result = await client.request("products_list", {
    query: { page: 2, limit: 20, q: "desk" },
  });

  assert.equal(result.ok, true);
  assert.equal(result.requestId, "request-1");
  assert.equal(
    calls[0].url,
    "https://gateway.example.test/api/v1/products?limit=20&page=2&q=desk",
  );
  assert.equal(calls[0].init.headers["X-Nebula-Client-ID"], "storefront-web");
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test("protected mutations attach bearer, idempotency, origin, and JSON body", async () => {
  const calls = [];
  const client = createGatewayClient({
    baseUrl: "http://gateway:3002",
    publicClientId: "admin-web",
    applicationOrigin: "http://localhost:3000",
    accessToken: () => "access-token",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(201, { data: { id: "product-1", title: "Desk" } });
    },
  });

  const result = await client.request("admin_products_create", {
    idempotencyKey: "0123456789abcdef",
    body: { title: "Desk", price: 100, content: "Description" },
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].init.headers.Authorization, "Bearer access-token");
  assert.equal(calls[0].init.headers["Idempotency-Key"], "0123456789abcdef");
  assert.equal(calls[0].init.headers.Origin, "http://localhost:3000");
  assert.equal(calls[0].init.headers["Sec-Fetch-Site"], "same-origin");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    title: "Desk",
    price: 100,
    content: "Description",
  });
});

test("HTTP failures retain status, gateway envelope, headers, and request ID", async () => {
  const failure = {
    error: {
      code: "VALIDATION_FAILED",
      message: "Request validation failed",
      requestId: "request-2",
    },
  };
  const client = createGatewayClient({
    baseUrl: "https://gateway.example.test",
    publicClientId: "mobile",
    fetch: async () =>
      jsonResponse(400, failure, { "x-request-id": "request-2" }),
  });

  const result = await client.request("auth_login", {
    body: { identifier: "person@example.com", password: "invalid" },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.deepEqual(result.error, failure);
  assert.equal(result.requestId, "request-2");
});

test("binary routes return ArrayBuffer and missing protected auth fails closed", async () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  const client = createGatewayClient({
    baseUrl: "https://gateway.example.test",
    publicClientId: "mobile",
    fetch: async () => ({
      ...jsonResponse(200, undefined),
      arrayBuffer: async () => bytes,
    }),
  });
  const rendered = await client.request("media_render", {
    path: { id: "2f1d60b8-15c3-491b-9f0f-31aa09ff82e8" },
    query: { variant: "web" },
  });
  assert.equal(rendered.ok, true);
  assert.equal(rendered.data.byteLength, 3);

  await assert.rejects(
    () =>
      client.request("admin_users_list", {
        query: { page: 1 },
      }),
    /gateway_access_token_required/,
  );
});
