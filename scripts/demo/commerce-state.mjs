import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  COMMERCE_NAMESPACE,
  COMMERCE_SCENARIOS,
  buildCommerceCatalog,
} from "./commerce-catalog.mjs";
import { withNamedJournal } from "./state.mjs";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const operations = new Set([
  "admin_products_create",
  "admin_products_variants_create",
  "admin_products_update",
  "orders_checkout",
  "orders_demo_payment_start",
  "admin_orders_demo_payment_outcome",
  "admin_orders_status",
  "admin_products_hard_delete",
  "orders_cart_add",
  "orders_cart_remove",
]);
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
export function emptyCommerceState(profile = "showcase") {
  buildCommerceCatalog(profile);
  return {
    namespace: COMMERCE_NAMESPACE,
    schemaVersion: 1,
    profile,
    generation: randomUUID(),
    target: null,
    currency: null,
    customerId: null,
    products: {},
    orders: {},
    commands: {},
    history: [],
    ready: false,
    resetting: false,
    cart: null,
  };
}
export function validateCommerceState(state, profile = state?.profile) {
  assert.ok(object(state), "demo_d2_invalid_state");
  assert.equal(
    state.namespace,
    COMMERCE_NAMESPACE,
    "demo_d2_namespace_mismatch",
  );
  assert.equal(state.schemaVersion, 1, "demo_d2_state_version_mismatch");
  buildCommerceCatalog(profile);
  assert.equal(state.profile, profile, "demo_d2_profile_mismatch");
  assert.match(state.generation, uuid, "demo_d2_invalid_generation");
  assert.ok(
    typeof state.ready === "boolean" && typeof state.resetting === "boolean",
  );
  assert.ok(state.currency === null || /^[A-Z]{3,8}$/u.test(state.currency));
  assert.ok(state.customerId === null || uuid.test(state.customerId));
  assert.ok(
    state.target === null ||
      /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(state.target),
  );
  for (const kind of ["products", "orders", "commands"])
    assert.ok(object(state[kind]), "demo_d2_invalid_entries");
  const keys = new Set(COMMERCE_SCENARIOS.map((s) => s.key));
  for (const [key, entry] of Object.entries(state.products)) {
    assert.ok(
      ["base", "variant", "free"].includes(key),
      "demo_d2_unknown_product",
    );
    assert.match(entry.id, uuid);
  }
  for (const [key, entry] of Object.entries(state.orders)) {
    assert.ok(keys.has(key), "demo_d2_unknown_scenario");
    assert.match(entry.id, uuid);
  }
  for (const [key, command] of Object.entries(state.commands)) {
    assert.match(key, /^[a-z0-9-]{1,100}$/u);
    assert.ok(operations.has(command.operation), "demo_d2_invalid_command");
    assert.ok(["admin", "customer"].includes(command.identity));
    assert.match(command.key, uuid);
    assert.ok(object(command.input));
  }
  assert.ok(Array.isArray(state.history));
  // Sessions/credentials must never become a journal field, even in replies.
  function noSecrets(value) {
    if (!object(value) && !Array.isArray(value)) return;
    for (const [key, item] of Object.entries(value)) {
      assert.doesNotMatch(
        key,
        /password|token|cookie|authorization|secret/iu,
        "demo_d2_journal_secret",
      );
      noSecrets(item);
    }
  }
  noSecrets(state);
  return state;
}
export function withCommerceJournal(directory, action, profile = "showcase") {
  buildCommerceCatalog(profile);
  return withNamedJournal(directory, action, {
    name: `d2-${profile}`,
    createState: () => emptyCommerceState(profile),
    validate: (state) => validateCommerceState(state, profile),
  });
}
