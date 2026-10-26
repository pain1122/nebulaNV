import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { gatewayOperations } from "../dist/index.js";
import { runDemoPayment } from "./d2-demo-payment-live.mjs";

function fixture({
  wrongAttemptStatus = 404,
  duplicateStartDeduction = false,
} = {}) {
  const first = {
    id: randomUUID(),
    userId: randomUUID(),
    total: "2.70",
    currency: "USD",
    checkoutMode: "DEMO_NO_PAYMENT",
    status: "PENDING",
    version: 1,
    items: [{ productId: randomUUID(), quantity: 2, unitPrice: "0.10" }],
  };
  let order = globalThis.structuredClone(first),
    allocation = { base: 8, variant: 2 },
    attempt,
    starts = 0;
  const replay = new Map(),
    outcomes = [];
  async function call(operation, input = {}) {
    assert.ok(gatewayOperations[operation], `unknown_operation_${operation}`);
    if (operation === "orders_get") return globalThis.structuredClone(order);
    assert.equal(gatewayOperations[operation].requiresIdempotencyKey, true);
    const key = input.idempotencyKey ?? randomUUID();
    if (replay.has(key)) return globalThis.structuredClone(replay.get(key));
    assert.equal(input.path.id, first.id);
    assert.equal(input.body.expectedVersion, order.version);
    if (operation === "orders_demo_payment_start") {
      assert.deepEqual(Object.keys(input.body), ["expectedVersion"]);
      starts++;
      if (starts > 1 || duplicateStartDeduction)
        allocation = {
          base: allocation.base - 2,
          variant: allocation.variant - 2,
        };
      attempt = {
        id: randomUUID(),
        orderId: first.id,
        mode: "DEMO",
        state: "PROCESSING",
        amount: first.total,
        currency: first.currency,
        failureCode: "",
      };
      order = {
        ...order,
        status: "PAYMENT_PROCESSING",
        version: order.version + 1,
      };
    } else if (operation === "admin_orders_demo_payment_outcome") {
      const value = input.body.outcome;
      assert.equal(input.path.attemptId, attempt.id);
      assert.ok(
        ["UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED"].includes(value),
      );
      outcomes.push(value);
      if (value !== "UNKNOWN") {
        order = {
          ...order,
          status: value === "SUCCEEDED" ? "PAID" : "PENDING",
          version: order.version + 1,
        };
        attempt = { ...attempt, state: value };
        if (value !== "SUCCEEDED")
          allocation = {
            base: allocation.base + 2,
            variant: allocation.variant + 2,
          };
      }
    } else {
      assert.equal(operation, "admin_orders_status");
      assert.equal(input.body.status, "FULFILLED");
      const fulfilled = {
        ...order,
        status: "FULFILLED",
        version: order.version + 1,
      };
      replay.set(key, fulfilled);
      return globalThis.structuredClone(fulfilled);
    }
    const result = {
      order: globalThis.structuredClone(order),
      attempt: globalThis.structuredClone(attempt),
    };
    replay.set(key, result);
    return result;
  }
  return {
    first,
    outcomes,
    options: {
      first,
      adminCall: call,
      customerCall: call,
      customerRequest: async () => ({ status: 403 }),
      otherCustomerRequest: async () => ({ status: 404 }),
      adminRequest: async (operation, input) => ({
        status:
          operation === "orders_demo_payment_start"
            ? 403
            : input.path.attemptId !== attempt.id
              ? wrongAttemptStatus
              : 409,
      }),
      stock: async () => globalThis.structuredClone(allocation),
    },
  };
}

test("payment live fixture uses current operation names/versions and exercises failure, retry cancellation, unknown and success", async () => {
  const f = fixture();
  await runDemoPayment(f.options);
  assert.deepEqual(f.outcomes, [
    "UNKNOWN",
    "FAILED",
    "CANCELLED",
    "UNKNOWN",
    "SUCCEEDED",
  ]);
});
test("payment proof detects a second first-start stock deduction", async () => {
  await assert.rejects(
    () => runDemoPayment(fixture({ duplicateStartDeduction: true }).options),
    /first_start_must_not_deduct_again/,
  );
});
test("payment proof preserves wrong-attempt denial assertion", async () => {
  await assert.rejects(
    () => runDemoPayment(fixture({ wrongAttemptStatus: 200 }).options),
    { code: "ERR_ASSERTION" },
  );
});
