import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { createGatewayClient } from "../dist/index.js";

if (process.env.NODE_ENV === "production")
  throw new Error("d1_variants_live_refused_in_production");

const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const adminIdentifier = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.SEED_ADMIN_PASS ?? "Admin123!";
const admin = createGatewayClient({
  baseUrl,
  publicClientId: "admin-web-local",
  applicationOrigin: "http://localhost:3000",
});
const storefront = createGatewayClient({
  baseUrl,
  publicClientId: "storefront-web-local",
  applicationOrigin: "http://localhost:3008",
});

function success(label, result) {
  if (!result.ok)
    throw new Error(
      `${label}_http_${result.status}_${JSON.stringify(result.error).slice(0, 300)}`,
    );
  return result.data.data;
}

const login = await admin.request("auth_login", {
  body: { identifier: adminIdentifier, password: adminPassword },
});
const accessToken = success("d1_variants_login", login).accessToken;
const browserCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!browserCookie) throw new Error("d1_variants_browser_cookie_missing");

let productId = "";
try {
  const suffix = randomUUID();
  const baseSku = `D1-VARIANTS-${suffix}`;
  let product = success(
    "d1_variants_product_create",
    await admin.request("admin_products_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        title: `D1 variant proof ${suffix}`,
        slug: `d1-variant-proof-${suffix}`,
        sku: baseSku,
        price: 25,
        status: "DRAFT",
        selectionMode: "VARIANT",
        trackInventory: true,
        stockQuantity: 0,
      },
    }),
  );
  productId = product.id;
  assert.equal(product.selectionMode, "VARIANT");
  assert.equal(product.availability, "OUT_OF_STOCK");

  product = success(
    "d1_variants_first_create",
    await admin.request("admin_products_variants_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: {
        sku: `${baseSku}-BLUE-M`,
        options: { Color: "Blue", Size: "M" },
        priceOverride: 30,
        stockQuantity: 2,
        expectedVersion: product.version,
      },
    }),
  );
  const blue = product.variants.find(
    (variant) => variant.options.Color === "Blue",
  );
  assert.equal(blue.price, 30);
  assert.equal(blue.priceOverride, 30);
  assert.equal(blue.effectivePrice, 30);
  assert.equal(blue.availability, "AVAILABLE");

  product = success(
    "d1_variants_second_create",
    await admin.request("admin_products_variants_create", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: {
        sku: `${baseSku}-RED-M`,
        options: { Color: "Red", Size: "M" },
        stockQuantity: 0,
        expectedVersion: product.version,
      },
    }),
  );
  assert.equal(product.variants.length, 2);
  const red = product.variants.find(
    (variant) => variant.options.Color === "Red",
  );
  assert.equal(red.priceOverride, null);
  process.stdout.write("[d1-variants-live] options-sku-price-stock=ok\n");

  product = success(
    "d1_variants_activate",
    await admin.request("admin_products_update", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId },
      body: { status: "ACTIVE", expectedVersion: product.version },
    }),
  );
  const visible = success(
    "d1_variants_public",
    await storefront.request("products_get", { path: { id: productId } }),
  );
  assert.equal(visible.availability, "AVAILABLE");
  assert.equal(visible.variants.length, 2);
  assert.equal(
    visible.variants.find((variant) => variant.id === blue.id).priceOverride,
    30,
  );
  assert.equal(
    visible.variants.find((variant) => variant.id === red.id).priceOverride,
    null,
  );
  process.stdout.write(
    "[d1-variants-live] numeric-null-override-contract=ok\n",
  );
  assert.equal(
    visible.variants.find((variant) => variant.options.Color === "Red")
      .availability,
    "OUT_OF_STOCK",
  );
  process.stdout.write("[d1-variants-live] public-variant-visibility=ok\n");

  const stale = await admin.request("admin_products_variants_update", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId, variantId: blue.id },
    body: { stockQuantity: 0, expectedVersion: product.version - 1 },
  });
  assert.equal(stale.status, 409);
  const collision = await admin.request("admin_products_variants_create", {
    accessToken,
    idempotencyKey: randomUUID(),
    path: { id: productId },
    body: {
      sku: baseSku,
      options: { Color: "Green", Size: "M" },
      expectedVersion: product.version,
    },
  });
  assert.equal(collision.status, 409);
  const afterCollision = success(
    "d1_variants_rollback",
    await admin.request("admin_products_get", {
      accessToken,
      path: { id: productId },
    }),
  );
  assert.equal(afterCollision.version, product.version);
  assert.equal(afterCollision.variants.length, 2);
  process.stdout.write(
    "[d1-variants-live] stale-write-sku-collision-rollback=ok\n",
  );

  product = success(
    "d1_variants_deplete",
    await admin.request("admin_products_variants_update", {
      accessToken,
      idempotencyKey: randomUUID(),
      path: { id: productId, variantId: blue.id },
      body: { stockQuantity: 0, expectedVersion: product.version },
    }),
  );
  assert.equal(product.availability, "OUT_OF_STOCK");
  const hidden = await storefront.request("products_get", {
    path: { id: productId },
  });
  assert.equal(hidden.status, 404);
  process.stdout.write(
    "[d1-variants-live] variant-depletion-hides-product=ok\n",
  );
} finally {
  if (productId)
    success(
      "d1_variants_cleanup",
      await admin.request("admin_products_hard_delete", {
        accessToken,
        idempotencyKey: randomUUID(),
        path: { id: productId },
      }),
    );
  success(
    "d1_variants_logout",
    await admin.request("auth_logout", {
      accessToken,
      browserCookie,
      idempotencyKey: randomUUID(),
      body: {},
    }),
  );
}
process.stdout.write("[d1-variants-live] cleanup=ok\n");
