import assert from "node:assert/strict";
import test from "node:test";
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

test("generated inventory contains the complete gateway operation surface", () => {
  assert.equal(Object.keys(gatewayOperations).length, 70);
  assert.equal(gatewayOperations.products_list.pathTemplate, "/api/v1/products");
  assert.equal(gatewayOperations.admin_products_create.requiresAccessToken, true);
});

test("public calls use only the gateway base, client ID, and typed query", async () => {
  const calls = [];
  const client = createGatewayClient({
    baseUrl: "https://gateway.example.test/",
    publicClientId: "storefront-web",
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, { data: [], meta: { pagination: { profile: "page-limit-total" } } }, { "x-request-id": "request-1" });
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
    body: { title: "Desk", content: "Description" },
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].init.headers.Authorization, "Bearer access-token");
  assert.equal(calls[0].init.headers["Idempotency-Key"], "0123456789abcdef");
  assert.equal(calls[0].init.headers.Origin, "http://localhost:3000");
  assert.equal(calls[0].init.headers["Sec-Fetch-Site"], "same-origin");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    title: "Desk",
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
    fetch: async () => jsonResponse(400, failure, { "x-request-id": "request-2" }),
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
