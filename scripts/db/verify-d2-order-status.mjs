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
  throw new Error("d2_order_status_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_order_verify_status_${randomBytes(6).toString("hex")}`;
const target = "20261019000100_order_status_controls";
const docker = process.env.NEBULA_DOCKER_COMMAND ?? "docker";
function execute(args, input) {
  const result = spawnSync(
    docker,
    ["compose", "exec", "-T", "postgres", ...args],
    { cwd: root, input, encoding: "utf8", timeout: 30000 },
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
    assert.notEqual(
      result.status,
      0,
      "d2_order_status_expected_sql_failure_missing",
    );
    assert.match(
      result.stderr.slice(result.stderr.indexOf("ERROR:")),
      expected,
    );
  } else
    assert.equal(
      result.status,
      0,
      `d2_order_status_sql_failed ${result.stderr}`,
    );
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
const { OrderService } = require("./src/order/order.service.ts");
const {
  checkoutHash,
  checkoutIntent,
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
  requestId: "d2-order-status-proof",
};
const legacyId = randomUUID();
const legacyKey = "legacy-status-checkout-key";
const legacyIntent = checkoutIntent(legacyKey);
const now = new Date();
const legacy = {
  id: legacyId,
  orderNumber: "LEGACY-STATUS",
  userId: owner,
  status: "PENDING",
  currency: "USD",
  checkoutMode: "DEMO_NO_PAYMENT",
  subtotal: "0.00",
  discountTotal: "0.00",
  taxTotal: "0.00",
  total: "0.00",
  shippingAddress: "",
  billingAddress: "",
  meta: "",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  items: [],
};
let created = false;
const errors = [];
try {
  assert.equal(execute(["pg_isready", "-U", "postgres"]).status, 0);
  assert.equal(execute(["createdb", "-U", "postgres", database]).status, 0);
  created = true;
  const directory = path.join(root, "apps/order-service/prisma/migrations");
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name < target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  // A populated control is inserted using its real pre-version schema.
  sql(`INSERT INTO "Order" (id,"orderNumber","userId",currency,subtotal,total,"createdAt","updatedAt") VALUES ('${legacyId}','LEGACY-STATUS','${owner}','USD',0,0,'${now.toISOString()}','${now.toISOString()}');
    INSERT INTO "CheckoutReceipt" (id,"userId","keyHash","intentHash","cartFingerprint","orderId",response,"createdAt","replayUntil") VALUES ('${randomUUID()}','${owner}','${legacyIntent.keyHash}','${legacyIntent.intentHash}','${checkoutHash("legacy-cart")}','${legacyId}','${JSON.stringify(legacy)}','${now.toISOString()}','${new Date(now.getTime() + 7 * 86400000).toISOString()}');`);
  const before = sql('SELECT to_jsonb(t)::text FROM "Order" t;');
  const receiptBefore = sql('SELECT response::text FROM "CheckoutReceipt";');
  const migration = readFileSync(
    path.join(directory, target, "migration.sql"),
    "utf8",
  );
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_order_status_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /^ERROR:\s+P0001: d2_order_status_upgrade_fault/,
  );
  assert.equal(
    sql(
      `SELECT count(*) FROM information_schema.columns WHERE table_name='Order' AND column_name='version';`,
    ),
    "0",
  );
  assert.equal(
    sql(`SELECT to_regclass('public."OrderStatusChange"') IS NULL;`),
    "t",
  );
  assert.equal(sql('SELECT to_jsonb(t)::text FROM "Order" t;'), before);
  sql(migration);
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name > target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  assert.equal(
    sql(`SELECT (to_jsonb(t)-'version')::text FROM "Order" t;`),
    before,
  );
  assert.equal(sql('SELECT version FROM "Order";'), "1");
  assert.equal(
    sql('SELECT response::text FROM "CheckoutReceipt";'),
    receiptBefore,
  );
  const service = () => new OrderService(prisma, {}, {});
  const run = (
    id,
    status,
    expectedVersion,
    key = randomUUID(),
    commandActor = actor,
  ) =>
    service().updateOrderStatusAdmin(
      id,
      { status, expectedVersion },
      key,
      commandActor,
    );
  assert.deepEqual((await service().checkout(owner, legacyKey)).data, legacy);
  assert.equal((await service().getOrderForAdmin(legacyId)).data.version, 1);
  const commandKey = randomUUID();
  const [first, repeated] = await Promise.all([
    run(legacyId, "PAID", 1, commandKey),
    run(legacyId, "PAID", 1, commandKey),
  ]);
  assert.deepEqual(first, repeated);
  assert.equal(first.data.version, 2);
  assert.equal(await prisma.orderStatusChange.count(), 1);
  const audit = await prisma.orderStatusChange.findFirstOrThrow();
  assert.equal(audit.actorId, actor.userId);
  assert.equal(audit.actorRole, "admin");
  assert.equal(audit.requestId, actor.requestId);
  assert.equal(audit.previousStatus, "PENDING");
  assert.equal(audit.expectedVersion, 1);
  assert.equal(audit.keyHash, checkoutHash(commandKey));
  const fulfilled = await run(legacyId, "FULFILLED", 2);
  assert.equal(fulfilled.data.version, 3);
  assert.deepEqual(await run(legacyId, "PAID", 1, commandKey), first);
  await assert.rejects(
    run(legacyId, "FULFILLED", 2, commandKey),
    /order_status_idempotency_conflict/,
  );
  await assert.rejects(
    run(legacyId, "PAID", 1, commandKey, { ...actor, userId: owner }),
    /order_version_conflict/,
  );
  await assert.rejects(
    run(legacyId, "PAID", 3),
    /order_transition_not_permitted/,
  );
  await assert.rejects(
    run(legacyId, "FULFILLED", 3),
    /order_transition_not_permitted/,
  );
  await assert.rejects(
    run(legacyId, "PAID", 3, randomUUID(), { ...actor, role: "user" }),
    { status: 403 },
  );
  assert.deepEqual((await service().checkout(owner, legacyKey)).data, legacy);
  assert.equal(
    sql('SELECT response::text FROM "CheckoutReceipt";'),
    receiptBefore,
  );
  const race = await prisma.order.create({
    data: {
      userId: owner,
      orderNumber: "STATUS-RACE",
      currency: "USD",
      subtotal: 0,
      total: 0,
    },
  });
  const competitors = await Promise.allSettled([
    run(race.id, "PAID", 1),
    run(race.id, "PAID", 1),
  ]);
  assert.equal(
    competitors.filter((row) => row.status === "fulfilled").length,
    1,
  );
  const lost = competitors.find((row) => row.status === "rejected");
  assert.equal(lost.reason.status, 409);
  assert.match(lost.reason.message, /order_version_conflict/);
  assert.equal(
    await prisma.orderStatusChange.count({ where: { orderId: race.id } }),
    1,
  );
  // Reject an audit insert after the conditional Order write, proving atomic rollback.
  sql(`CREATE FUNCTION _d2_status_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'd2_status_audit_fault'; END $$;
    CREATE TRIGGER _d2_status_audit_fault BEFORE INSERT ON "OrderStatusChange" FOR EACH ROW EXECUTE FUNCTION _d2_status_audit_fault();`);
  await assert.rejects(run(race.id, "FULFILLED", 2), /d2_status_audit_fault/);
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: race.id } })).version,
    2,
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: race.id } })).status,
    "PAID",
  );
  assert.equal(
    await prisma.orderStatusChange.count({ where: { orderId: race.id } }),
    1,
  );
  sql(
    'DROP TRIGGER _d2_status_audit_fault ON "OrderStatusChange"; DROP FUNCTION _d2_status_audit_fault();',
  );
  for (const status of ["PAYMENT_PROCESSING", "CANCELLED", "PENDING"])
    await assert.rejects(
      run(race.id, status, 2),
      /order_transition_not_permitted/,
    );
  const other = await prisma.order.create({
    data: {
      userId: owner,
      orderNumber: "STATUS-OTHER",
      currency: "USD",
      subtotal: 0,
      total: 0,
    },
  });
  await assert.rejects(
    run(other.id, "PAID", 1, commandKey),
    /order_status_idempotency_conflict/,
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: other.id } })).version,
    1,
  );
  const pending = await prisma.order.create({
    data: {
      id: randomUUID(),
      userId: owner,
      orderNumber: "STATUS-HIDDEN",
      currency: "USD",
      subtotal: 0,
      total: 0,
    },
  });
  await prisma.checkoutAttempt.create({
    data: {
      id: pending.id,
      orderId: pending.id,
      userId: owner,
      cartId: randomUUID(),
      keyHash: "a".repeat(64),
      intentHash: "b".repeat(64),
      stockHash: "c".repeat(64),
      cartFingerprint: "d".repeat(64),
      state: "ORDER_COMMITTED",
      payload: {},
    },
  });
  await assert.rejects(run(pending.id, "PAID", 1), /checkout_in_progress/);
  assert.equal(
    await prisma.orderStatusChange.count({ where: { orderId: pending.id } }),
    0,
  );
  await assert.rejects(run(randomUUID(), "PAID", 1), /order_not_found/);
  // Valid SQL control before each one-rule negative, preserve exact first SQLSTATE/constraint.
  const changes = [
    ["\"actorRole\"='user'", "OrderStatusChange_actor_check"],
    ["\"keyHash\"='bad'", "OrderStatusChange_hashes_check"],
    ['"expectedVersion"=0', "OrderStatusChange_transition_check"],
    [
      "response=jsonb_set(response,'{id}','null')",
      "OrderStatusChange_response_check",
    ],
    ["response=response-'version'", "OrderStatusChange_response_check"],
    ["response='[]'", "OrderStatusChange_response_check"],
  ];
  for (const [change, constraint] of changes) {
    sql(
      `BEGIN; UPDATE "OrderStatusChange" SET "requestId"="requestId" WHERE id='${audit.id}'; ROLLBACK;`,
    );
    sql(
      `BEGIN; UPDATE "OrderStatusChange" SET ${change} WHERE id='${audit.id}'; COMMIT;`,
      new RegExp(`^ERROR:\\s+23514:[\\s\\S]*${constraint}`),
    );
  }
  sql(`BEGIN; UPDATE "Order" SET version=1 WHERE id='${other.id}'; ROLLBACK;`);
  sql(
    `BEGIN; UPDATE "Order" SET version=0 WHERE id='${other.id}'; COMMIT;`,
    /^ERROR:\s+23514:[\s\S]*Order_version_check/,
  );
  console.log(
    "[d2-order-status-db] populated-preservation-version-backfill-upgrade-rollback=ok exact-constraints=ok same-key-one-audit=ok distinct-key-race=ok actor-target-intent-scope=ok audit-write-rollback=ok restart-original-response=ok historical-checkout-version-absence=ok forbidden-transition-unfinished-denial=ok",
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
      assert.match(database, /^nebula_order_verify_status_[a-f0-9]{12}$/);
      assert.equal(
        execute(["dropdb", "-U", "postgres", "--force", database]).status,
        0,
        "d2_order_status_cleanup_failed",
      );
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(
    errors,
    "d2_order_status_database_or_cleanup_failed",
  );
console.log(
  "[d2-order-status-db] cleaned 1 owned disposable database; native Prisma deploy/history and rebuilt-image proofs remain separate",
);
