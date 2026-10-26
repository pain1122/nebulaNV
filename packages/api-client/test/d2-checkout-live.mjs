import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { createGatewayClient } from "../dist/index.js";
import { runCheckoutRecovery } from "./d2-checkout-recovery.mjs";
import { runDemoPayment } from "./d2-demo-payment-live.mjs";
if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_checkout_live_refused_in_production");
const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const recoveryMode = process.argv.includes("--recovery");
const paymentMode = process.argv.includes("--demo-payment");
assert.ok(!(recoveryMode && paymentMode), "d2_proof_modes_must_run_separately");
if (recoveryMode) {
  assert.ok(
    ["http://127.0.0.1:3002", "http://localhost:3002"].includes(baseUrl),
    "d2_recovery_requires_local_compose_gateway",
  );
}
const admin = createGatewayClient({
  baseUrl,
  publicClientId: "admin-web-local",
  applicationOrigin: "http://localhost:3000",
});
const customer = createGatewayClient({
  baseUrl,
  publicClientId: "mobile-local",
});
const products = [],
  errors = [];
let adminToken, customerToken, refreshToken, browserCookie;
let otherToken, otherRefresh;
const log = (name) => process.stdout.write(`[d2-checkout-live] ${name}=ok\n`);
function unwrap(name, result) {
  if (!result.ok || !result.data?.data)
    throw new Error(
      `${name}_http_${result.status}_${String(JSON.stringify(result.error) ?? "missing_data").slice(0, 300)}`,
    );
  return result.data.data;
}
async function adminCall(operation, input = {}) {
  return unwrap(
    operation,
    await admin.request(operation, {
      accessToken: adminToken,
      idempotencyKey: randomUUID(),
      ...input,
    }),
  );
}
async function customerCall(operation, input = {}) {
  return unwrap(
    operation,
    await customer.request(operation, {
      accessToken: customerToken,
      idempotencyKey: randomUUID(),
      ...input,
    }),
  );
}
try {
  assert.equal((await globalThis.fetch(`${baseUrl}/health/ready`)).status, 200);
  const login = await admin.request("auth_login", {
    body: {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    },
  });
  adminToken = unwrap("admin_login", login).accessToken;
  browserCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(browserCookie, "d2_checkout_admin_cookie_missing");
  const signedIn = unwrap(
    "customer_login",
    await customer.request("auth_login", {
      body: {
        identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
        password: process.env.SEED_USER_PASS ?? "User123!",
      },
    }),
  );
  customerToken = signedIn.accessToken;
  refreshToken = signedIn.refreshToken;
  assert.ok(refreshToken, "d2_checkout_refresh_missing");
  // Checkout consumes the whole Cart. Refuse to consume existing demo work.
  assert.equal(
    (await customerCall("orders_cart_get")).items.length,
    0,
    "d2_checkout_requires_empty_demo_customer_cart",
  );
  const suffix = randomUUID();
  const base = await adminCall("admin_products_create", {
    body: {
      title: `D2 checkout base ${suffix}`,
      slug: `d2-checkout-base-${suffix}`,
      sku: `D2-CHECKOUT-${suffix}`,
      price: 0.1,
      status: "ACTIVE",
      trackInventory: true,
      stockQuantity: 10,
    },
  });
  products.push(base.id);
  const unmanaged = await adminCall("admin_products_create", {
    body: {
      title: `D2 free unmanaged ${suffix}`,
      slug: `d2-free-${suffix}`,
      sku: `D2-FREE-${suffix}`,
      price: 0,
      status: "ACTIVE",
      trackInventory: false,
      stockQuantity: 0,
    },
  });
  products.push(unmanaged.id);
  let variants = await adminCall("admin_products_create", {
    body: {
      title: `D2 checkout variant ${suffix}`,
      slug: `d2-checkout-variant-${suffix}`,
      sku: `D2-CHOICE-${suffix}`,
      price: 10,
      status: "DRAFT",
      selectionMode: "VARIANT",
      trackInventory: true,
      stockQuantity: 0,
    },
  });
  products.push(variants.id);
  variants = await adminCall("admin_products_variants_create", {
    path: { id: variants.id },
    body: {
      expectedVersion: variants.version,
      sku: `D2-BLUE-${suffix}`,
      options: { Color: "Blue" },
      priceOverride: 1.25,
      stockQuantity: 4,
    },
  });
  variants = await adminCall("admin_products_update", {
    path: { id: variants.id },
    body: { expectedVersion: variants.version, status: "ACTIVE" },
  });
  const variant = variants.variants[0];
  assert.ok(variant);
  await customerCall("orders_cart_add", {
    body: { productId: base.id, quantity: 2 },
  });
  await customerCall("orders_cart_add", {
    body: { productId: variants.id, variantId: variant.id, quantity: 2 },
  });
  await customerCall("orders_cart_add", {
    body: { productId: unmanaged.id, quantity: 100 },
  });
  const ownedCart = await customerCall("orders_cart_get");
  assert.equal(ownedCart.items.length, 3);
  assert.ok(
    ownedCart.items.every((item) => products.includes(item.productId)),
    "d2_checkout_cart_contains_nonfixture_items",
  );
  const key = randomUUID(),
    body = { note: "D2 checkout live proof" };
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      customer.request("orders_checkout", {
        accessToken: customerToken,
        idempotencyKey: key,
        body,
      }),
    ),
  );
  const winner = concurrent.find((result) => result.ok);
  assert.ok(winner, "d2_checkout_no_successful_request");
  const first = unwrap("checkout_winner", winner);
  for (const result of concurrent) {
    if (result.ok)
      assert.deepEqual(unwrap("checkout_duplicate", result), first);
    else {
      // Existing Gateway policy rejects concurrent in-flight duplicates. Retry
      // only that named result, after the successful request has completed.
      assert.equal(result.status, 409);
      assert.equal(result.error?.error?.code, "IDEMPOTENCY_IN_PROGRESS");
      assert.deepEqual(
        await customerCall("orders_checkout", { idempotencyKey: key, body }),
        first,
      );
    }
  }
  assert.equal(first.checkoutMode, "DEMO_NO_PAYMENT");
  assert.equal(first.status, "PENDING");
  assert.equal(first.total, "2.70");
  assert.equal(first.items.length, 3);
  assert.equal(
    first.items.find((item) => item.productId === unmanaged.id)?.unitPrice,
    "0.00",
  );
  assert.deepEqual(
    first.items.find((item) => item.variantId === variant.id)?.selectedOptions,
    { Color: "Blue" },
  );
  assert.equal(
    (await adminCall("admin_products_get", { path: { id: base.id } }))
      .stockQuantity,
    8,
  );
  assert.equal(
    (
      await adminCall("admin_products_get", { path: { id: variants.id } })
    ).variants.find((row) => row.id === variant.id).stockQuantity,
    2,
  );
  assert.equal((await customerCall("orders_cart_get")).items.length, 0);
  assert.equal(
    (await adminCall("admin_products_get", { path: { id: unmanaged.id } }))
      .stockQuantity,
    0,
  );
  log("base-variant-exact-order-stock-once");
  if (process.argv.includes("--admin-reads")) {
    assert.deepEqual(
      await adminCall("admin_orders_get", { path: { id: first.id } }),
      first,
    );
    const listed = await admin.request("admin_orders_list", {
      accessToken: adminToken,
      query: { userId: first.userId, status: "PENDING", page: 1, limit: 100 },
    });
    assert.equal(listed.status, 200);
    assert.ok(listed.data.data.some((row) => row.id === first.id));
    assert.equal(listed.data.meta.pagination.profile, "page-limit-total");
    assert.equal(listed.data.meta.pagination.page, 1);
    assert.equal(listed.data.meta.pagination.limit, 100);
    assert.ok(listed.data.meta.pagination.total >= listed.data.data.length);
    assert.ok(
      listed.data.data.every(
        (row) => row.userId === first.userId && row.status === "PENDING",
      ),
    );
    const empty = await admin.request("admin_orders_list", {
      accessToken: adminToken,
      query: { userId: randomUUID() },
    });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.data.data, []);
    assert.equal(empty.data.meta.pagination.total, 0);
    for (const operation of ["admin_orders_get", "admin_orders_list"]) {
      const path =
        operation === "admin_orders_get" ? { id: first.id } : undefined;
      assert.equal(
        (await admin.request(operation, { accessToken: customerToken, path }))
          .status,
        403,
      );
      assert.equal(
        (await customer.request(operation, { accessToken: adminToken, path }))
          .status,
        403,
      );
    }
    assert.equal(
      (
        await admin.request("admin_orders_list", {
          accessToken: adminToken,
          query: { limit: 101 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await admin.request("admin_orders_get", {
          accessToken: adminToken,
          path: { id: randomUUID() },
        })
      ).status,
      404,
    );
    log("admin-reads-pagination-empty-role-application-denial");
  }
  assert.equal(
    (
      await customer.request("orders_checkout", {
        accessToken: customerToken,
        idempotencyKey: key,
        body: { note: "changed" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await admin.request("orders_get", {
        accessToken: adminToken,
        path: { id: first.id },
      })
    ).status,
    403,
    "d2_checkout_admin_application_denied_personal_route",
  );
  // Reach the owner check with a valid, distinct ordinary customer.
  const otherCredentials = {
    identifier:
      process.env.D2_CHECKOUT_OTHER_USER_EMAIL ??
      "d2-checkout-other@example.com",
    password: process.env.D2_CHECKOUT_OTHER_USER_PASS ?? "D2OwnerProbe123!",
  };
  let otherLogin = await customer.request("auth_login", {
    body: otherCredentials,
  });
  if (otherLogin.status === 401) {
    unwrap(
      "other_customer_register",
      await customer.request("auth_register", {
        idempotencyKey: randomUUID(),
        body: {
          email: otherCredentials.identifier,
          password: otherCredentials.password,
        },
      }),
    );
    otherLogin = await customer.request("auth_login", {
      body: otherCredentials,
    });
  }
  const otherSession = unwrap("other_customer_login", otherLogin);
  otherToken = otherSession.accessToken;
  otherRefresh = otherSession.refreshToken;
  assert.ok(otherRefresh, "d2_checkout_other_refresh_missing");
  const otherProfile = unwrap(
    "other_customer_profile",
    await customer.request("auth_me", { accessToken: otherToken }),
  );
  assert.equal(otherProfile.role, "user");
  assert.notEqual(otherProfile.id, first.userId);
  assert.equal(
    (
      await customer.request("orders_get", {
        accessToken: otherToken,
        path: { id: first.id },
      })
    ).status,
    404,
    "d2_checkout_other_customer_cannot_read_order",
  );
  log("changed-intent-owner-denial");
  await customerCall("orders_cart_add", {
    body: { productId: base.id, quantity: 1 },
  });
  const newCart = await customerCall("orders_cart_get");
  assert.deepEqual(
    await customerCall("orders_checkout", { idempotencyKey: key, body }),
    first,
  );
  assert.deepEqual(await customerCall("orders_cart_get"), newCart);
  await customerCall("orders_cart_remove", {
    path: { id: newCart.items[0].id },
  });
  log("same-key-replay-preserves-new-cart");
  if (recoveryMode)
    await runCheckoutRecovery({
      first,
      key,
      body,
      productId: base.id,
      call: (operation, input) =>
        customerCall(operation, {
          signal: globalThis.AbortSignal.timeout(60_000),
          ...input,
        }),
      request: (operation, input) =>
        customer.request(operation, {
          accessToken: customerToken,
          idempotencyKey: randomUUID(),
          signal: globalThis.AbortSignal.timeout(60_000),
          ...input,
        }),
      readiness: () =>
        globalThis.fetch(`${baseUrl}/health/ready`, {
          signal: globalThis.AbortSignal.timeout(5000),
        }),
      stock: async () =>
        (
          await adminCall("admin_products_get", {
            path: { id: base.id },
            signal: globalThis.AbortSignal.timeout(60_000),
          })
        ).stockQuantity,
    });
  if (paymentMode) {
    await runDemoPayment({
      first,
      adminCall,
      customerCall,
      otherCustomerRequest: (operation, input) =>
        customer.request(operation, {
          accessToken: otherToken,
          idempotencyKey: randomUUID(),
          ...input,
        }),
      customerRequest: (operation, input) =>
        customer.request(operation, {
          accessToken: customerToken,
          idempotencyKey: randomUUID(),
          ...input,
        }),
      adminRequest: (operation, input) =>
        admin.request(operation, {
          accessToken: adminToken,
          idempotencyKey: randomUUID(),
          ...input,
        }),
      stock: async () => {
        const baseState = await adminCall("admin_products_get", {
          path: { id: base.id },
        });
        const variantState = await adminCall("admin_products_get", {
          path: { id: variants.id },
        });
        const selected = variantState.variants.find(
          (row) => row.id === variant.id,
        );
        assert.ok(selected, "demo_payment_variant_missing");
        return {
          base: baseState.stockQuantity,
          variant: selected.stockQuantity,
        };
      },
    });
    assert.deepEqual(
      await customerCall("orders_checkout", { idempotencyKey: key, body }),
      first,
    );
    log("payment-does-not-rewrite-original-checkout-reply");
  } else {
    const current = await adminCall("admin_products_get", {
      path: { id: base.id },
    });
    await adminCall("admin_products_update", {
      path: { id: base.id },
      body: {
        expectedVersion: current.version,
        title: "Changed after purchase",
        price: 9.99,
      },
    });
    assert.deepEqual(
      await customerCall("orders_get", { path: { id: first.id } }),
      first,
    );
    const currentOrder = await adminCall("admin_orders_get", {
      path: { id: first.id },
    });
    const statusKey = randomUUID();
    const paid = await adminCall("admin_orders_status", {
      path: { id: first.id },
      idempotencyKey: statusKey,
      body: { status: "PAID", expectedVersion: currentOrder.version },
    });
    assert.equal(paid.status, "PAID");
    assert.equal(paid.version, currentOrder.version + 1);
    assert.deepEqual(
      await adminCall("admin_orders_status", {
        path: { id: first.id },
        idempotencyKey: statusKey,
        body: { status: "PAID", expectedVersion: currentOrder.version },
      }),
      paid,
    );
    assert.equal(
      (
        await admin.request("admin_orders_status", {
          accessToken: adminToken,
          idempotencyKey: randomUUID(),
          path: { id: first.id },
          body: { status: "FULFILLED", expectedVersion: currentOrder.version },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await admin.request("admin_orders_status", {
          accessToken: adminToken,
          idempotencyKey: randomUUID(),
          path: { id: first.id },
          body: { status: "PAYMENT_PROCESSING", expectedVersion: paid.version },
        })
      ).status,
      409,
    );
    assert.equal(
      (await customerCall("orders_get", { path: { id: first.id } })).status,
      "PAID",
    );
    assert.deepEqual(
      await customerCall("orders_checkout", { idempotencyKey: key, body }),
      first,
    );
    log("immutable-snapshots-status-version-replay-unbacked-payment-denied");
  }
} catch (error) {
  errors.push(error);
}
if (customerToken && products.length)
  try {
    const cart = await customerCall("orders_cart_get");
    for (const item of cart.items.filter((row) =>
      products.includes(row.productId),
    ))
      await customerCall("orders_cart_remove", { path: { id: item.id } });
  } catch (error) {
    errors.push(error);
  }
for (const id of products.reverse())
  try {
    await adminCall("admin_products_hard_delete", { path: { id } });
  } catch (error) {
    errors.push(error);
  }
if (otherToken)
  try {
    unwrap(
      "other_customer_logout",
      await customer.request("auth_logout", {
        accessToken: otherToken,
        idempotencyKey: randomUUID(),
        body: { refreshToken: otherRefresh },
      }),
    );
  } catch (error) {
    errors.push(error);
  }
if (customerToken)
  try {
    await customerCall("auth_logout", { body: { refreshToken } });
  } catch (error) {
    errors.push(error);
  }
if (adminToken)
  try {
    await adminCall("auth_logout", { body: {}, browserCookie });
  } catch (error) {
    errors.push(error);
  }
if (errors.length)
  throw new AggregateError(errors, "d2_checkout_live_or_cleanup_failed");
log("owned-catalogue-cart-session-cleanup");
process.stdout.write(
  paymentMode
    ? "[d2-checkout-live] demo payment Gateway proof passed; Order/receipt history retained; owner SQL recovery is separate\n"
    : recoveryMode
      ? "[d2-checkout-live] demo Order/receipt history and reusable other-customer identity retained; scoped cache-loss/outage/restart proof passed\n"
      : "[d2-checkout-live] demo Order/receipt history and reusable other-customer identity retained; cache-loss and service-outage transport proofs remain separate\n",
);
