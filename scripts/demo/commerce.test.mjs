import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { mkdtemp, readFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { createCommerceRunner } from "./commerce-runner.mjs";
import {
  buildCommerceCatalog,
  COMMERCE_MAX_QUANTITY,
} from "./commerce-catalog.mjs";
import {
  emptyCommerceState,
  validateCommerceState,
  withCommerceJournal,
} from "./commerce-state.mjs";
import { withJournal, withNamedJournal } from "./state.mjs";
import { connectGateway } from "./gateway.mjs";
import { gatewayOperations } from "../../packages/api-client/dist/index.js";

const gatewayRequire = createRequire(
  new URL("../../apps/gateway/package.json", import.meta.url),
);
gatewayRequire("reflect-metadata");
gatewayRequire("ts-node").register({
  transpileOnly: true,
  project: fileURLToPath(
    new URL("../../apps/gateway/tsconfig.json", import.meta.url),
  ),
});
const { plainToInstance } = gatewayRequire("class-transformer");
const { validateSync } = gatewayRequire("class-validator");
const productDto = gatewayRequire("./src/product/product-api.dto.ts");
const orderDto = gatewayRequire("./src/order/order-api.dto.ts");
const { gatewayItemEnvelope, gatewayCollectionEnvelope, gatewayErrorEnvelope } =
  gatewayRequire("./src/contracts/api-envelope.ts");
const bodies = {
  admin_products_create: productDto.GatewayProductWriteDto,
  admin_products_update: productDto.GatewayProductPatchDto,
  admin_products_variants_create: productDto.GatewayVariantWriteDto,
  orders_cart_add: orderDto.GatewayCartAddDto,
  orders_checkout: orderDto.GatewayCheckoutDto,
  orders_demo_payment_start: orderDto.GatewayDemoPaymentStartDto,
  admin_orders_demo_payment_outcome: orderDto.GatewayDemoPaymentOutcomeDto,
  admin_orders_status: orderDto.GatewayOrderStatusUpdateDto,
};
const wire = (value) => JSON.parse(JSON.stringify(value));
const money = (value) => Number(value).toFixed(2);
const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

function harness(profile = "showcase") {
  let state = emptyCommerceState(profile),
    saved = wire(state),
    time = Date.now();
  const products = new Map(),
    orders = new Map(),
    attempts = new Map(),
    cache = new Map();
  const userId = randomUUID(),
    calls = [],
    logs = [];
  let currentCart = {
    id: randomUUID(),
    userId,
    currency: "EUR",
    expiresAt: new Date(time + 1_800_000).toISOString(),
    items: [],
  };
  const api = {
    baseUrl: "http://127.0.0.1:3002",
    fault: null,
    customer: async () => ({ id: userId, role: "user" }),
    async result(operation, input = {}, identity = "admin") {
      try {
        return {
          ok: true,
          status: 200,
          data: { data: await api.call(operation, input, identity) },
        };
      } catch (error) {
        if (!error.status) throw error;
        return { ok: false, status: error.status };
      }
    },
    async call(operation, input = {}, identity = "admin") {
      const definition = gatewayOperations[operation];
      assert.ok(definition, operation);
      calls.push({ operation, input: wire(input), identity });
      if (operation.startsWith("orders_")) assert.equal(identity, "customer");
      if (operation.startsWith("admin_")) assert.equal(identity, "admin");
      if (bodies[operation]) {
        const errors = validateSync(
          plainToInstance(bodies[operation], wire(input.body)),
          { whitelist: true, forbidNonWhitelisted: true },
        );
        if (errors.length)
          fail(
            400,
            `fixture_dto_${operation}_${errors.map((e) => e.property).join(",")}`,
          );
      }
      const mutation = !["GET", "HEAD"].includes(definition.method);
      if (mutation) assert.ok(input.idempotencyKey, `key_missing_${operation}`);
      const key = `${identity}:${operation}:${input.idempotencyKey}`;
      const intent = JSON.stringify({ path: input.path, body: input.body });
      if (mutation && cache.has(key)) {
        const cached = cache.get(key);
        assert.equal(cached.intent, intent);
        return wire(cached.reply);
      }
      const getProduct = (id) => {
        const row = products.get(id);
        if (!row) fail(404, "product_missing");
        return row;
      };
      const getOrder = (id) => {
        const row = orders.get(id);
        if (!row) fail(404, "order_missing");
        return row;
      };
      const allocation = (row, reserve) => {
        for (const line of row.items) {
          const p = getProduct(line.productId);
          if (!p.trackInventory) continue;
          const target = line.variantId
            ? p.variants.find((v) => v.id === line.variantId)
            : p;
          target.stockQuantity += (reserve ? -1 : 1) * line.quantity;
          assert.ok(target.stockQuantity >= 0, "fixture_no_oversell");
          p.version++;
        }
        row.allocated = reserve;
      };
      const replyOrder = (row) => {
        const { allocated, ...reply } = row;
        void allocated;
        return wire(reply);
      };
      const totals = () => {
        currentCart.subtotal = currentCart.total = money(
          currentCart.items.reduce(
            (sum, line) => sum + Number(line.unitPrice) * line.quantity,
            0,
          ),
        );
        for (const line of currentCart.items)
          line.lineTotal = money(Number(line.unitPrice) * line.quantity);
        return wire(currentCart);
      };
      let reply;
      switch (operation) {
        case "settings_get":
          reply = { found: true, value: "EUR" };
          break;
        case "admin_products_list":
          reply = [...products.values()].filter((p) =>
            p.slug.includes(input.query.q),
          );
          break;
        case "admin_products_create": {
          const row = {
            ...input.body,
            id: randomUUID(),
            version: 1,
            deletedAt: "",
            variants: [],
          };
          products.set(row.id, row);
          reply = row;
          break;
        }
        case "admin_products_get":
          reply = getProduct(input.path.id);
          break;
        case "admin_products_variants_create": {
          const row = getProduct(input.path.id);
          assert.equal(row.version, input.body.expectedVersion);
          const { expectedVersion, ...body } = input.body;
          void expectedVersion;
          row.variants.push({
            ...body,
            id: randomUUID(),
            active: true,
            deletedAt: "",
            sortOrder: 0,
          });
          row.version++;
          reply = row;
          break;
        }
        case "admin_products_update": {
          const row = getProduct(input.path.id);
          assert.equal(row.version, input.body.expectedVersion);
          row.status = input.body.status;
          row.version++;
          reply = row;
          break;
        }
        case "orders_cart_get":
          if (Date.parse(currentCart.expiresAt) <= time) {
            currentCart.items = [];
            currentCart.expiresAt = new Date(time + 1_800_000).toISOString();
          }
          reply = totals();
          break;
        case "orders_cart_add": {
          const p = getProduct(input.body.productId);
          const v = input.body.variantId
            ? p.variants.find((row) => row.id === input.body.variantId)
            : null;
          const existing = currentCart.items.find(
            (row) => row.productId === p.id && row.variantId === v?.id,
          );
          if (existing) existing.quantity += input.body.quantity;
          else
            currentCart.items.push({
              id: randomUUID(),
              productId: p.id,
              ...(v ? { variantId: v.id } : {}),
              selectedOptions: v?.options ?? {},
              quantity: input.body.quantity,
              unitPrice: money(v?.priceOverride ?? p.price),
              sku: v?.sku ?? p.sku,
              name: p.title,
              meta: "",
            });
          reply = totals();
          break;
        }
        case "orders_cart_remove":
          currentCart.items = currentCart.items.filter(
            (row) => row.id !== input.path.id,
          );
          reply = totals();
          break;
        case "orders_checkout": {
          assert.equal(currentCart.items.length, 3);
          const row = {
            id: randomUUID(),
            orderNumber: `DEMO-${orders.size + 1}`,
            userId,
            currency: "EUR",
            version: 1,
            status: "PENDING",
            checkoutMode: "DEMO_NO_PAYMENT",
            subtotal: totals().total,
            total: totals().total,
            discountTotal: "0.00",
            taxTotal: "0.00",
            createdAt: new Date(time).toISOString(),
            updatedAt: new Date(time).toISOString(),
            shippingAddress: "",
            billingAddress: "",
            meta: JSON.stringify({ note: input.body.note }),
            items: wire(currentCart.items),
            allocated: false,
          };
          allocation(row, true);
          orders.set(row.id, row);
          currentCart.items = [];
          reply = replyOrder(row);
          break;
        }
        case "orders_get":
          reply = replyOrder(getOrder(input.path.id));
          break;
        case "orders_demo_payment_start": {
          const row = getOrder(input.path.id);
          assert.equal(row.status, "PENDING");
          assert.equal(row.version, input.body.expectedVersion);
          if (!row.allocated) allocation(row, true);
          row.status = "PAYMENT_PROCESSING";
          row.version++;
          const attempt = {
            id: randomUUID(),
            orderId: row.id,
            state: "PROCESSING",
            mode: "DEMO",
            amount: row.total,
            currency: row.currency,
            failureCode: "",
          };
          attempts.set(attempt.id, attempt);
          reply = { order: replyOrder(row), attempt };
          break;
        }
        case "admin_orders_demo_payment_outcome": {
          const row = getOrder(input.path.id),
            attempt = attempts.get(input.path.attemptId);
          assert.equal(attempt.orderId, row.id);
          assert.equal(row.version, input.body.expectedVersion);
          if (input.body.outcome !== "UNKNOWN") {
            attempt.state = input.body.outcome;
            row.status =
              input.body.outcome === "SUCCEEDED" ? "PAID" : "PENDING";
            row.version++;
            if (row.status === "PENDING" && row.allocated)
              allocation(row, false);
          }
          reply = { order: replyOrder(row), attempt };
          break;
        }
        case "admin_orders_status": {
          const row = getOrder(input.path.id);
          assert.equal(row.version, input.body.expectedVersion);
          if (input.body.status === "CANCELLED" && row.allocated)
            allocation(row, false);
          row.status = input.body.status;
          row.version++;
          reply = replyOrder(row);
          break;
        }
        case "admin_products_hard_delete":
          getProduct(input.path.id);
          products.delete(input.path.id);
          reply = { success: true };
          break;
        default:
          throw new Error(`fixture_unhandled_${operation}`);
      }
      reply = wire(reply);
      if (mutation) cache.set(key, { intent, reply });
      if (api.fault?.(operation, input)) {
        api.fault = null;
        throw new Error("fixture_lost_reply");
      }
      return reply;
    },
  };
  let runner;
  const restart = (transport = api) => {
    state = wire(saved);
    runner = createCommerceRunner({
      api: transport,
      state,
      profile,
      now: () => time,
      log: (line) => logs.push(line),
      save: async () => {
        validateCommerceState(state);
        saved = wire(state);
      },
    });
    return runner;
  };
  restart();
  return {
    api,
    products,
    orders,
    attempts,
    calls,
    logs,
    restart,
    get runner() {
      return runner;
    },
    get state() {
      return state;
    },
    get cart() {
      return currentCart;
    },
    advance(ms) {
      time += ms;
    },
    mutateSaved(fn) {
      fn(saved);
    },
    userId,
  };
}

test("showcase seeds every D2 lifecycle through actual operation names/DTOs, then reruns without mutations", async () => {
  const h = harness();
  await h.runner.seed();
  await h.runner.verify();
  assert.equal(h.orders.size, 7);
  assert.equal(h.products.size, 3);
  assert.deepEqual(
    [...h.orders.values()].map((o) => o.status),
    buildCommerceCatalog().scenarios.map((s) => s.status),
  );
  const mutations = h.calls.filter((c) => c.input.idempotencyKey).length;
  await h.restart().seed();
  assert.equal(h.orders.size, 7);
  assert.equal(h.calls.filter((c) => c.input.idempotencyKey).length, mutations);
  assert.equal(h.state.currency, "EUR");
});

test("actual envelopes through generated SDK/demo wrapper preserve empty/nonempty Product arrays throughout seed recovery and reset", async () => {
  const h = harness(),
    previous = globalThis.fetch;
  let api;
  const collectionSizes = [];
  globalThis.fetch = async (address, init) => {
    const url = new URL(address);
    const header = (name) =>
      Object.entries(init.headers).find(
        ([key]) => key.toLowerCase() === name.toLowerCase(),
      )?.[1];
    const mobile = header("X-Nebula-Client-ID") === "mobile-local";
    const respond = (body, status = 200, headers = {}) =>
      new globalThis.Response(JSON.stringify(body), { status, headers });
    if (url.pathname.endsWith("/auth/login"))
      return respond(
        gatewayItemEnvelope(
          {
            accessToken: "fixture-token",
            ...(mobile ? { refreshToken: "fixture-refresh" } : {}),
          },
          "wire-test",
        ),
        200,
        mobile ? {} : { "Set-Cookie": "fixture_session=present; HttpOnly" },
      );
    if (url.pathname.endsWith("/auth/me"))
      return respond(
        gatewayItemEnvelope(
          { id: h.userId, role: "user", email: "demo-d2-showcase@example.com" },
          "wire-test",
        ),
      );
    if (url.pathname.endsWith("/auth/logout"))
      return respond(gatewayItemEnvelope({ success: true }, "wire-test"));
    let operation, path;
    const segments = url.pathname.split("/");
    for (const [name, definition] of Object.entries(gatewayOperations)) {
      if (definition.method !== init.method) continue;
      const template = definition.pathTemplate.split("/");
      const parameters = {};
      if (
        template.length === segments.length &&
        template.every((part, i) => {
          if (part.startsWith("{") && part.endsWith("}")) {
            parameters[part.slice(1, -1)] = decodeURIComponent(segments[i]);
            return true;
          }
          return part === segments[i];
        })
      ) {
        operation = name;
        path = parameters;
        break;
      }
    }
    assert.ok(
      operation,
      `unmatched_fixture_request_${init.method}_${url.pathname}`,
    );
    const query = Object.fromEntries(
      [...url.searchParams].map(([key, value]) => [
        key,
        ["page", "limit"].includes(key)
          ? Number(value)
          : key === "includeDeleted"
            ? value === "true"
            : value,
      ]),
    );
    const input = {
      ...(Object.keys(path).length ? { path } : {}),
      ...(Object.keys(query).length ? { query } : {}),
      ...(init.body ? { body: JSON.parse(init.body) } : {}),
      ...(header("Idempotency-Key")
        ? { idempotencyKey: header("Idempotency-Key") }
        : {}),
    };
    let value;
    try {
      value = await h.api.call(operation, input, mobile ? "customer" : "admin");
    } catch (error) {
      if (!error.status) throw error;
      return respond(
        gatewayErrorEnvelope("VALIDATION_FAILED", error.message, "wire-test"),
        error.status,
      );
    }
    if (operation === "admin_products_list") {
      assert.ok(
        Array.isArray(value),
        "fixture_product_collection_must_be_array",
      );
      collectionSizes.push(value.length);
      return respond(
        gatewayCollectionEnvelope(
          value,
          { profile: "total-only", total: value.length },
          "wire-test",
        ),
      );
    }
    return respond(gatewayItemEnvelope(value, "wire-test"));
  };
  try {
    api = await connectGateway(
      {},
      {
        customer: {
          email: "demo-d2-showcase@example.com",
          password: "Fixture123!",
        },
      },
    );
    h.api.fault = (operation) => operation === "admin_products_create";
    await assert.rejects(h.restart(api).seed(), /fixture_lost_reply/);
    await h.restart(api).seed();
    await h.runner.verify();
    await h.runner.seed();
    assert.equal(h.orders.size, 7);
    await h.runner.reset();
    await h.runner.seed();
    await h.runner.verify();
    assert.equal(h.orders.size, 14);
    assert.equal(h.products.size, 3);
    assert.ok(collectionSizes.includes(0));
    assert.ok(collectionSizes.includes(1));
  } finally {
    try {
      if (api) await api.close();
    } finally {
      globalThis.fetch = previous;
    }
  }
});

test("malformed Product collections fail explicitly before creation or reset deletion", async () => {
  const h = harness(),
    original = h.api.call;
  h.api.call = async (operation, ...args) =>
    operation === "admin_products_list"
      ? { items: [] }
      : original(operation, ...args);
  await assert.rejects(h.runner.seed(), /product_list_response_invalid/);
  assert.equal(h.products.size, 0);
  assert.equal(h.orders.size, 0);
  h.api.call = original;
  h.api.fault = (operation) => operation === "admin_products_create";
  await assert.rejects(h.restart().seed(), /fixture_lost_reply/);
  h.api.call = async (operation, ...args) =>
    operation === "admin_products_list" ? {} : original(operation, ...args);
  await assert.rejects(h.restart().reset(), /product_list_response_invalid/);
  assert.equal(h.products.size, 1);
  assert.equal(
    h.calls.filter((row) => row.operation === "admin_products_hard_delete")
      .length,
    0,
  );
});

test("limits uses an independent profile and exercises valid maximum/invalid quantities", async () => {
  const h = harness("limits");
  await h.runner.seed();
  await h.runner.verify();
  assert.equal(
    h.cart.items.find((line) => line.productId === h.state.products.free.id)
      .quantity,
    COMMERCE_MAX_QUANTITY,
  );
  assert.deepEqual(
    h.calls
      .filter((c) =>
        [0, COMMERCE_MAX_QUANTITY + 1].includes(c.input.body?.quantity),
      )
      .map((c) => c.input.body.quantity),
    [0, COMMERCE_MAX_QUANTITY + 1],
  );
});

test("lost create/variant/Cart/Checkout/payment/status replies resume without duplicate Orders or stock effects", async () => {
  for (const operation of [
    "admin_products_create",
    "admin_products_variants_create",
    "orders_cart_add",
    "orders_checkout",
    "orders_demo_payment_start",
    "admin_orders_demo_payment_outcome",
    "admin_orders_status",
  ]) {
    const h = harness();
    h.api.fault = (op) => op === operation;
    await assert.rejects(h.runner.seed(), /fixture_lost_reply/);
    await h.restart().seed();
    await h.runner.verify();
    assert.equal(h.orders.size, 7, operation);
    assert.equal(h.products.size, 3, operation);
  }
});

test("foreign Cart or owned Product drift fails without rewriting the data", async () => {
  const foreign = harness();
  foreign.cart.items.push({
    id: randomUUID(),
    productId: randomUUID(),
    quantity: 1,
    unitPrice: "1.00",
  });
  await assert.rejects(foreign.runner.seed(), /foreign_cart/);
  assert.equal(foreign.products.size, 0);
  const h = harness();
  await h.runner.seed();
  const p = h.products.get(h.state.products.base.id);
  p.price = 999;
  await assert.rejects(h.runner.seed(), /product_drift/);
  assert.equal(p.price, 999);
  await assert.rejects(h.runner.reset(), /product_drift/);
  assert.equal(h.products.size, 3);
});

test("expired Cart refreshes without creating another Order, even after receipt replay expiry", async () => {
  const h = harness();
  await h.runner.seed();
  h.advance(8 * 24 * 60 * 60_000);
  assert.equal(await h.runner.verify(), false);
  const checkouts = h.calls.filter(
    (c) => c.operation === "orders_checkout",
  ).length;
  await h.restart().seed();
  assert.equal(h.orders.size, 7);
  assert.equal(h.cart.items.length, 3);
  assert.equal(
    h.calls.filter((c) => c.operation === "orders_checkout").length,
    checkouts,
  );
});

test("reset retains immutable history/customer, uses only owned rows and permits recreation", async () => {
  const h = harness();
  await h.runner.seed();
  const external = { id: randomUUID(), slug: "external", sku: "EXTERNAL" };
  h.products.set(external.id, external);
  const oldGeneration = h.state.generation;
  await h.runner.reset();
  assert.equal(h.cart.items.length, 0);
  assert.deepEqual([...h.products.keys()], [external.id]);
  assert.equal(h.orders.size, 7);
  assert.equal(h.state.customerId, h.userId);
  assert.notEqual(h.state.generation, oldGeneration);
  assert.equal(h.state.history.length, 1);
  await h.restart().seed();
  assert.equal(h.orders.size, 14);
  assert.equal(h.products.size, 4);
});

test("reset resumes after a lost deletion reply and discovers a lost Checkout reply", async () => {
  const h = harness();
  await h.runner.seed();
  h.api.fault = (op) => op === "admin_products_hard_delete";
  await assert.rejects(h.runner.reset(), /fixture_lost_reply/);
  await h.restart().reset();
  assert.equal(h.products.size, 0);
  assert.equal(h.orders.size, 7);
  const partial = harness();
  partial.api.fault = (op) => op === "orders_checkout";
  await assert.rejects(partial.runner.seed(), /fixture_lost_reply/);
  await partial.restart().reset();
  assert.equal(partial.orders.size, 1);
  assert.equal([...partial.orders.values()][0].status, "CANCELLED");
  assert.equal(partial.products.size, 0);
});

test("journal rejects foreign namespace/profile, credentials and arbitrary operations", () => {
  for (const alter of [
    (s) => (s.namespace = "foreign"),
    (s) => (s.profile = "other"),
    (s) => (s.customerId = "invalid"),
    (s) => (s.accessToken = "secret"),
    (s) =>
      (s.commands.bad = {
        operation: "auth_register",
        identity: "customer",
        input: {},
        key: randomUUID(),
      }),
  ]) {
    const state = emptyCommerceState();
    alter(state);
    assert.throws(() => validateCommerceState(state));
  }
});

test("unseeded verify/reset do not create commerce records or grow retained history", async () => {
  const h = harness();
  await assert.rejects(h.runner.verify(), /seed_incomplete/);
  await h.runner.reset();
  await h.runner.reset();
  assert.equal(h.calls.length, 0);
  assert.equal(h.state.history.length, 0);
});

test("reset settles already-journalled lost payment/status replies without creating new purchases", async () => {
  for (const operation of [
    "orders_demo_payment_start",
    "admin_orders_demo_payment_outcome",
    "admin_orders_status",
  ]) {
    const h = harness();
    h.api.fault = (op) => op === operation;
    await assert.rejects(h.runner.seed(), /fixture_lost_reply/);
    const existing = h.orders.size;
    await h.restart().reset();
    assert.equal(h.orders.size, existing);
    assert.equal(h.products.size, 0);
    assert.ok(
      [...h.orders.values()].every((row) =>
        ["CANCELLED", "PAID", "FULFILLED"].includes(row.status),
      ),
    );
  }
});

test("reset discovers lost catalogue creation replies without creating extra fixture products", async () => {
  for (const operation of [
    "admin_products_create",
    "admin_products_variants_create",
    "admin_products_update",
    "orders_cart_add",
  ]) {
    const h = harness();
    h.api.fault = (op) => op === operation;
    await assert.rejects(h.runner.seed(), /fixture_lost_reply/);
    const creates = h.calls.filter(
      (row) => row.operation === "admin_products_create",
    ).length;
    await h.restart().reset();
    assert.equal(h.products.size, 0);
    assert.equal(h.orders.size, 0);
    assert.equal(
      h.calls.filter((row) => row.operation === "admin_products_create").length,
      creates,
    );
  }
});

test("journal target/customer drift is rejected before commerce mutations", async () => {
  for (const alter of [
    (s) => (s.customerId = randomUUID()),
    (s) => (s.target = "http://localhost:3009"),
  ]) {
    const h = harness();
    await h.runner.seed();
    const count = h.calls.filter((row) => row.input.idempotencyKey).length;
    h.mutateSaved(alter);
    await assert.rejects(h.restart().seed(), /mismatch/);
    assert.equal(
      h.calls.filter((row) => row.input.idempotencyKey).length,
      count,
    );
  }
});

test("CLI plans both commerce profiles without contacting services and preserves D1 dispatch", () => {
  const script = fileURLToPath(new URL("./run.mjs", import.meta.url));
  for (const profile of ["showcase", "limits"]) {
    const result = spawnSync(
      process.execPath,
      [script, "plan", "--commerce", profile],
      { encoding: "utf8", timeout: 10_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.counts.orders, 7);
    assert.equal(plan.counts.products, 3);
    assert.equal(plan.profile, profile);
  }
  const d1 = spawnSync(process.execPath, [script, "plan"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(d1.error);
  assert.equal(d1.status, 0, d1.stderr);
  assert.equal(JSON.parse(d1.stdout).namespace, "nebula-demo-d1-v1");
});

test("named journal preserves D1, isolates profiles and rejects concurrent/path-traversal runs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nebula-commerce-test-"));
  const parent = await realpath(tmpdir());
  try {
    await assert.rejects(
      withNamedJournal(directory, async () => {}, {
        name: "../escape",
        createState: emptyCommerceState,
        validate: validateCommerceState,
      }),
      /journal_name_invalid/,
    );
    await withJournal(directory, async ({ state, save }) => {
      state.profiles.showcase = "original";
      await save();
    });
    const before = await readFile(join(directory, "d1.json"), "utf8");
    await withCommerceJournal(directory, async ({ state, save }) => {
      state.currency = "EUR";
      await save();
      await assert.rejects(
        withCommerceJournal(directory, async () => {}),
        /already_locked/,
      );
      await withCommerceJournal(
        directory,
        async ({ save }) => save(),
        "limits",
      );
    });
    assert.equal(await readFile(join(directory, "d1.json"), "utf8"), before);
    assert.equal(
      JSON.parse(await readFile(join(directory, "d2-showcase.json"), "utf8"))
        .currency,
      "EUR",
    );
  } finally {
    const actual = await realpath(directory);
    assert.equal(dirname(actual).toLowerCase(), parent.toLowerCase());
    assert.ok(basename(actual).startsWith("nebula-commerce-test-"));
    await rm(actual, { recursive: true, force: true });
  }
});

test("customer uses mobile client, preserves D1 user denial identity, and logs out through the correct clients", async () => {
  const previous = globalThis.fetch,
    calls = [],
    id = randomUUID();
  let registered = false,
    api;
  globalThis.fetch = async (url, init) => {
    const client = init.headers["X-Nebula-Client-ID"];
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ url, client, body, headers: init.headers });
    const response = (data, status = 200, headers = {}) =>
      new globalThis.Response(JSON.stringify({ data }), { status, headers });
    if (url.endsWith("/auth/register")) {
      registered = true;
      return response({ id }, 201);
    }
    if (url.endsWith("/auth/login")) {
      if (client === "mobile-local" && !registered)
        return new globalThis.Response(
          JSON.stringify({ error: { code: "UNAUTHENTICATED" } }),
          { status: 401 },
        );
      return response(
        {
          accessToken:
            client === "mobile-local" ? "customer-token" : "admin-token",
          ...(client === "mobile-local"
            ? { refreshToken: "refresh-customer" }
            : {}),
        },
        200,
        client === "mobile-local"
          ? {}
          : { "Set-Cookie": "session=test; HttpOnly" },
      );
    }
    if (url.endsWith("/auth/me"))
      return response({
        id,
        role: "user",
        email: "demo-d2-showcase@example.com",
      });
    return response({ success: true });
  };
  try {
    api = await connectGateway(
      {},
      {
        customer: {
          email: "demo-d2-showcase@example.com",
          password: "Fixture123!",
        },
      },
    );
    assert.equal((await api.customer()).id, id);
    await api.result("orders_cart_get", {}, "customer");
    await api.result(
      "admin_products_create",
      { body: { title: "Denied" } },
      "user",
    );
    await api.close();
    api = null;
    assert.equal(
      calls.find((c) => c.url.endsWith("/orders/cart")).client,
      "mobile-local",
    );
    assert.equal(
      calls.find((c) => c.url.endsWith("/admin/products")).client,
      "admin-web-local",
    );
    const logout = calls.filter((c) => c.url.endsWith("/auth/logout"));
    assert.equal(logout.length, 3);
    assert.deepEqual(logout.find((c) => c.client === "mobile-local").body, {
      refreshToken: "refresh-customer",
    });
  } finally {
    try {
      if (api) await api.close();
    } finally {
      globalThis.fetch = previous;
    }
  }
});
