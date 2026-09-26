import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { createGatewayClient } from "../dist/index.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("d1_product_live_refused_in_production");
}

const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const adminIdentifier = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.SEED_ADMIN_PASS ?? "Admin123!";

function client(publicClientId, applicationOrigin) {
  return createGatewayClient({ baseUrl, publicClientId, applicationOrigin });
}

function success(label, result) {
  if (!result.ok) {
    const code = result.error?.error?.code ?? result.error?.code ?? "unknown";
    const message =
      result.error?.error?.message ?? result.error?.message ?? "unknown";
    const details = String(JSON.stringify(result.error)).slice(0, 300);
    throw new Error(
      `${label}_http_${result.status}_${code}_${message}_${details}`,
    );
  }
  return result;
}

const admin = client("admin-web-local", "http://localhost:3000");
const storefront = client("storefront-web-local", "http://localhost:3008");
const login = success(
  "d1_product_login",
  await admin.request("auth_login", {
    body: { identifier: adminIdentifier, password: adminPassword },
  }),
);
const accessToken = login.data.data.accessToken;
const browserCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!browserCookie) throw new Error("d1_product_browser_cookie_missing");

let productId = "";
try {
  const suffix = randomUUID();
  const created = success(
    "d1_product_create",
    await admin.request("admin_products_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        title: `D1 inventory proof ${suffix}`,
        slug: `d1-inventory-proof-${suffix}`,
        sku: `D1-PROOF-${suffix}`,
        price: 25,
        status: "ACTIVE",
        trackInventory: true,
        stockQuantity: 2,
      },
    }),
  );
  const product = created.data.data;
  productId = product.id;
  assert.equal(product.trackInventory, true);
  assert.equal(product.stockQuantity, 2);
  assert.equal(product.availability, "AVAILABLE");
  assert.equal(product.version, 1);
  process.stdout.write("[d1-product-live] tracked-create=ok\n");

  const visible = success(
    "d1_product_public_available",
    await storefront.request("products_get", { path: { id: productId } }),
  );
  assert.equal(visible.data.data.availability, "AVAILABLE");
  process.stdout.write("[d1-product-live] public-available=ok\n");

  const depleted = success(
    "d1_product_deplete",
    await admin.request("admin_products_update", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: { stockQuantity: 0, expectedVersion: product.version },
    }),
  );
  assert.equal(depleted.data.data.stockQuantity, 0);
  assert.equal(depleted.data.data.availability, "OUT_OF_STOCK");
  assert.equal(depleted.data.data.version, 2);
  process.stdout.write("[d1-product-live] versioned-depletion=ok\n");

  const stale = await admin.request("admin_products_update", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId },
    body: { title: "Stale overwrite", expectedVersion: product.version },
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.status, 409);
  process.stdout.write("[d1-product-live] stale-write-denied=ok\n");

  const hidden = await storefront.request("products_get", {
    path: { id: productId },
  });
  assert.equal(hidden.ok, false);
  assert.equal(hidden.status, 404);
  process.stdout.write("[d1-product-live] out-of-stock-public-denial=ok\n");
} finally {
  if (productId) {
    success(
      "d1_product_cleanup",
      await admin.request("admin_products_hard_delete", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
      }),
    );
  }
  success(
    "d1_product_logout",
    await admin.request("auth_logout", {
      accessToken,
      browserCookie,
      idempotencyKey: randomUUID(),
      body: {},
    }),
  );
}

process.stdout.write("[d1-product-live] cleanup=ok\n");
