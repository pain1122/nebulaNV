import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { gatewayOperations } from "../dist/index.js";
import { runOrderCancellation } from "./d2-order-cancellation-live.mjs";

function fixture({
  missingRestore = false,
  doubleCredit = false,
  allowUser = false,
} = {}) {
  const first = {
    id: randomUUID(),
    userId: randomUUID(),
    status: "PENDING",
    version: 1,
    checkoutMode: "DEMO_NO_PAYMENT",
    total: "2.70",
    currency: "USD",
    items: [{ productId: randomUUID(), quantity: 2, unitPrice: "0.10" }],
  };
  let current = globalThis.structuredClone(first);
  let quantities = { base: 8, variant: 2, unmanaged: 0 };
  let savedInput, reply;
  const calls = [];
  function validate(operation, input, mutation = false) {
    assert.ok(gatewayOperations[operation], `unknown_operation_${operation}`);
    assert.equal(input.path.id, first.id);
    if (mutation) {
      assert.equal(gatewayOperations[operation].requiresIdempotencyKey, true);
      assert.ok(input.idempotencyKey);
      assert.deepEqual(Object.keys(input.body).sort(), [
        "expectedVersion",
        "status",
      ]);
      assert.ok(Number.isInteger(input.body.expectedVersion));
      // Real status DTOs reject zero with 400, not an owner conflict.
      assert.ok(input.body.expectedVersion >= 1);
    }
  }
  const clone = (value) => globalThis.structuredClone(value);
  return {
    calls,
    options: {
      first,
      stock: async () => clone(quantities),
      customerCall: async (operation, input) => {
        validate(operation, input);
        assert.equal(operation, "orders_get");
        return clone(current);
      },
      customerRequest: async (operation, input) => {
        validate(operation, input, true);
        return { status: allowUser ? 200 : 403 };
      },
      adminCall: async (operation, input) => {
        validate(operation, input, operation === "admin_orders_status");
        if (operation === "admin_orders_get") return clone(current);
        assert.equal(operation, "admin_orders_status");
        calls.push(clone(input));
        if (reply) {
          assert.deepEqual(input, savedInput);
          if (doubleCredit) quantities.base += 2;
          return clone(reply);
        }
        assert.equal(input.body.expectedVersion, current.version);
        assert.equal(input.body.status, "CANCELLED");
        savedInput = clone(input);
        current = {
          ...current,
          status: "CANCELLED",
          version: current.version + 1,
        };
        if (!missingRestore)
          quantities = { base: 10, variant: 4, unmanaged: 0 };
        reply = clone(current);
        return clone(reply);
      },
      adminRequest: async (operation, input) => {
        validate(operation, input, true);
        calls.push(clone(input));
        // Every negative request must conflict for a concrete state/key reason.
        const keyConflict =
          savedInput &&
          input.idempotencyKey === savedInput.idempotencyKey &&
          JSON.stringify(input.body) !== JSON.stringify(savedInput.body);
        assert.ok(
          keyConflict ||
            input.body.expectedVersion !== current.version ||
            current.status === "CANCELLED",
        );
        return { status: 409 };
      },
    },
  };
}

test("cancellation fixture checks valid version conflicts, stock-once replay and terminal denial", async () => {
  const f = fixture();
  await runOrderCancellation(f.options);
  assert.equal(f.calls.length, 7);
  const cancelled = f.calls.find(
    (row) => row.body.expectedVersion === 1 && row.body.status === "CANCELLED",
  );
  assert.ok(cancelled);
  assert.equal(
    f.calls.filter((row) => row.idempotencyKey === cancelled.idempotencyKey)
      .length,
    4,
  );
});

test("cancellation proof rejects missing stock restoration", async () => {
  await assert.rejects(
    () => runOrderCancellation(fixture({ missingRestore: true }).options),
    /order_cancellation_stock_restored/,
  );
});

test("cancellation proof rejects a second credit on replay", async () => {
  await assert.rejects(
    () => runOrderCancellation(fixture({ doubleCredit: true }).options),
    /order_cancellation_replay_no_credit/,
  );
});

test("cancellation proof preserves customer role denial", async () => {
  await assert.rejects(
    () => runOrderCancellation(fixture({ allowUser: true }).options),
    /order_cancellation_customer_must_be_denied/,
  );
});

test("actual Checkout driver rejects mixed proof modes before contacting Gateway", () => {
  for (const mode of ["--demo-payment", "--recovery"]) {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("./d2-checkout-live.mjs", import.meta.url)),
        mode,
        "--cancellation",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "test",
          NEBULA_LIVE_GATEWAY_BASE_URL: "http://127.0.0.1:1",
        },
        encoding: "utf8",
        timeout: 10_000,
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /d2_proof_modes_must_run_separately/);
    assert.doesNotMatch(result.stderr, /fetch failed/);
  }
});
