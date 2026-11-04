import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";

// Reuses Checkout's owned fixture: two base units, two variant units and a free
// unmanaged selection. Owner SQL separately covers ambiguous replies/recovery.
export async function runOrderCancellation({
  first,
  adminCall,
  adminRequest,
  customerCall,
  customerRequest,
  stock,
}) {
  const log = (name) =>
    process.stdout.write(`[d2-order-cancellation-live] ${name}=ok\n`);
  const original = await stock();
  assert.equal(original.unmanaged, 0);
  const current = await adminCall("admin_orders_get", {
    path: { id: first.id },
  });
  assert.equal(current.status, "PENDING");
  const input = {
    path: { id: first.id },
    body: { status: "CANCELLED", expectedVersion: current.version },
    idempotencyKey: randomUUID(),
  };
  assert.equal(
    (await customerRequest("admin_orders_status", input)).status,
    403,
    "order_cancellation_customer_must_be_denied",
  );
  assert.equal(
    (
      await adminRequest("admin_orders_status", {
        ...input,
        idempotencyKey: randomUUID(),
        body: { ...input.body, expectedVersion: current.version + 1 },
      })
    ).status,
    409,
  );
  assert.deepEqual(await stock(), original);
  assert.deepEqual(
    await customerCall("orders_get", { path: input.path }),
    current,
  );
  log("role-version-conflict-preserves-order-stock");

  const cancelled = await adminCall("admin_orders_status", input);
  const { status, version, updatedAt, ...commercial } = cancelled;
  const {
    status: oldStatus,
    version: oldVersion,
    updatedAt: oldUpdatedAt,
    ...originalCommercial
  } = first;
  void [updatedAt, oldStatus, oldVersion, oldUpdatedAt];
  assert.equal(status, "CANCELLED");
  assert.equal(version, current.version + 1);
  assert.deepEqual(commercial, originalCommercial);
  const restored = {
    ...original,
    base: original.base + 2,
    variant: original.variant + 2,
  };
  assert.deepEqual(
    await stock(),
    restored,
    "order_cancellation_stock_restored",
  );
  assert.deepEqual(
    await customerCall("orders_get", { path: input.path }),
    cancelled,
  );
  assert.deepEqual(await adminCall("admin_orders_status", input), cancelled);
  assert.deepEqual(
    await stock(),
    restored,
    "order_cancellation_replay_no_credit",
  );
  log("cancelled-base-variant-restored-once-unmanaged-preserved");

  for (const body of [
    { status: "PAID", expectedVersion: current.version },
    { status: "CANCELLED", expectedVersion: cancelled.version },
    { status: "FULFILLED", expectedVersion: cancelled.version },
  ]) {
    assert.equal(
      (
        await adminRequest("admin_orders_status", {
          ...input,
          // The changed PAID intent must conflict under the original key too.
          idempotencyKey:
            body.status === "PAID" ? input.idempotencyKey : randomUUID(),
          body,
        })
      ).status,
      409,
    );
  }
  assert.deepEqual(await adminCall("admin_orders_status", input), cancelled);
  assert.deepEqual(await stock(), restored);
  assert.deepEqual(
    await customerCall("orders_get", { path: input.path }),
    cancelled,
  );
  log("changed-key-intent-terminal-denial-replay-no-double-credit");
}
