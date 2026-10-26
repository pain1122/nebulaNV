import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { createGatewayClient } from "../dist/index.js";

if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_cart_live_refused_in_production");
const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const admin = createGatewayClient({
  baseUrl,
  publicClientId: "admin-web-local",
  applicationOrigin: "http://localhost:3000",
});
const customer = createGatewayClient({
  baseUrl,
  publicClientId: "mobile-local",
});
function success(operation, result) {
  if (!result.ok)
    throw new Error(
      `${operation}_http_${result.status}_${JSON.stringify(result.error).slice(0, 300)}`,
    );
  assert.ok(result.data.data, `${operation}_data_missing`);
  return result.data.data;
}
const log = (label) => console.log(`[d2-cart-live] ${label}=ok`);
const readiness = await fetch(`${baseUrl}/health/ready`);
assert.equal(readiness.status, 200, "d2_gateway_not_ready");
const products = [];
let adminToken, customerToken, customerRefresh, browserCookie, failure;
const cleanupErrors = [];
let initialCart;
async function adminCall(operation, input = {}) {
  return success(
    operation,
    await admin.request(operation, {
      accessToken: adminToken,
      idempotencyKey: randomUUID(),
      ...input,
    }),
  );
}
async function cartCall(operation, input = {}) {
  return success(
    operation,
    await customer.request(operation, {
      accessToken: customerToken,
      idempotencyKey: randomUUID(),
      ...input,
    }),
  );
}
async function denied(operation, input, status) {
  const result = await customer.request(operation, {
    accessToken: customerToken,
    idempotencyKey: randomUUID(),
    ...input,
  });
  assert.equal(
    result.status,
    status,
    `${operation}_denial_${JSON.stringify(result.error)}`,
  );
}
function ownItems(cart) {
  return cart.items.filter((item) => products.includes(item.productId));
}
function checkTotals(cart) {
  let cents = 0n;
  for (const item of cart.items) {
    assert.match(item.unitPrice, /^\d+\.\d{2}$/);
    const line =
      BigInt(item.unitPrice.replace(".", "")) * BigInt(item.quantity);
    assert.equal(BigInt(item.lineTotal.replace(".", "")), line);
    cents += line;
  }
  assert.equal(BigInt(cart.subtotal.replace(".", "")), cents);
  assert.equal(cart.total, cart.subtotal);
}
try {
  const login = await admin.request("auth_login", {
    body: {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    },
  });
  adminToken = success("admin_login", login).accessToken;
  browserCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(browserCookie, "d2_admin_cookie_missing");
  const customerLogin = success(
    "customer_login",
    await customer.request("auth_login", {
      body: {
        identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
        password: process.env.SEED_USER_PASS ?? "User123!",
      },
    }),
  );
  customerToken = customerLogin.accessToken;
  customerRefresh = customerLogin.refreshToken;
  assert.ok(customerRefresh, "d2_customer_refresh_missing");
  initialCart = await cartCall("orders_cart_get");
  checkTotals(initialCart);
  const suffix = randomUUID();
  const base = await adminCall("admin_products_create", {
    body: {
      title: `D2 base ${suffix}`,
      slug: `d2-base-${suffix}`,
      sku: `D2-BASE-${suffix}`,
      price: 0.1,
      status: "ACTIVE",
      trackInventory: true,
      stockQuantity: 10,
      discountType: "FIXED",
      discountValue: 0.05,
      discountActive: true,
    },
  });
  products.push(base.id);
  let variable = await adminCall("admin_products_create", {
    body: {
      title: `D2 variant ${suffix}`,
      slug: `d2-variant-${suffix}`,
      sku: `D2-VAR-${suffix}`,
      price: 10,
      status: "DRAFT",
      selectionMode: "VARIANT",
      trackInventory: true,
      stockQuantity: 0,
    },
  });
  products.push(variable.id);
  for (const [colour, priceOverride, stockQuantity] of [
    ["Blue", 1.25, 4],
    ["Red", 0, 2],
  ]) {
    variable = await adminCall("admin_products_variants_create", {
      path: { id: variable.id },
      body: {
        sku: `D2-${colour}-${suffix}`,
        options: { Color: colour },
        priceOverride,
        stockQuantity,
        expectedVersion: variable.version,
      },
    });
  }
  variable = await adminCall("admin_products_update", {
    path: { id: variable.id },
    body: { status: "ACTIVE", expectedVersion: variable.version },
  });
  const blue = variable.variants.find(
    (value) => value.options.Color === "Blue",
  );
  const red = variable.variants.find((value) => value.options.Color === "Red");
  assert.ok(blue && red);
  let cart = await cartCall("orders_cart_add", {
    body: { productId: base.id, quantity: 2 },
  });
  assert.equal(ownItems(cart)[0].unitPrice, "0.05");
  await Promise.all(
    [1, 2].map(() =>
      cartCall("orders_cart_add", {
        body: { productId: base.id, quantity: 1 },
      }),
    ),
  );
  cart = await cartCall("orders_cart_get");
  checkTotals(cart);
  const baseItem = ownItems(cart).find((item) => item.productId === base.id);
  assert.equal(baseItem.quantity, 4);
  assert.equal(baseItem.lineTotal, "0.20");
  assert.equal(
    ownItems(cart).filter((item) => item.productId === base.id).length,
    1,
  );
  log("discounted-base-concurrent-merge-exact-totals");

  await denied(
    "orders_cart_add",
    { body: { productId: base.id, quantity: 7 } },
    400,
  );
  await denied(
    "orders_cart_add",
    { body: { productId: variable.id, quantity: 1 } },
    400,
  );
  await denied(
    "orders_cart_add",
    { body: { productId: base.id, variantId: blue.id, quantity: 1 } },
    400,
  );
  await denied(
    "orders_cart_add",
    {
      body: {
        productId: base.id,
        quantity: 1,
        unitPrice: "0.00",
        userId: randomUUID(),
        selectedOptions: {},
      },
    },
    400,
  );
  await denied(
    "orders_cart_update",
    { path: { id: baseItem.id }, body: { quantity: -1 } },
    400,
  );
  await denied(
    "orders_cart_update",
    { path: { id: baseItem.id }, body: { quantity: 2147483648 } },
    400,
  );
  assert.deepEqual(ownItems(await cartCall("orders_cart_get")), ownItems(cart));
  log("stock-mode-authority-quantity-denials-preserve-state");

  cart = await cartCall("orders_cart_add", {
    body: { productId: variable.id, variantId: blue.id, quantity: 2 },
  });
  cart = await cartCall("orders_cart_add", {
    body: { productId: variable.id, variantId: red.id, quantity: 1 },
  });
  checkTotals(cart);
  const blueItem = ownItems(cart).find((item) => item.variantId === blue.id);
  const redItem = ownItems(cart).find((item) => item.variantId === red.id);
  assert.equal(blueItem.unitPrice, "1.25");
  assert.equal(blueItem.lineTotal, "2.50");
  assert.deepEqual(blueItem.selectedOptions, { Color: "Blue" });
  assert.equal(blueItem.sku, blue.sku);
  assert.equal(redItem.unitPrice, "0.00");
  assert.equal(redItem.lineTotal, "0.00");
  assert.equal(
    ownItems(cart).filter((item) => item.productId === variable.id).length,
    2,
  );
  log("distinct-variant-options-overrides-free-price");

  variable = await adminCall("admin_products_variants_update", {
    path: { id: variable.id, variantId: blue.id },
    body: { stockQuantity: 0, expectedVersion: variable.version },
  });
  await denied(
    "orders_cart_update",
    { path: { id: blueItem.id }, body: { quantity: 1 } },
    400,
  );
  cart = await cartCall("orders_cart_remove", { path: { id: blueItem.id } });
  assert.ok(!ownItems(cart).some((item) => item.id === blueItem.id));
  cart = await cartCall("orders_cart_update", {
    path: { id: redItem.id },
    body: { quantity: 0 },
  });
  assert.ok(!ownItems(cart).some((item) => item.id === redItem.id));
  await denied("orders_cart_remove", { path: { id: randomUUID() } }, 404);
  cart = await cartCall("orders_cart_update", {
    path: { id: baseItem.id },
    body: { quantity: 3 },
  });
  assert.equal(ownItems(cart)[0].lineTotal, "0.15");
  checkTotals(cart);
  log("fresh-availability-zero-removal-unowned-item-denial");
} catch (error) {
  failure = error;
}
if (customerToken && products.length)
  try {
    const cart = await cartCall("orders_cart_get");
    for (const item of ownItems(cart))
      await cartCall("orders_cart_remove", { path: { id: item.id } });
    const after = await cartCall("orders_cart_get");
    if (initialCart)
      assert.deepEqual(
        after.items,
        initialCart.items,
        "d2_cleanup_changed_nonfixture_cart_items",
      );
  } catch (error) {
    cleanupErrors.push(error);
  }
for (const id of products.reverse())
  try {
    await adminCall("admin_products_hard_delete", { path: { id } });
  } catch (error) {
    cleanupErrors.push(error);
  }
if (customerToken)
  try {
    await cartCall("auth_logout", { body: { refreshToken: customerRefresh } });
  } catch (error) {
    cleanupErrors.push(error);
  }
if (adminToken)
  try {
    await adminCall("auth_logout", { body: {}, browserCookie });
  } catch (error) {
    cleanupErrors.push(error);
  }
if (failure || cleanupErrors.length)
  throw new AggregateError(
    [...(failure ? [failure] : []), ...cleanupErrors],
    "d2_cart_live_or_cleanup_failed",
  );
log("cleanup-preserves-nonfixture-cart-items");
