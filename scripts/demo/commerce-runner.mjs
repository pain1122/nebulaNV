import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import console from "node:console";
import {
  buildCommerceCatalog,
  COMMERCE_MAX_QUANTITY,
} from "./commerce-catalog.mjs";
import { emptyCommerceState } from "./commerce-state.mjs";

const copy = (value) => globalThis.structuredClone(value);
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const facts = ({ status, version, updatedAt, ...commercial }) => {
  void [status, version, updatedAt];
  return commercial;
};
const money = (value) => Number(value).toFixed(2);

export function createCommerceRunner({
  api,
  state,
  save,
  profile = "showcase",
  now = Date.now,
  log = console.log,
}) {
  const plan = buildCommerceCatalog(profile);
  const customer = (operation, input) => api.call(operation, input, "customer");
  const product = (id) => api.call("admin_products_get", { path: { id } });
  const order = (id) => customer("orders_get", { path: { id } });
  const cart = () => customer("orders_cart_get");
  const label = (key) => `${plan.namespace}-${state.generation}-${key}`;
  async function lookupProducts(slug) {
    const rows = await api.call("admin_products_list", {
      query: { q: slug, includeDeleted: true, page: 1, limit: 100 },
    });
    assert.ok(Array.isArray(rows), "demo_d2_product_list_response_invalid");
    return rows;
  }

  async function bind({ reset = false } = {}) {
    assert.equal(state.profile, profile, "demo_d2_profile_mismatch");
    assert.ok(reset || !state.resetting, "demo_d2_reset_in_progress");
    if (state.target)
      assert.equal(state.target, api.baseUrl, "demo_d2_target_mismatch");
    const who = await api.customer();
    assert.equal(who.role, "user", "demo_d2_customer_role");
    if (state.customerId)
      assert.equal(state.customerId, who.id, "demo_d2_customer_mismatch");
    const setting = await api.call("settings_get", {
      path: { ns: "pricing", key: "default_currency" },
    });
    assert.equal(setting.found, true, "demo_d2_currency_missing");
    assert.match(setting.value, /^[A-Z]{3,8}$/u);
    if (state.currency && !reset)
      assert.equal(
        state.currency,
        setting.value,
        "demo_d2_currency_changed_reset_required",
      );
    if (state.definitionHash)
      assert.equal(
        state.definitionHash,
        hash(plan),
        "demo_d2_definition_changed",
      );
    state.target = api.baseUrl;
    state.customerId = who.id;
    state.currency ??= setting.value;
    state.definitionHash ??= hash(plan);
    await save();
  }
  async function mutation(step, operation, input, identity = "admin") {
    let entry = state.commands[step];
    if (!entry) {
      entry = state.commands[step] = {
        operation,
        identity,
        input: copy(input),
        key: randomUUID(),
      };
      await save(); // Persist original intent before any remote write.
    } else {
      assert.equal(entry.operation, operation, "demo_d2_command_drift");
      assert.equal(entry.identity, identity, "demo_d2_command_drift");
      const intent = (value) => {
        const result = copy(value);
        if (result.body) delete result.body.expectedVersion;
        return result;
      };
      assert.deepEqual(
        intent(entry.input),
        intent(input),
        "demo_d2_command_drift",
      );
    }
    if (!Object.hasOwn(entry, "reply")) {
      entry.reply = await api.call(
        operation,
        { ...copy(entry.input), idempotencyKey: entry.key },
        identity,
      );
      await save();
    }
    return copy(entry.reply);
  }
  function ownProduct(row, item) {
    assert.equal(row.id, state.products[item.key]?.id ?? row.id);
    assert.equal(row.slug, label(item.key), "demo_d2_product_ownership");
    assert.equal(
      row.sku,
      label(item.key).toUpperCase(),
      "demo_d2_product_ownership",
    );
    assert.equal(row.title, item.title, "demo_d2_product_drift");
    assert.equal(row.currency, state.currency, "demo_d2_product_drift");
    assert.equal(money(row.price), money(item.price), "demo_d2_product_drift");
    assert.equal(
      row.selectionMode,
      item.selectionMode,
      "demo_d2_product_drift",
    );
    assert.equal(
      row.trackInventory,
      item.trackInventory,
      "demo_d2_product_drift",
    );
    assert.equal(row.deletedAt || "", "", "demo_d2_product_deleted");
  }
  function selected(row) {
    const matches = row.variants.filter(
      (v) => v.sku === label("choice").toUpperCase(),
    );
    assert.equal(matches.length, 1, "demo_d2_variant_missing_or_duplicated");
    const choice = matches[0];
    assert.deepEqual(
      choice.options,
      plan.variant.options,
      "demo_d2_variant_drift",
    );
    assert.equal(
      money(choice.priceOverride),
      money(plan.variant.priceOverride),
      "demo_d2_variant_drift",
    );
    assert.equal(choice.active, true, "demo_d2_variant_inactive");
    assert.equal(row.variants.length, 1, "demo_d2_foreign_variant");
    assert.equal(choice.deletedAt || "", "", "demo_d2_variant_deleted");
    return choice;
  }
  async function ensureProducts() {
    for (const item of plan.products) {
      const step = `product-${item.key}`;
      if (!state.products[item.key]) {
        const body = {
          ...item,
          slug: label(item.key),
          sku: label(item.key).toUpperCase(),
          currency: state.currency,
          status: item.key === "variant" ? "DRAFT" : "ACTIVE",
        };
        delete body.key;
        const existing = await lookupProducts(body.slug);
        const matches = existing.filter(
          (row) => row.slug === body.slug || row.sku === body.sku,
        );
        assert.ok(matches.length <= 1, "demo_d2_product_collision");
        if (matches.length) {
          assert.ok(
            state.commands[step],
            "demo_d2_unjournalled_product_collision",
          );
          ownProduct(matches[0], item);
          state.commands[step].reply = copy(matches[0]);
          await save();
        }
        const row = await mutation(step, "admin_products_create", { body });
        state.products[item.key] = { id: row.id };
        await save();
      }
      let row = await product(state.products[item.key].id);
      ownProduct(row, item);
      if (item.key === "variant") {
        const sku = label("choice").toUpperCase();
        if (!row.variants.some((v) => v.sku === sku)) {
          row = await mutation(
            "variant-choice",
            "admin_products_variants_create",
            {
              path: { id: row.id },
              body: { ...plan.variant, sku, expectedVersion: row.version },
            },
          );
        } else if (
          state.commands["variant-choice"] &&
          !Object.hasOwn(state.commands["variant-choice"], "reply")
        ) {
          state.commands["variant-choice"].reply = copy(row);
          await save();
        }
        const choice = selected(row);
        state.products.variant.variantId = choice.id;
        await save();
        if (row.status !== "ACTIVE")
          await mutation("activate-variant", "admin_products_update", {
            path: { id: row.id },
            body: { expectedVersion: row.version, status: "ACTIVE" },
          });
      } else assert.equal(row.status, "ACTIVE");
    }
  }
  const ownedIds = () =>
    new Set(Object.values(state.products).map((p) => p.id));
  function ownCart(current) {
    for (const item of current.items) {
      assert.ok(
        ownedIds().has(item.productId),
        "demo_d2_foreign_cart_untouched",
      );
      const isVariant = item.productId === state.products.variant?.id;
      assert.equal(
        item.variantId || "",
        isVariant ? state.products.variant.variantId : "",
        "demo_d2_foreign_selection",
      );
    }
  }
  async function fillCart(quantities, phase) {
    let current = await cart();
    ownCart(current);
    const stamp = hash([phase, current.id, current.expiresAt]).slice(0, 24);
    for (const item of plan.products) {
      const id = state.products[item.key].id;
      const found = current.items.filter((row) => row.productId === id);
      assert.ok(found.length <= 1, "demo_d2_duplicate_selection");
      if (found.length)
        assert.equal(
          found[0].quantity,
          quantities[item.key],
          "demo_d2_cart_drift",
        );
      else {
        await mutation(
          `cart-${stamp}-${item.key}`,
          "orders_cart_add",
          {
            body: {
              productId: id,
              quantity: quantities[item.key],
              ...(item.key === "variant"
                ? { variantId: state.products.variant.variantId }
                : {}),
            },
          },
          "customer",
        );
        current = await cart();
        ownCart(current);
      }
    }
    assert.equal(current.items.length, 3);
    assert.equal(current.currency, state.currency);
    return current;
  }
  function ownOrder(row, scenario, snapshot) {
    assert.equal(row.userId, state.customerId, "demo_d2_order_owner");
    assert.equal(
      JSON.parse(row.meta || "{}").note,
      label(scenario.key),
      "demo_d2_order_identity",
    );
    assert.equal(row.checkoutMode, "DEMO_NO_PAYMENT");
    assert.equal(row.currency, state.currency);
    assert.equal(row.total, plan.orderTotal);
    assert.equal(row.items.length, 3);
    for (const item of plan.products) {
      const lines = row.items.filter(
        (line) => line.productId === state.products[item.key].id,
      );
      assert.equal(lines.length, 1, "demo_d2_order_selection");
      const line = lines[0];
      assert.equal(line.quantity, plan.orderQuantities[item.key]);
      assert.equal(
        line.unitPrice,
        money(item.key === "variant" ? plan.variant.priceOverride : item.price),
      );
      assert.equal(
        line.variantId || "",
        item.key === "variant" ? state.products.variant.variantId : "",
      );
      assert.deepEqual(
        line.selectedOptions,
        item.key === "variant" ? plan.variant.options : {},
      );
    }
    if (snapshot)
      assert.deepEqual(
        facts(row),
        facts(snapshot),
        "demo_d2_order_snapshot_drift",
      );
  }
  async function checkout(scenario) {
    const step = `order-${scenario.key}`;
    if (!state.commands[step]) {
      const current = await fillCart(plan.orderQuantities, scenario.key);
      assert.equal(current.total, plan.orderTotal);
    }
    const snapshot = await mutation(
      step,
      "orders_checkout",
      { body: { note: label(scenario.key) } },
      "customer",
    );
    ownOrder(snapshot, scenario);
    if (!state.orders[scenario.key]) {
      state.orders[scenario.key] = { id: snapshot.id, snapshot };
      await save();
    }
    assert.equal(state.orders[scenario.key].id, snapshot.id);
    return snapshot;
  }
  async function start(scenario, round) {
    const current = await order(state.orders[scenario.key].id);
    const step = `start-${scenario.key}-${round}`;
    const reply = await mutation(
      step,
      "orders_demo_payment_start",
      {
        path: { id: current.id },
        body: { expectedVersion: current.version },
      },
      "customer",
    );
    paymentFacts(reply, scenario, "PROCESSING");
    assert.equal(
      reply.order.version,
      state.commands[step].input.body.expectedVersion + 1,
    );
    return reply;
  }
  function paymentFacts(reply, scenario, value) {
    ownOrder(reply.order, scenario, state.orders[scenario.key].snapshot);
    assert.equal(reply.attempt.orderId, reply.order.id);
    assert.equal(reply.attempt.mode, "DEMO");
    assert.equal(reply.attempt.currency, state.currency);
    assert.equal(reply.attempt.amount, plan.orderTotal);
    assert.equal(reply.attempt.failureCode, "");
    assert.equal(
      reply.attempt.state,
      value === "UNKNOWN" ? "PROCESSING" : value,
    );
    assert.equal(
      reply.order.status,
      ["PROCESSING", "UNKNOWN"].includes(value)
        ? "PAYMENT_PROCESSING"
        : value === "SUCCEEDED"
          ? "PAID"
          : "PENDING",
    );
  }
  async function outcome(scenario, round, attempt, value) {
    const current = await order(state.orders[scenario.key].id);
    const step = `outcome-${scenario.key}-${round}-${value.toLowerCase()}`;
    const reply = await mutation(step, "admin_orders_demo_payment_outcome", {
      path: { id: current.id, attemptId: attempt.attempt.id },
      body: { expectedVersion: current.version, outcome: value },
    });
    paymentFacts(reply, scenario, value);
    assert.equal(reply.attempt.id, attempt.attempt.id);
    assert.equal(
      reply.order.version,
      state.commands[step].input.body.expectedVersion +
        (value === "UNKNOWN" ? 0 : 1),
    );
    return reply;
  }
  async function status(scenario, value, prefix = "status") {
    const current = await order(state.orders[scenario.key].id);
    const step = `${prefix}-${scenario.key}`;
    const reply = await mutation(step, "admin_orders_status", {
      path: { id: current.id },
      body: { expectedVersion: current.version, status: value },
    });
    ownOrder(reply, scenario, state.orders[scenario.key].snapshot);
    assert.equal(reply.status, value);
    assert.equal(
      reply.version,
      state.commands[step].input.body.expectedVersion + 1,
    );
    return reply;
  }
  async function seedScenario(scenario) {
    await checkout(scenario);
    if (scenario.key === "cancelled") await status(scenario, "CANCELLED");
    else if (scenario.key !== "pending") {
      const attempt = await start(scenario, 1);
      if (scenario.key === "processing")
        await outcome(scenario, 1, attempt, "UNKNOWN");
      else if (scenario.key === "failed")
        await outcome(scenario, 1, attempt, "FAILED");
      else if (scenario.key === "payment-cancelled")
        await outcome(scenario, 1, attempt, "CANCELLED");
      else {
        if (scenario.key === "paid") {
          await outcome(scenario, 1, attempt, "FAILED");
          const retry = await start(scenario, 2);
          assert.notEqual(
            retry.attempt.id,
            attempt.attempt.id,
            "demo_d2_retry_attempt_reused",
          );
          await outcome(scenario, 2, retry, "SUCCEEDED");
        } else await outcome(scenario, 1, attempt, "SUCCEEDED");
        if (scenario.key === "fulfilled") await status(scenario, "FULFILLED");
      }
    }
    ownOrder(
      await order(state.orders[scenario.key].id),
      scenario,
      state.orders[scenario.key].snapshot,
    );
  }
  async function verifyOrders({ final = true } = {}) {
    for (const scenario of plan.scenarios) {
      const entry = state.orders[scenario.key];
      if (!entry) {
        assert.ok(!final, "demo_d2_missing_order");
        continue;
      }
      const row = await order(entry.id);
      ownOrder(row, scenario, entry.snapshot);
      if (final)
        assert.equal(
          row.status,
          scenario.status,
          `demo_d2_status_${scenario.key}`,
        );
    }
  }
  async function verifyProducts({ stock = true } = {}) {
    const allocated = plan.scenarios.filter((s) => s.allocated).length;
    for (const item of plan.products) {
      const entry = state.products[item.key];
      assert.ok(entry, "demo_d2_missing_product");
      const row = await product(entry.id);
      ownProduct(row, item);
      assert.equal(row.status, "ACTIVE");
      if (item.key === "variant") {
        const choice = selected(row);
        assert.equal(choice.id, entry.variantId);
        if (stock)
          assert.equal(
            choice.stockQuantity,
            plan.variant.stockQuantity - allocated,
          );
      } else if (stock)
        assert.equal(
          row.stockQuantity,
          item.stockQuantity - (item.key === "base" ? allocated * 2 : 0),
        );
    }
  }
  async function verifyCart() {
    const current = await cart();
    ownCart(current);
    if (
      !current.items.length &&
      state.cart &&
      Date.parse(state.cart.expiresAt) <= now()
    ) {
      log(
        "[demo-d2] editable Cart expired normally; seed refreshes it without new Orders",
      );
      return false;
    }
    assert.equal(current.items.length, 3, "demo_d2_cart_missing");
    for (const item of plan.products)
      assert.equal(
        current.items.find(
          (row) => row.productId === state.products[item.key].id,
        )?.quantity,
        plan.cart[item.key],
      );
    assert.equal(current.total, plan.cartTotal);
    assert.equal(current.currency, state.currency);
    return true;
  }
  async function verify() {
    assert.ok(state.ready, "demo_d2_seed_incomplete");
    await bind();
    await verifyProducts();
    await verifyOrders();
    const activeCart = await verifyCart();
    log(
      `[demo-d2] verified profile=${profile} orders=7 products=3 cart=${activeCart ? "ready" : "expired"}`,
    );
    return activeCart;
  }
  async function seed() {
    await bind();
    if (state.ready) {
      const active = await verify();
      if (!active) {
        state.cart = await fillCart(plan.cart, "editable");
        await save();
        await verify();
      }
      log("[demo-d2] rerun verified existing Orders; no new purchase");
      return;
    }
    ownCart(await cart());
    await ensureProducts();
    for (const scenario of plan.scenarios) await seedScenario(scenario);
    state.cart = await fillCart(plan.cart, "editable");
    if (profile === "limits")
      for (const quantity of [0, COMMERCE_MAX_QUANTITY + 1]) {
        const denied = await api.result(
          "orders_cart_add",
          {
            body: { productId: state.products.free.id, quantity },
            idempotencyKey: randomUUID(),
          },
          "customer",
        );
        assert.equal(denied.status, 400, "demo_d2_quantity_limit_not_denied");
      }
    state.ready = true;
    await save();
    await verify();
    log("[demo-d2] seed complete; immutable Order history is retained");
  }
  async function reset() {
    if (
      !state.resetting &&
      !Object.keys(state.products).length &&
      !Object.keys(state.orders).length &&
      !Object.keys(state.commands).length
    ) {
      log(
        "[demo-d2] no owned working fixtures to reset; retained history unchanged",
      );
      return;
    }
    await bind({ reset: true });
    ownCart(await cart());
    // A create may have committed before its reply/ID reached the journal.
    // Recover only an existing exact owned match; reset never creates products.
    for (const item of plan.products) {
      const command = state.commands[`product-${item.key}`];
      if (state.products[item.key] || !command) continue;
      const listing = await lookupProducts(label(item.key));
      const matches = listing.filter((row) => row.slug === label(item.key));
      assert.equal(
        matches.length,
        1,
        "demo_d2_pending_create_unresolved_seed_to_resume",
      );
      ownProduct(matches[0], item);
      if (command.reply) assert.equal(matches[0].id, command.reply.id);
      state.products[item.key] = { id: matches[0].id };
      command.reply ??= copy(matches[0]);
      await save();
    }
    // Finish only already-journalled durable writes with their original keys.
    // A lost Checkout reply must not orphan its newly created Order on reset.
    for (const scenario of plan.scenarios) {
      if (
        state.commands[`order-${scenario.key}`] &&
        !state.orders[scenario.key]
      )
        await checkout(scenario);
      for (const round of [1, 2]) {
        const entry = state.commands[`start-${scenario.key}-${round}`];
        if (entry && !Object.hasOwn(entry, "reply"))
          await start(scenario, round);
      }
      for (const [step, entry] of Object.entries(state.commands)) {
        if (Object.hasOwn(entry, "reply")) continue;
        if (
          step.startsWith(`outcome-${scenario.key}-`) ||
          step === `status-${scenario.key}` ||
          step === `reset-${scenario.key}`
        ) {
          assert.equal(entry.input.path.id, state.orders[scenario.key]?.id);
          await mutation(step, entry.operation, entry.input, entry.identity);
        }
      }
    }
    // Read/verify every owner before the first cancellation/removal.
    await verifyOrders({ final: false });
    if (state.ready && !state.resetting) await verifyProducts();
    const present = [];
    for (const item of plan.products) {
      const entry = state.products[item.key];
      if (!entry) continue;
      const result = await api.result("admin_products_get", {
        path: { id: entry.id },
      });
      if (result.status === 404) {
        assert.ok(state.resetting, "demo_d2_product_missing_before_reset");
        continue;
      }
      assert.ok(result.ok, `demo_d2_reset_read_${result.status}`);
      ownProduct(result.data.data, item);
      if (item.key === "variant" && result.data.data.variants.length)
        selected(result.data.data);
      present.push(entry.id);
    }
    state.resetting = true;
    await save();
    for (const scenario of plan.scenarios) {
      const entry = state.orders[scenario.key];
      if (!entry) continue;
      let current = await order(entry.id);
      if (current.status === "PAYMENT_PROCESSING") {
        const attempt =
          state.commands[`start-${scenario.key}-2`]?.reply ??
          state.commands[`start-${scenario.key}-1`]?.reply;
        assert.ok(attempt?.attempt?.id, "demo_d2_unknown_processing_attempt");
        await outcome(scenario, "reset", attempt, "CANCELLED");
        current = await order(entry.id);
      }
      if (current.status === "PENDING")
        await status(scenario, "CANCELLED", "reset");
    }
    const resetCart = await cart();
    ownCart(resetCart);
    for (const item of resetCart.items)
      await api.call(
        "orders_cart_remove",
        {
          path: { id: item.id },
          idempotencyKey: randomUUID(),
        },
        "customer",
      );
    for (const id of present)
      await mutation(`delete-${id}`, "admin_products_hard_delete", {
        path: { id },
      });
    const history = [
      ...state.history,
      {
        generation: state.generation,
        orders: Object.fromEntries(
          Object.entries(state.orders).map(([key, row]) => [
            key,
            {
              id: row.id,
              checkoutKey: state.commands[`order-${key}`]?.key,
            },
          ]),
        ),
      },
    ];
    const next = emptyCommerceState(profile);
    Object.assign(state, next, {
      history,
      target: state.target,
      customerId: state.customerId,
    });
    await save();
    log(
      "[demo-d2] reset complete; owned working fixtures removed; Order/receipt history and customer retained",
    );
  }
  return { plan, seed, verify, reset };
}
