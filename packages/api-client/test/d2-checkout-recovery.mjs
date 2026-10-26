import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../../../", import.meta.url));
function uuid(value) {
  assert.match(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  return value;
}
export function finalizationFaultSql(productId, install) {
  uuid(productId);
  const name = `d2_checkout_finalize_${productId.replaceAll("-", "")}`;
  if (!install)
    return `BEGIN; DROP TRIGGER IF EXISTS ${name} ON "CheckoutStockIntent";
      DROP FUNCTION IF EXISTS ${name}(); COMMIT;`;
  return `BEGIN;
    CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "CheckoutStockLine" WHERE "intentId"=NEW.id
        AND "productId"='${productId}') THEN
        RAISE EXCEPTION 'd2_live_finalize_outage_fixture' USING ERRCODE='P0001';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER ${name} BEFORE UPDATE ON "CheckoutStockIntent"
      FOR EACH ROW WHEN (OLD.state='HELD' AND NEW.state='FINALIZED')
      EXECUTE FUNCTION ${name}(); COMMIT;`;
}
function compose(args, input) {
  const result = spawnSync(
    process.env.NEBULA_DOCKER_COMMAND ?? "docker",
    ["compose", ...args],
    {
      cwd: root,
      input,
      encoding: "utf8",
      timeout: args[0] === "up" ? 330_000 : 30_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0)
    throw new Error(`d2_recovery_compose_${args[0]}_failed`, {
      cause: result.error ?? new Error(String(result.stderr).slice(-1500)),
    });
  return result.stdout.trim();
}
function sql(database, input) {
  assert.ok(["nebula_products", "nebula_order"].includes(database));
  return compose(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-qAt",
    ],
    `SET lock_timeout='10s'; SET statement_timeout='20s';\n${input}`,
  );
}
export const checkoutRecoveryTools = {
  compose,
  wait: delay,
  fault: (productId, install) =>
    sql("nebula_products", finalizationFaultSql(productId, install)),
  attempt(userId, key) {
    uuid(userId);
    const hash = createHash("sha256").update(key).digest("hex");
    return JSON.parse(
      sql(
        "nebula_order",
        `SELECT COALESCE((SELECT jsonb_build_object(
      'id',a.id,'state',a.state,'orderId',a."orderId",
      'orders',(SELECT count(*) FROM "Order" o WHERE o.id=a."orderId"),
      'receipts',(SELECT count(*) FROM "CheckoutReceipt" r WHERE r."orderId"=a."orderId")
      ) FROM "CheckoutAttempt" a WHERE a."userId"='${userId}' AND a."keyHash"='${hash}'), 'null'::jsonb);`,
      ),
    );
  },
  intent(id) {
    uuid(id);
    return JSON.parse(
      sql(
        "nebula_products",
        `SELECT COALESCE((SELECT jsonb_build_object(
      'id',id,'state',state) FROM "CheckoutStockIntent" WHERE id='${id}'), 'null'::jsonb);`,
      ),
    );
  },
  evict(userId, key, expectedOrderId) {
    uuid(userId);
    if (expectedOrderId) uuid(expectedOrderId);
    // Derive scope and hash using the running Gateway, including its configured
    // Redis DB. Never scan/flush shared Redis or guess an application ID.
    return Number(
      compose([
        "exec",
        "-T",
        "gateway",
        "node",
        "-e",
        `
      const assert=require('node:assert/strict');
      const Redis=require('ioredis');
      const {gatewayIdempotencyStorageKey}=require('./dist/contracts/idempotency');
      (async()=>{
        const app=JSON.parse(process.env.GATEWAY_APPLICATION_REGISTRY_JSON)
          .find(a=>a.clientId==='mobile-local' && a.enabled && a.profile==='mobile');
        assert.ok(app,'d2_recovery_mobile_application_missing');
        const storageKey=gatewayIdempotencyStorageKey({applicationId:app.applicationId,
          actorId:process.argv[1],routeId:'orders.checkout',key:process.argv[2]});
        const redis=new Redis(process.env.GATEWAY_REDIS_URL,{maxRetriesPerRequest:1,
          connectTimeout:5000,enableOfflineQueue:false,lazyConnect:true});
        redis.on('error',()=>{});
        try {
          await redis.connect();
          const raw=await redis.get(storageKey);
          if(process.argv[3]){
            assert.ok(raw,'d2_recovery_completed_cache_missing');
            const cached=JSON.parse(raw);
            assert.equal(cached.state,'completed');
            assert.equal(cached.response.body.data.id,process.argv[3]);
          }
          process.stdout.write(String(await redis.del(storageKey)));
        }finally{redis.disconnect();}
      })().catch(()=>{process.stderr.write('d2_recovery_scoped_cache_eviction_failed');process.exitCode=1;});
    `,
        userId,
        key,
        expectedOrderId ?? "",
      ]),
    );
  },
};

// Bounded reads reconnect around deliberate restarts. Completed Checkout has
// its own narrow replay helper below; fresh writes use neither retry helper.
export async function reconnectRead(
  read,
  { wait = delay, attempts = 12 } = {},
) {
  let last;
  for (let probe = 0; probe < attempts; probe++) {
    try {
      const result = await read();
      if (result.status === 200) return result;
      assert.equal(result.status, 503, "d2_recovery_unexpected_read_status");
      last = new Error("d2_recovery_read_unavailable");
    } catch (error) {
      if (!(error instanceof TypeError && error.message === "fetch failed"))
        throw error;
      last = error;
    }
    if (probe + 1 < attempts) await wait(1000);
  }
  throw new Error("d2_recovery_read_reconnect_exhausted", { cause: last });
}

export async function replayCompletedCheckout(
  request,
  { key, body, completed, expectedOrderId, wait = delay },
) {
  // This helper never submits a fresh purchase. Its caller must first inspect
  // the owner record for this user's exact key, not infer completion from HTTP.
  assert.equal(
    completed?.state,
    "COMPLETED",
    "d2_replay_requires_completed_owner_attempt",
  );
  assert.equal(completed.id, expectedOrderId);
  assert.equal(completed.orderId, expectedOrderId);
  uuid(expectedOrderId);
  let last;
  for (let probe = 0; probe < 3; probe++) {
    try {
      const result = await request("orders_checkout", {
        idempotencyKey: key,
        body,
      });
      assert.equal(
        result.status,
        201,
        `d2_completed_replay_http_${result.status}`,
      );
      assert.equal(result.ok, true);
      const order = result.data?.data;
      assert.equal(
        order?.id,
        expectedOrderId,
        "d2_completed_replay_wrong_order",
      );
      return order;
    } catch (error) {
      if (
        !(
          error instanceof TypeError &&
          error.message === "fetch failed" &&
          error.cause?.code === "UND_ERR_SOCKET"
        )
      )
        throw error;
      last = error;
    }
    if (probe < 2) await wait(250);
  }
  throw new Error("d2_completed_replay_reconnect_exhausted", { cause: last });
}

export async function runCheckoutRecovery({
  first,
  key,
  body,
  productId,
  call,
  request,
  readiness,
  stock,
  tools = checkoutRecoveryTools,
  emit = (line) =>
    process.stdout.write(`[d2-checkout-recovery-live] ${line}=ok\n`),
}) {
  uuid(productId);
  uuid(first.userId);
  const errors = [];
  let restoreProduct = false,
    restoreOrder = false,
    removeFault = false,
    pendingKey;
  const start = (service) =>
    tools.compose([
      "up",
      "-d",
      "--no-build",
      "--wait",
      "--wait-timeout",
      "300",
      "--no-deps",
      service,
    ]);
  const ready = () => reconnectRead(readiness, { wait: tools.wait });
  async function waitCompleted(intentKey) {
    // A process may stop just after claiming the existing 120-second lease.
    // Allow its expiry plus a worker tick/RPC; do not shorten the owner lease.
    for (let probe = 0; probe < 75; probe++) {
      const row = await tools.attempt(first.userId, intentKey);
      assert.ok(row, "d2_recovery_attempt_disappeared");
      if (row.state === "COMPLETED") return row;
      assert.equal(
        row.state,
        "ORDER_COMMITTED",
        "d2_recovery_committed_attempt_regressed",
      );
      await tools.wait(2000);
    }
    throw new Error("d2_recovery_completion_deadline_exceeded");
  }
  try {
    await call("orders_cart_add", { body: { productId, quantity: 1 } });
    const captured = await call("orders_cart_get");
    assert.equal(captured.items.length, 1);
    assert.equal(captured.items[0].productId, productId);
    assert.equal(captured.items[0].quantity, 1);
    const beforeStock = await stock();
    const original = await tools.attempt(first.userId, key);
    assert.equal(original?.state, "COMPLETED");
    assert.equal(original.orderId, first.id);
    assert.equal(await tools.evict(first.userId, key, first.id), 1);
    restoreProduct = true;
    await tools.compose(["stop", "-t", "10", "product-service"]);
    assert.deepEqual(
      await replayCompletedCheckout(request, {
        key,
        body,
        completed: original,
        expectedOrderId: first.id,
        wait: tools.wait,
      }),
      first,
    );
    emit("cache-entry-loss-product-outage-completed-owner-replay");
    const failedKey = randomUUID();
    assert.equal(
      (
        await request("orders_checkout", {
          idempotencyKey: failedKey,
          body: { note: "D2 unavailable catalogue" },
        })
      ).status,
      503,
    );
    assert.equal(await tools.attempt(first.userId, failedKey), null);
    await start("product-service");
    restoreProduct = false;
    await ready();
    assert.deepEqual(await call("orders_cart_get"), captured);
    assert.equal(await stock(), beforeStock);
    emit("fresh-checkout-product-outage-no-attempt-cart-stock-preserved");

    // Force a real post-commit finalization failure for this Product only.
    removeFault = true;
    await tools.fault(productId, true);
    pendingKey = randomUUID();
    const pendingBody = { note: "D2 committed finalization recovery" };
    assert.equal(
      (
        await request("orders_checkout", {
          idempotencyKey: pendingKey,
          body: pendingBody,
        })
      ).status,
      503,
    );
    const pending = await tools.attempt(first.userId, pendingKey);
    assert.ok(pending);
    assert.equal(pending.state, "ORDER_COMMITTED");
    assert.equal(pending.id, pending.orderId);
    assert.equal(pending.orders, 1);
    assert.equal(pending.receipts, 1);
    assert.equal((await tools.intent(pending.id)).state, "HELD");
    assert.equal(await stock(), beforeStock - 1);
    assert.equal(
      (await request("orders_get", { path: { id: pending.id } })).status,
      404,
    );
    assert.equal(
      (await request("orders_cart_add", { body: { productId, quantity: 1 } }))
        .status,
      409,
    );
    emit("post-commit-finalization-fault-held-stock-hidden-order-cart-frozen");

    restoreOrder = true;
    await tools.compose(["stop", "-t", "10", "order-service"]);
    await tools.fault(productId, false);
    removeFault = false;
    await start("order-service");
    restoreOrder = false;
    await ready();
    const completed = await waitCompleted(pendingKey);
    assert.equal(completed.orders, 1);
    assert.equal(completed.receipts, 1);
    assert.equal((await tools.intent(completed.id)).state, "FINALIZED");
    assert.equal(await stock(), beforeStock - 1);
    await tools.evict(first.userId, pendingKey);
    const recovered = await replayCompletedCheckout(request, {
      key: pendingKey,
      body: pendingBody,
      completed,
      expectedOrderId: pending.id,
      wait: tools.wait,
    });
    assert.equal(recovered.id, pending.id);
    assert.equal(recovered.items.length, 1);
    assert.equal(recovered.items[0].productId, productId);
    assert.equal(recovered.items[0].quantity, 1);
    assert.equal(recovered.total, captured.total);
    assert.deepEqual(
      await call("orders_get", { path: { id: recovered.id } }),
      recovered,
    );
    assert.equal((await call("orders_cart_get")).items.length, 0);
    assert.equal(await tools.evict(first.userId, pendingKey, recovered.id), 1);
    assert.deepEqual(
      await replayCompletedCheckout(request, {
        key: pendingKey,
        body: pendingBody,
        completed,
        expectedOrderId: pending.id,
        wait: tools.wait,
      }),
      recovered,
    );
    assert.equal(await stock(), beforeStock - 1);
    emit(
      "order-process-restart-finalizes-once-durable-replay-after-cache-loss",
    );
  } catch (error) {
    errors.push(error);
  } finally {
    // Each restoration is independent; a primary/cleanup error cannot prevent
    // restoring another dependency. Flags are set before potentially partial work.
    if (removeFault)
      try {
        await tools.fault(productId, false);
      } catch (error) {
        errors.push(error);
      }
    if (restoreProduct)
      try {
        await start("product-service");
      } catch (error) {
        errors.push(error);
      }
    if (restoreOrder)
      try {
        await start("order-service");
      } catch (error) {
        errors.push(error);
      }
    if (removeFault || restoreProduct || restoreOrder)
      try {
        await ready();
      } catch (error) {
        errors.push(error);
      }
    if (pendingKey)
      try {
        const row = await tools.attempt(first.userId, pendingKey);
        if (row?.state === "ORDER_COMMITTED") await waitCompleted(pendingKey);
      } catch (error) {
        errors.push(error);
      }
  }
  if (errors.length)
    throw new AggregateError(
      errors,
      "d2_checkout_recovery_or_restoration_failed",
    );
}
