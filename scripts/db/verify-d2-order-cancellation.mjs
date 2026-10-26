import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_order_cancellation_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_order_verify_cancel_${randomBytes(6).toString("hex")}`;
const target = "20261024000100_order_cancellation";
const docker = process.env.NEBULA_DOCKER_COMMAND ?? "docker";
function execute(args, input) {
  const result = spawnSync(
    docker,
    ["compose", "exec", "-T", "postgres", ...args],
    {
      cwd: root,
      input,
      encoding: "utf8",
      timeout: 30000,
    },
  );
  if (result.error) throw result.error;
  return result;
}
function sql(text, expected) {
  const result = execute(
    [
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "VERBOSITY=verbose",
      "-At",
    ],
    text,
  );
  if (expected) {
    assert.notEqual(result.status, 0, "d2_cancel_expected_failure_missing");
    assert.match(
      result.stderr.slice(result.stderr.indexOf("ERROR:")),
      expected,
    );
  } else
    assert.equal(result.status, 0, `d2_cancel_sql_failed ${result.stderr}`);
  return result.stdout.trim();
}
const require = createRequire(
  path.join(root, "apps/order-service/package.json"),
);
require("ts-node").register({
  project: path.join(root, "apps/order-service/tsconfig.json"),
  transpileOnly: true,
});
const { PrismaClient } = require("./prisma/generated/client");
const {
  OrderCancellationCoordinator,
} = require("./src/order/order-cancellation.ts");
const { applyOrderStatus } = require("./src/order/order-status.ts");
const { orderReply } = require("./src/order/checkout-contract.ts");
const {
  receiptReplay,
  checkoutHash,
} = require("./src/order/checkout-receipt.ts");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
    },
  },
});
const owner = "fd230000-0000-4000-8000-000000000090";
const actor = {
  userId: "fd230000-0000-4000-8000-000000000091",
  role: "admin",
  requestId: "cancel-original-correlation",
};
const effects = new Set();
const calls = new Map();
const modes = new Map();
// This proof owns actual Order SQL. Product's separately proved operation is a
// replay-aware remote stub here, not a claim of native cross-service recovery.
async function restore(identity) {
  calls.set(identity.intentId, (calls.get(identity.intentId) ?? 0) + 1);
  const mode = modes.get(identity.intentId);
  if (mode === "unavailable") throw new Error("product_unavailable");
  effects.add(identity.intentId);
  if (mode === "lost-reply") {
    modes.delete(identity.intentId);
    throw new Error("reply_lost_after_product_commit");
  }
  if (mode === "lease-expired") {
    modes.delete(identity.intentId);
    await prisma.orderCancellation.update({
      where: { checkoutAttemptId: identity.intentId },
      data: { leaseUntil: new Date(0) },
    });
  }
  return { ...identity, state: "RESTORED" };
}
const coordinator = () => new OrderCancellationCoordinator(prisma, restore);
const cancel = (
  order,
  key = randomUUID(),
  expectedVersion = 1,
  commandActor = actor,
) =>
  coordinator().cancel(
    order.id,
    { status: "CANCELLED", expectedVersion },
    key,
    commandActor,
  );
const markPaid = (order, key = randomUUID()) =>
  applyOrderStatus(
    prisma,
    order.id,
    { status: "PAID", expectedVersion: 1 },
    key,
    actor,
  );
async function fixture(options = {}) {
  const order = await prisma.order.create({
    data: {
      userId: owner,
      orderNumber: randomUUID(),
      currency: "USD",
      subtotal: "4.00",
      total: "4.00",
      items: {
        create: {
          productId: randomUUID(),
          name: "Cancellation proof selection",
          quantity: 1,
          unitPrice: "4.00",
          lineTotal: "4.00",
        },
      },
      ...options,
    },
    include: { items: true },
  });
  const attempt = await prisma.checkoutAttempt.create({
    data: {
      id: order.id,
      orderId: order.id,
      userId: owner,
      cartId: randomUUID(),
      state: "COMPLETED",
      keyHash: checkoutHash(randomUUID()),
      intentHash: "b".repeat(64),
      stockHash: "c".repeat(64),
      cartFingerprint: "d".repeat(64),
    },
  });
  return { ...order, attempt };
}
async function current(order) {
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } });
}
async function due(order) {
  await prisma.orderCancellation.update({
    where: { orderId: order.id },
    data: { nextRetryAt: new Date(0), leaseUntil: null, leaseToken: null },
  });
}
async function assertPending(order) {
  assert.equal((await current(order)).status, "PENDING");
  assert.equal((await current(order)).version, 1);
  assert.equal(
    await prisma.orderStatusChange.count({ where: { orderId: order.id } }),
    0,
  );
  assert.equal(
    (
      await prisma.orderCancellation.findUniqueOrThrow({
        where: { orderId: order.id },
      })
    ).completedAt,
    null,
  );
}
let created = false;
const errors = [];
try {
  assert.equal(execute(["pg_isready", "-U", "postgres"]).status, 0);
  assert.equal(execute(["createdb", "-U", "postgres", database]).status, 0);
  created = true;
  const directory = path.join(root, "apps/order-service/prisma/migrations");
  const names = readdirSync(directory)
    .filter((name) => /^\d/.test(name))
    .sort();
  for (const name of names.filter((name) => name < target))
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  const original = await fixture();
  const snapshot = orderReply(original);
  const receiptTime = new Date();
  const receipt = await prisma.checkoutReceipt.create({
    data: {
      userId: owner,
      keyHash: "e".repeat(64),
      intentHash: "f".repeat(64),
      cartFingerprint: "a".repeat(64),
      orderId: original.id,
      createdAt: receiptTime,
      replayUntil: new Date(receiptTime.getTime() + 7 * 86400000),
      response: snapshot,
    },
  });
  const beforeOrder = sql(
    'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
  );
  const beforeAttempt = sql(
    'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "CheckoutAttempt" t;',
  );
  const migration = readFileSync(
    path.join(directory, target, "migration.sql"),
    "utf8",
  );
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_cancel_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /^ERROR:\s+P0001: d2_cancel_upgrade_fault/,
  );
  assert.equal(
    sql(`SELECT to_regclass('public."OrderCancellation"') IS NULL;`),
    "t",
  );
  assert.equal(
    sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;'),
    beforeOrder,
  );
  for (const name of names.filter((name) => name >= target))
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  assert.equal(
    sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;'),
    beforeOrder,
  );
  assert.equal(
    sql(
      'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "CheckoutAttempt" t;',
    ),
    beforeAttempt,
  );
  const key = randomUUID();
  const raced = await Promise.allSettled([
    cancel(original, key),
    cancel(original, key),
  ]);
  assert.ok(raced.some((r) => r.status === "fulfilled"));
  for (const result of raced)
    if (result.status === "rejected")
      assert.equal(result.reason.getStatus(), 503);
  const first = await cancel(original, key);
  assert.equal(first.data.status, "CANCELLED");
  assert.equal(first.data.version, 2);
  assert.equal(effects.size, 1);
  assert.equal(calls.get(original.attempt.id), 1);
  assert.equal(await prisma.orderStatusChange.count(), 1);
  assert.equal((await current(original)).version, 2);
  assert.deepEqual(
    await cancel(original, key, 1, {
      ...actor,
      requestId: "later-correlation",
    }),
    first,
  );
  const audit = await prisma.orderStatusChange.findFirstOrThrow();
  assert.equal(audit.requestId, actor.requestId);
  assert.equal(audit.actorId, actor.userId);
  assert.deepEqual(
    receiptReplay(
      await prisma.checkoutReceipt.findUniqueOrThrow({
        where: { id: receipt.id },
      }),
      owner,
      receipt.intentHash,
    ),
    snapshot,
  );
  await assert.rejects(
    cancel(original, key, 2),
    /order_status_idempotency_conflict/,
  );
  const another = await fixture();
  await assert.rejects(
    cancel(another, key),
    /order_status_idempotency_conflict/,
  );
  await assert.rejects(
    markPaid(another, key),
    /order_status_idempotency_conflict/,
  );
  console.log(
    "[d2-cancel-db] populated-preservation-first-error-upgrade-rollback=ok same-key-race-original-replay-audit=ok immutable-checkout-receipt=ok",
  );

  // Every negative begins from a valid persisted control and changes one rule.
  const changes = [
    ["\"actorRole\"='user'", "23514", "OrderCancellation_actor_check"],
    ["\"stockHash\"='bad'", "23514", "OrderCancellation_hashes_check"],
    ['"expectedVersion"=0', "23514", "OrderCancellation_version_check"],
    ['"failures"=-1', "23514", "OrderCancellation_version_check"],
    [
      `"leaseToken"='${randomUUID()}'`,
      "23514",
      "OrderCancellation_lease_check",
    ],
    [`"orderId"='${randomUUID()}'`, "23503", "OrderCancellation_orderId_fkey"],
    [
      `"checkoutAttemptId"='${randomUUID()}'`,
      "23503",
      "OrderCancellation_checkoutAttemptId_fkey",
    ],
  ];
  for (const [change, state, constraint] of changes) {
    sql(
      `BEGIN; UPDATE "OrderCancellation" SET "requestId"="requestId" WHERE "orderId"='${original.id}'; ROLLBACK;`,
    );
    sql(
      `BEGIN; UPDATE "OrderCancellation" SET ${change} WHERE "orderId"='${original.id}'; COMMIT;`,
      new RegExp(`^ERROR:\\s+${state}:[\\s\\S]*${constraint}`),
    );
  }

  const unavailable = await fixture();
  const unavailableKey = randomUUID();
  modes.set(unavailable.id, "unavailable");
  await assert.rejects(
    cancel(unavailable, unavailableKey),
    /order_cancellation_recovery_pending/,
  );
  await assertPending(unavailable);
  assert.ok(!effects.has(unavailable.id));
  sql(
    `BEGIN; UPDATE "OrderCancellation" SET "actorId"='${actor.userId}',"keyHash"='${checkoutHash(key)}' WHERE "orderId"='${unavailable.id}'; COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*OrderCancellation_actorId_keyHash_key/,
  );
  sql(
    `BEGIN; UPDATE "OrderCancellation" SET "checkoutAttemptId"='${original.id}' WHERE "orderId"='${unavailable.id}'; COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*OrderCancellation_checkoutAttemptId_key/,
  );
  sql(
    `BEGIN; UPDATE "OrderCancellation" SET "orderId"='${original.id}' WHERE "orderId"='${unavailable.id}'; COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*OrderCancellation_pkey/,
  );
  sql(
    `BEGIN; DELETE FROM "CheckoutAttempt" WHERE id='${unavailable.id}'; COMMIT;`,
    /^ERROR:\s+23503:[\s\S]*OrderCancellation_checkoutAttemptId_fkey/,
  );
  await assert.rejects(markPaid(unavailable), /order_cancellation_in_progress/);
  await assert.rejects(
    markPaid(another, unavailableKey),
    /order_status_idempotency_conflict/,
  );
  await assert.rejects(
    cancel(unavailable, unavailableKey, 2),
    /order_status_idempotency_conflict/,
  );
  await assert.rejects(cancel(unavailable), /order_cancellation_in_progress/);
  await assert.rejects(
    cancel(unavailable, randomUUID(), 1, { ...actor, userId: randomUUID() }),
    /order_cancellation_in_progress/,
  );
  modes.delete(unavailable.id);
  await due(unavailable);
  await coordinator().recover();
  assert.equal((await current(unavailable)).status, "CANCELLED");

  const lost = await fixture();
  const lostKey = randomUUID();
  modes.set(lost.id, "lost-reply");
  await assert.rejects(
    cancel(lost, lostKey),
    /order_cancellation_recovery_pending/,
  );
  await assertPending(lost);
  assert.ok(effects.has(lost.id));
  await due(lost);
  await coordinator().recover();
  assert.equal((await cancel(lost, lostKey)).data.status, "CANCELLED");
  assert.equal(calls.get(lost.id), 2);
  assert.equal((await current(lost)).version, 2);

  const auditFault = await fixture();
  const faultKey = randomUUID();
  sql(`CREATE FUNCTION _d2_cancel_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."orderId"='${auditFault.id}'::uuid THEN RAISE EXCEPTION 'd2_cancel_audit_fault'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER _d2_cancel_audit_fault BEFORE INSERT ON "OrderStatusChange" FOR EACH ROW EXECUTE FUNCTION _d2_cancel_audit_fault();`);
  await assert.rejects(
    cancel(auditFault, faultKey),
    /order_cancellation_recovery_pending/,
  );
  await assertPending(auditFault);
  assert.ok(effects.has(auditFault.id));
  sql(
    'DROP TRIGGER _d2_cancel_audit_fault ON "OrderStatusChange"; DROP FUNCTION _d2_cancel_audit_fault();',
  );
  await due(auditFault);
  await coordinator().recover();
  assert.equal((await cancel(auditFault, faultKey)).data.version, 2);
  assert.equal(calls.get(auditFault.id), 2);

  const expired = await fixture();
  const expiredKey = randomUUID();
  modes.set(expired.id, "lease-expired");
  await assert.rejects(
    cancel(expired, expiredKey),
    /order_cancellation_recovery_pending/,
  );
  await assertPending(expired);
  await prisma.orderCancellation.update({
    where: { orderId: expired.id },
    data: {
      nextRetryAt: new Date(0),
      leaseToken: randomUUID(),
      leaseUntil: new Date(0),
    },
  });
  await coordinator().recover();
  assert.equal((await cancel(expired, expiredKey)).data.status, "CANCELLED");
  assert.equal(calls.get(expired.id), 2);
  console.log(
    "[d2-cancel-db] outage-blocks-competing-status=ok lost-reply-and-local-audit-rollback-recovery=ok expired-lease-recreated-worker=ok",
  );

  for (const status of [
    "PAID",
    "FULFILLED",
    "PAYMENT_PROCESSING",
    "CANCELLED",
  ]) {
    const denied = await fixture({ status });
    await assert.rejects(cancel(denied), /order_transition_not_permitted/);
    assert.ok(!calls.has(denied.id));
  }
  await assert.rejects(
    cancel(another, randomUUID(), 0),
    /order_expected_version_invalid/,
  );
  await assert.rejects(
    cancel(another, randomUUID(), 2),
    /order_version_conflict/,
  );
  await assert.rejects(
    cancel(another, randomUUID(), 1, { ...actor, role: "user" }),
    /order_status_actor_forbidden/,
  );
  const legacy = await prisma.order.create({
    data: {
      userId: owner,
      orderNumber: randomUUID(),
      currency: "USD",
      subtotal: 0,
      total: 0,
    },
  });
  await assert.rejects(
    cancel(legacy),
    /order_cancellation_stock_identity_missing/,
  );
  await prisma.checkoutAttempt.update({
    where: { id: another.id },
    data: { state: "ORDER_COMMITTED", payload: {} },
  });
  await assert.rejects(
    cancel(another),
    /order_cancellation_stock_identity_missing/,
  );
  for (let i = 0; i < 3; i++) {
    const racing = await fixture();
    const results = await Promise.allSettled([
      cancel(racing),
      markPaid(racing),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const row = await current(racing);
    assert.ok(["PAID", "CANCELLED"].includes(row.status));
    assert.equal(row.version, 2);
    assert.equal(effects.has(racing.id), row.status === "CANCELLED");
    assert.equal(
      await prisma.orderStatusChange.count({ where: { orderId: racing.id } }),
      1,
    );
  }
  console.log(
    "[d2-cancel-db] exact-constraints=ok paid-processing-legacy-identity-denial=ok cancellation-vs-paid-race-one-winner=ok",
  );
} catch (error) {
  errors.push(error);
} finally {
  try {
    await prisma.$disconnect();
  } catch (error) {
    errors.push(error);
  }
  if (created)
    try {
      assert.match(database, /^nebula_order_verify_cancel_[a-f0-9]{12}$/);
      assert.equal(
        execute(["dropdb", "-U", "postgres", "--force", database]).status,
        0,
        "d2_cancel_cleanup_failed",
      );
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(
    errors,
    "d2_order_cancellation_database_or_cleanup_failed",
  );
console.log(
  "[d2-cancel-db] cleaned 1 owned disposable database; Product restoration port stubbed; native cross-service/restart proof remains pending",
);
