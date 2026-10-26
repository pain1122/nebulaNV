import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";

// Runs inside the existing Checkout fixture, before its catalogue prices change.
// Owner SQL covers outages/races; this proof covers actual signed Gateway wiring.
export async function runDemoPayment({
  first,
  adminCall,
  customerCall,
  customerRequest,
  otherCustomerRequest,
  adminRequest,
  stock,
}) {
  const log = (name) =>
    process.stdout.write(`[d2-demo-payment-live] ${name}=ok\n`);
  const original = await stock();
  let current = await customerCall("orders_get", { path: { id: first.id } });
  const commercial = ({ status, version, updatedAt, ...saved }) => {
    void [status, version, updatedAt];
    return saved;
  };
  const verify = (reply, expectedStatus, state, version) => {
    assert.deepEqual(commercial(reply.order), commercial(first));
    assert.equal(reply.order.status, expectedStatus);
    assert.equal(reply.order.version, version);
    assert.equal(reply.attempt.mode, "DEMO");
    assert.equal(reply.attempt.state, state);
    assert.equal(reply.attempt.orderId, first.id);
    assert.equal(reply.attempt.amount, first.total);
    assert.equal(reply.attempt.currency, first.currency);
    assert.equal(reply.attempt.failureCode, "");
    current = reply.order;
  };
  async function begin() {
    const input = {
      path: { id: first.id },
      body: { expectedVersion: current.version },
      idempotencyKey: randomUUID(),
    };
    const reply = await customerCall("orders_demo_payment_start", input);
    verify(
      reply,
      "PAYMENT_PROCESSING",
      "PROCESSING",
      input.body.expectedVersion + 1,
    );
    assert.deepEqual(
      await customerCall("orders_demo_payment_start", input),
      reply,
    );
    return reply;
  }
  async function outcome(attemptId, value) {
    const input = {
      path: { id: first.id, attemptId },
      body: { expectedVersion: current.version, outcome: value },
      idempotencyKey: randomUUID(),
    };
    const reply = await adminCall("admin_orders_demo_payment_outcome", input);
    verify(
      reply,
      value === "UNKNOWN"
        ? "PAYMENT_PROCESSING"
        : value === "SUCCEEDED"
          ? "PAID"
          : "PENDING",
      value === "UNKNOWN" ? "PROCESSING" : value,
      input.body.expectedVersion + (value === "UNKNOWN" ? 0 : 1),
    );
    assert.equal(reply.attempt.id, attemptId);
    assert.deepEqual(
      await adminCall("admin_orders_demo_payment_outcome", input),
      reply,
    );
    return reply;
  }
  const forbiddenStart = await adminRequest("orders_demo_payment_start", {
    path: { id: first.id },
    body: { expectedVersion: current.version },
  });
  assert.equal(forbiddenStart.status, 403);
  const wrongOwner = await otherCustomerRequest("orders_demo_payment_start", {
    path: { id: first.id },
    body: { expectedVersion: current.version },
  });
  assert.equal(wrongOwner.status, 404);
  const started = await begin();
  assert.deepEqual(
    await stock(),
    original,
    "first_start_must_not_deduct_again",
  );
  const forbiddenOutcome = await customerRequest(
    "admin_orders_demo_payment_outcome",
    {
      path: { id: first.id, attemptId: started.attempt.id },
      body: { expectedVersion: current.version, outcome: "SUCCEEDED" },
    },
  );
  assert.equal(forbiddenOutcome.status, 403);
  const wrongAttempt = await adminRequest("admin_orders_demo_payment_outcome", {
    path: { id: first.id, attemptId: randomUUID() },
    body: { expectedVersion: current.version, outcome: "FAILED" },
  });
  assert.equal(wrongAttempt.status, 404);
  const stale = await adminRequest("admin_orders_demo_payment_outcome", {
    path: { id: first.id, attemptId: started.attempt.id },
    body: { expectedVersion: current.version - 1, outcome: "FAILED" },
  });
  assert.equal(stale.status, 409);
  await outcome(started.attempt.id, "UNKNOWN");
  assert.deepEqual(await stock(), original);
  log("customer-start-admin-outcome-authority-unknown-retains-stock");
  await outcome(started.attempt.id, "FAILED");
  const restored = await stock();
  assert.equal(restored.base, original.base + 2);
  assert.equal(restored.variant, original.variant + 2);
  log("confirmed-failure-pending-releases-once-replay");
  const retry = await begin();
  assert.notEqual(retry.attempt.id, started.attempt.id);
  assert.deepEqual(await stock(), original);
  await outcome(retry.attempt.id, "CANCELLED");
  assert.deepEqual(await stock(), restored);
  log("retry-reserves-current-selection-cancel-releases-once");
  const final = await begin();
  assert.notEqual(final.attempt.id, retry.attempt.id);
  await outcome(final.attempt.id, "UNKNOWN");
  assert.deepEqual(await stock(), original);
  await outcome(final.attempt.id, "SUCCEEDED");
  assert.deepEqual(await stock(), original, "success_must_not_deduct_twice");
  const fulfilled = await adminCall("admin_orders_status", {
    path: { id: first.id },
    body: { status: "FULFILLED", expectedVersion: current.version },
  });
  assert.equal(fulfilled.status, "FULFILLED");
  assert.equal(fulfilled.version, current.version + 1);
  assert.deepEqual(commercial(fulfilled), commercial(first));
  log("unknown-reconciles-success-immutable-order-fulfillment");
}
