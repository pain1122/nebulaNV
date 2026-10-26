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
  throw new Error("d2_demo_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const suffix = randomBytes(6).toString("hex");
const databases = {
  order: `nebula_order_verify_demo_${suffix}`,
  product: `nebula_products_verify_demo_${suffix}`,
};
const target = "20261024000200_demo_payment_attempts";
const fixtureOnly = process.argv.includes("--fixtures-only");
const docker = process.env.NEBULA_DOCKER_COMMAND ?? "docker";
const created = [],
  clients = [],
  errors = [];
function execute(args, input) {
  const r = spawnSync(docker, ["compose", "exec", "-T", "postgres", ...args], {
    cwd: root,
    input,
    encoding: "utf8",
    timeout: 30000,
  });
  if (r.error) throw r.error;
  return r;
}
function sql(kind, text, expected) {
  const r = execute(
    [
      "psql",
      "-U",
      "postgres",
      "-d",
      databases[kind],
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "VERBOSITY=verbose",
      "-At",
    ],
    text,
  );
  if (expected) {
    assert.notEqual(r.status, 0, "d2_demo_expected_sql_failure_missing");
    assert.match(r.stderr.slice(r.stderr.indexOf("ERROR:")), expected);
  } else assert.equal(r.status, 0, `d2_demo_sql_failed ${r.stderr}`);
  return r.stdout.trim();
}
try {
  assert.equal(execute(["pg_isready", "-U", "postgres"]).status, 0);
  for (const [kind, name] of Object.entries(databases)) {
    assert.equal(execute(["createdb", "-U", "postgres", name]).status, 0);
    created.push(name);
    const directory = path.join(root, `apps/${kind}-service/prisma/migrations`);
    for (const migration of readdirSync(directory)
      .filter((n) => /^\d/.test(n) && (kind !== "order" || n < target))
      .sort())
      sql(
        kind,
        readFileSync(path.join(directory, migration, "migration.sql"), "utf8"),
      );
  }
  const orderRequire = createRequire(
    path.join(root, "apps/order-service/package.json"),
  );
  const productRequire = createRequire(
    path.join(root, "apps/product-service/package.json"),
  );
  orderRequire("ts-node").register({
    project: path.join(root, "apps/order-service/tsconfig.json"),
    transpileOnly: true,
  });
  const { PrismaClient: OrderPrisma } = orderRequire(
    "./prisma/generated/client",
  );
  const { PrismaClient: ProductPrisma } = productRequire(
    "./prisma/generated/client",
  );
  const { OrderService } = orderRequire("./src/order/order.service.ts");
  const { ProductServiceImpl } = productRequire(
    "./src/product/product.service.ts",
  );
  const { CheckoutStockService } = productRequire(
    "./src/product/checkout-stock.service.ts",
  );
  const { defer, of } = orderRequire("rxjs");
  const { toGrpcBoundaryException } = orderRequire("@nebula/grpc-auth");
  const connect = (Driver, kind) =>
    new Driver({
      datasources: {
        db: {
          url: `postgresql://postgres:postgres@127.0.0.1:15432/${databases[kind]}?schema=public`,
        },
      },
    });
  const orderDb = connect(OrderPrisma, "order"),
    productDb = connect(ProductPrisma, "product");
  clients.push(orderDb, productDb);
  const catalogue = new ProductServiceImpl(productDb, {}, {}, {});
  Object.assign(catalogue, { assertPublicEligibility: async () => undefined });
  const stock = new CheckoutStockService(productDb, catalogue);
  const faults = {
    reserveLost: false,
    restoreLost: false,
    staleReserve: false,
    cancelOffline: false,
    finalizeBadReply: false,
  };
  const calls = { reserve: 0, finalize: 0, cancel: 0, restore: 0 };
  const admin = {
    userId: "fd230000-0000-4000-8000-000000000091",
    role: "admin",
    requestId: "demo-original-admin-correlation",
  };
  async function rpc(work) {
    try {
      return await work();
    } catch (e) {
      if (typeof e?.code === "number") throw e;
      throw toGrpcBoundaryException(e).getError();
    }
  }
  function service() {
    const instance = new OrderService(orderDb, {}, {});
    Object.assign(instance, {
      settingsSvc: {
        GetString: ({ namespace }) =>
          of({ found: true, value: namespace === "pricing" ? "USD" : "30" }),
      },
      productSvc: {
        GetProduct: ({ id }) => defer(() => rpc(() => catalogue.getPublic(id))),
        ReserveCheckoutStock: (request) =>
          defer(() =>
            rpc(async () => {
              calls.reserve++;
              if (faults.staleReserve) {
                faults.staleReserve = false;
                await productDb.product.update({
                  where: { id: request.lines[0].productId },
                  data: { version: { increment: 1 } },
                });
              }
              const result = await stock.reserve(request);
              if (faults.reserveLost) {
                faults.reserveLost = false;
                throw { code: 14, details: "reserve_reply_lost" };
              }
              return result;
            }),
          ),
        FinalizeCheckoutStock: (identity) =>
          defer(() =>
            rpc(async () => {
              calls.finalize++;
              const result = await stock.finalize(identity);
              if (faults.finalizeBadReply) {
                faults.finalizeBadReply = false;
                return { ...result, state: "HELD" };
              }
              return result;
            }),
          ),
        CancelCheckoutStock: (identity) =>
          defer(() =>
            rpc(async () => {
              calls.cancel++;
              if (faults.cancelOffline)
                throw { code: 14, details: "cancel_unavailable" };
              return stock.cancel(identity);
            }),
          ),
        RestoreCheckoutStock: (identity) =>
          defer(() =>
            rpc(async () => {
              calls.restore++;
              const result = await stock.restore(identity);
              if (faults.restoreLost) {
                faults.restoreLost = false;
                throw { code: 14, details: "restore_reply_lost" };
              }
              return result;
            }),
          ),
      },
    });
    return instance;
  }
  async function fixture({ variant = false } = {}) {
    const id = randomUUID(),
      variantId = randomUUID(),
      owner = randomUUID(),
      checkoutKey = randomUUID();
    await productDb.product.create({
      data: {
        id,
        slug: id,
        sku: id,
        title: "Demo payment fixture",
        description: "Valid current Product description",
        price: "7.25",
        currency: "USD",
        categoryId: "fd400000-0000-4000-8000-000000000001",
        tags: [],
        complementaryIds: [],
        trackInventory: true,
        stockQuantity: variant ? 0 : 10,
        selectionMode: variant ? "VARIANT" : "BASE",
        ...(variant
          ? {
              variants: {
                create: {
                  id: variantId,
                  sku: variantId,
                  options: { colour: "Blue" },
                  optionKey: '{"colour":"Blue"}',
                  stockQuantity: 10,
                },
              },
            }
          : {}),
      },
    });
    await service().addToCart(owner, {
      productId: id,
      quantity: 2,
      ...(variant ? { variantId } : {}),
    });
    const order = (await service().checkout(owner, checkoutKey)).data;
    return {
      id: order.id,
      productId: id,
      variantId: variant ? variantId : null,
      owner,
      checkoutKey,
      snapshot: order,
    };
  }
  const current = (f) =>
    orderDb.order.findUniqueOrThrow({ where: { id: f.id } });
  const quantity = async (f) =>
    f.variantId
      ? (
          await productDb.productVariant.findUniqueOrThrow({
            where: { id: f.variantId },
          })
        ).stockQuantity
      : (
          await productDb.product.findUniqueOrThrow({
            where: { id: f.productId },
          })
        ).stockQuantity;
  const start = (
    f,
    version,
    key = randomUUID(),
    actor = {
      userId: f.owner,
      role: "user",
      requestId: "demo-original-customer-correlation",
    },
  ) =>
    service().startDemoPayment(f.id, { expectedVersion: version }, key, actor);
  const outcome = (
    f,
    attemptId,
    result,
    version,
    key = randomUUID(),
    actor = admin,
  ) =>
    service().resolveDemoPayment(
      f.id,
      { attemptId, outcome: result, expectedVersion: version },
      key,
      actor,
    );
  const due = (attemptId) =>
    orderDb.demoPaymentAttempt.update({
      where: { id: attemptId },
      data: {
        nextRetryAt: new Date(0),
        leaseUntil: new Date(0),
        leaseToken: randomUUID(),
      },
    });
  const attempt = (id) =>
    orderDb.demoPaymentAttempt.findUniqueOrThrow({ where: { id } });
  const original = await fixture();
  assert.equal(await quantity(original), 8);
  const before = sql(
    "order",
    'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
  );
  const beforeReceipt = sql(
    "order",
    'SELECT response::text FROM "CheckoutReceipt";',
  );
  const migration = readFileSync(
    path.join(
      root,
      "apps/order-service/prisma/migrations",
      target,
      "migration.sql",
    ),
    "utf8",
  );
  sql(
    "order",
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_demo_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /^ERROR:\s+P0001: d2_demo_upgrade_fault/,
  );
  assert.equal(
    sql("order", `SELECT to_regclass('public."DemoPaymentAttempt"') IS NULL;`),
    "t",
  );
  assert.equal(
    sql(
      "order",
      `SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='DemoPaymentState');`,
    ),
    "f",
  );
  sql("order", migration);
  assert.equal(
    sql(
      "order",
      'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
    ),
    before,
  );
  assert.equal(
    sql("order", 'SELECT response::text FROM "CheckoutReceipt";'),
    beforeReceipt,
  );
  const callsBefore = { ...calls };
  const beginKey = randomUUID();
  const started = await start(original, 1, beginKey);
  assert.equal(started.data.order.status, "PAYMENT_PROCESSING");
  assert.equal(started.data.order.version, 2);
  assert.deepEqual(
    calls,
    callsBefore,
    "first_demo_start_must_not_deduct_or_release_stock",
  );
  assert.equal(await quantity(original), 8);
  assert.deepEqual(await start(original, 1, beginKey), started);
  const control = await orderDb.demoPaymentCommand.findFirstOrThrow();
  for (const [change, constraint] of [
    ["\"stockHash\"='bad'", "DemoPaymentAttempt_stock_check"],
    ["\"stockFacts\"='{}'", "DemoPaymentAttempt_stock_check"],
    [
      "\"leaseToken\"='00000000-0000-4000-8000-000000000001'",
      "DemoPaymentAttempt_lease_check",
    ],
    ['"failures"=-1', "DemoPaymentAttempt_failures_check"],
  ]) {
    sql(
      "order",
      `BEGIN; UPDATE "DemoPaymentAttempt" SET "failures"="failures" WHERE id='${started.data.attempt.id}'; ROLLBACK;`,
    );
    sql(
      "order",
      `BEGIN; UPDATE "DemoPaymentAttempt" SET ${change} WHERE id='${started.data.attempt.id}'; COMMIT;`,
      new RegExp(`^ERROR:\\s+23514:[\\s\\S]*${constraint}`),
    );
  }
  for (const [change, constraint] of [
    ["\"actorRole\"='admin'", "DemoPaymentCommand_authority_check"],
    ['"expectedVersion"=0', "DemoPaymentCommand_input_check"],
    ["\"keyHash\"='bad'", "DemoPaymentCommand_input_check"],
  ]) {
    const controlSql = `UPDATE "DemoPaymentCommand" SET response=NULL WHERE id='${control.id}';`;
    sql("order", `BEGIN; ${controlSql} ROLLBACK;`);
    sql(
      "order",
      `BEGIN; ${controlSql} UPDATE "DemoPaymentCommand" SET ${change} WHERE id='${control.id}'; COMMIT;`,
      new RegExp(`^ERROR:\\s+23514:[\\s\\S]*${constraint}`),
    );
  }
  sql(
    "order",
    `BEGIN; UPDATE "DemoPaymentCommand" SET response=response WHERE id='${control.id}'; ROLLBACK;`,
  );
  sql(
    "order",
    `BEGIN; UPDATE "DemoPaymentCommand" SET response=jsonb_set(response,'{order,version}','null') WHERE id='${control.id}'; COMMIT;`,
    /^ERROR:\s+23514:[\s\S]*DemoPaymentCommand_response_check/,
  );
  console.log(
    "[d2-demo-db] populated-upgrade-first-error-rollback=ok exact-control-constraints=ok first-allocation-no-second-deduction=ok",
  );

  if (!fixtureOnly) {
    const bare = await fixture();
    const activeInsert = (orderId) =>
      `INSERT INTO "DemoPaymentAttempt" (id,"orderId",state,"stockSource","stockIntentId","stockHash","updatedAt") VALUES ('${randomUUID()}','${orderId}','PROCESSING','FINALIZED_CHECKOUT','${randomUUID()}',repeat('c',64),now());`;
    sql("order", `BEGIN; ${activeInsert(bare.id)} ROLLBACK;`);
    sql(
      "order",
      `BEGIN; ${activeInsert(original.id)} COMMIT;`,
      /^ERROR:\s+23505:[\s\S]*DemoPaymentAttempt_one_active_order/,
    );
    sql(
      "order",
      `BEGIN; ${activeInsert(randomUUID())} COMMIT;`,
      /^ERROR:\s+23503:[\s\S]*DemoPaymentAttempt_orderId_fkey/,
    );
    const copyCommand = (hash, response = "response") =>
      `INSERT INTO "DemoPaymentCommand" (id,"orderId","attemptId",kind,outcome,"actorId","actorRole","keyHash","intentHash","expectedVersion","requestId",response) SELECT '${randomUUID()}',"orderId","attemptId",kind,outcome,"actorId","actorRole",${hash},"intentHash","expectedVersion","requestId",${response} FROM "DemoPaymentCommand" WHERE id='${control.id}';`;
    sql("order", `BEGIN; ${copyCommand("repeat('a',64)")} ROLLBACK;`);
    sql(
      "order",
      `BEGIN; ${copyCommand('"keyHash"')} COMMIT;`,
      /^ERROR:\s+23505:[\s\S]*DemoPaymentCommand_actorId_keyHash_key/,
    );
    sql("order", `BEGIN; ${copyCommand("repeat('a',64)", "NULL")} ROLLBACK;`);
    sql(
      "order",
      `BEGIN; ${copyCommand("repeat('a',64)", "NULL")} ${copyCommand("repeat('b',64)", "NULL")} COMMIT;`,
      /^ERROR:\s+23505:[\s\S]*DemoPaymentCommand_one_pending_attempt/,
    );
    const raceKey = randomUUID();
    const beginnings = await Promise.allSettled([
      start(bare, 1, raceKey),
      start(bare, 1, raceKey),
    ]);
    assert.ok(beginnings.some((r) => r.status === "fulfilled"));
    for (const result of beginnings)
      if (result.status === "rejected")
        assert.equal(result.reason.getStatus(), 503);
    assert.equal(
      await orderDb.demoPaymentAttempt.count({ where: { orderId: bare.id } }),
      1,
    );
    assert.equal(await quantity(bare), 8);
    assert.equal((await start(bare, 1, raceKey)).data.order.version, 2);
    const attemptId = started.data.attempt.id;
    const unknown = await outcome(original, attemptId, "UNKNOWN", 2);
    assert.equal(unknown.data.order.version, 2);
    assert.equal(unknown.data.attempt.state, "PROCESSING");
    assert.equal(await quantity(original), 8);
    await assert.rejects(
      outcome(original, attemptId, "FAILED", 2, randomUUID(), {
        userId: original.owner,
        role: "user",
      }),
      /demo_payment_actor_forbidden/,
    );
    await assert.rejects(
      start(original, 2, randomUUID(), admin),
      /demo_payment_actor_forbidden/,
    );
    await assert.rejects(
      start({ ...original, owner: randomUUID() }, 2),
      /order_not_found/,
    );
    const failKey = randomUUID();
    faults.restoreLost = true;
    await assert.rejects(
      outcome(original, attemptId, "FAILED", 2, failKey),
      /demo_payment_recovery_pending/,
    );
    assert.equal((await current(original)).status, "PAYMENT_PROCESSING");
    assert.equal((await attempt(attemptId)).state, "RESOLVING");
    assert.equal(await quantity(original), 10);
    await due(attemptId);
    await service().recoverDemoPayments();
    const failed = await outcome(original, attemptId, "FAILED", 2, failKey);
    assert.equal(failed.data.order.status, "PENDING");
    assert.equal(failed.data.order.version, 3);
    assert.equal(await quantity(original), 10);
    await assert.rejects(
      service().updateOrderStatusAdmin(
        original.id,
        { status: "PAID", expectedVersion: 3 },
        randomUUID(),
        admin,
      ),
      /demo_payment_retry_required/,
    );
    await productDb.product.update({
      where: { id: original.productId },
      data: { price: "7.26", version: { increment: 1 } },
    });
    await assert.rejects(start(original, 3), /demo_payment_selection_changed/);
    await productDb.product.update({
      where: { id: original.productId },
      data: { price: "7.25", version: { increment: 1 } },
    });
    const retry = await start(original, 3);
    assert.equal(await quantity(original), 8);
    assert.equal(retry.data.order.version, 4);
    assert.equal(
      (await attempt(retry.data.attempt.id)).stockSource,
      "RETRY_HOLD",
    );
    assert.equal(
      (await outcome(original, retry.data.attempt.id, "UNKNOWN", 4)).data.order
        .version,
      4,
    );
    assert.equal(await quantity(original), 8);
    await outcome(original, retry.data.attempt.id, "CANCELLED", 4);
    assert.equal(await quantity(original), 10);
    assert.equal((await current(original)).version, 5);
    const paid = await start(original, 5);
    const paidKey = randomUUID();
    faults.finalizeBadReply = true;
    await assert.rejects(
      outcome(original, paid.data.attempt.id, "SUCCEEDED", 6, paidKey),
      /demo_payment_recovery_pending/,
    );
    assert.equal((await current(original)).status, "PAYMENT_PROCESSING");
    await due(paid.data.attempt.id);
    await service().recoverDemoPayments();
    assert.equal(
      (await outcome(original, paid.data.attempt.id, "SUCCEEDED", 6, paidKey))
        .data.order.status,
      "PAID",
    );
    assert.equal((await current(original)).version, 7);
    assert.equal(await quantity(original), 8);
    assert.deepEqual(
      (await service().checkout(original.owner, original.checkoutKey)).data,
      original.snapshot,
    );
    console.log(
      "[d2-demo-db] unknown-retains-allocation=ok confirmed-failure-releases-once=ok retry-requotes-reserves-finalizes=ok immutable-order-checkout=ok",
    );

    const lost = await fixture({ variant: true });
    const firstLost = await start(lost, 1);
    await outcome(lost, firstLost.data.attempt.id, "FAILED", 2);
    const lostKey = randomUUID();
    faults.reserveLost = true;
    await assert.rejects(
      start(lost, 3, lostKey),
      /demo_payment_recovery_pending/,
    );
    const preparing = await orderDb.demoPaymentAttempt.findFirstOrThrow({
      where: { orderId: lost.id, state: "PREPARING" },
    });
    assert.equal((await current(lost)).status, "PENDING");
    assert.equal(await quantity(lost), 8);
    await assert.rejects(
      service().updateOrderStatusAdmin(
        lost.id,
        { status: "CANCELLED", expectedVersion: 3 },
        randomUUID(),
        admin,
      ),
      /demo_payment_in_progress/,
    );
    await due(preparing.id);
    await service().recoverDemoPayments();
    const recovered = await start(lost, 3, lostKey);
    assert.equal(recovered.data.order.version, 4);
    assert.equal(await quantity(lost), 8);
    await outcome(lost, preparing.id, "FAILED", 4);
    assert.equal(await quantity(lost), 10);
    await service().updateOrderStatusAdmin(
      lost.id,
      { status: "CANCELLED", expectedVersion: 5 },
      randomUUID(),
      admin,
    );
    assert.equal(
      await quantity(lost),
      10,
      "order_cancel_after_failed_attempt_must_not_credit_again",
    );

    const rejected = await fixture();
    const rejectFirst = await start(rejected, 1);
    await outcome(rejected, rejectFirst.data.attempt.id, "FAILED", 2);
    faults.staleReserve = true;
    faults.cancelOffline = true;
    const rejectKey = randomUUID();
    await assert.rejects(
      start(rejected, 3, rejectKey),
      /demo_payment_recovery_pending/,
    );
    const aborting = await orderDb.demoPaymentAttempt.findFirstOrThrow({
      where: { orderId: rejected.id, state: "PREPARING" },
    });
    assert.equal(aborting.abortRequested, true);
    assert.equal((await current(rejected)).status, "PENDING");
    faults.cancelOffline = false;
    const reserveBefore = calls.reserve;
    await due(aborting.id);
    await service().recoverDemoPayments();
    assert.equal(
      calls.reserve,
      reserveBefore,
      "aborting_reservation_must_not_reserve_again",
    );
    const rejectReply = await start(rejected, 3, rejectKey);
    assert.equal(rejectReply.data.attempt.state, "FAILED");
    assert.equal(rejectReply.data.attempt.failureCode, "SELECTION_CHANGED");
    assert.equal(rejectReply.data.order.status, "PENDING");
    assert.equal(await quantity(rejected), 10);
    assert.equal(
      (
        await stock.reserve({
          ...aborting.stockFacts,
          intentId: aborting.stockIntentId,
          payloadHash: aborting.stockHash,
        })
      ).state,
      "CANCELLED",
    );
    console.log(
      "[d2-demo-db] variant-lost-reserve-replay=ok cancelled-attempt-vs-order-no-double-credit=ok stale-reservation-abort-tombstone=ok",
    );

    const local = await fixture();
    sql(
      "order",
      `CREATE FUNCTION _d2_demo_reply_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."orderId"='${local.id}'::uuid AND NEW.response IS NOT NULL THEN RAISE EXCEPTION 'd2_demo_reply_fault'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER _d2_demo_reply_fault BEFORE UPDATE OF response ON "DemoPaymentCommand" FOR EACH ROW EXECUTE FUNCTION _d2_demo_reply_fault();`,
    );
    const localKey = randomUUID();
    await assert.rejects(
      start(local, 1, localKey),
      /demo_payment_recovery_pending/,
    );
    assert.equal((await current(local)).status, "PENDING");
    assert.equal((await current(local)).version, 1);
    const localAttempt = await orderDb.demoPaymentAttempt.findFirstOrThrow({
      where: { orderId: local.id },
    });
    assert.equal(localAttempt.state, "PREPARING");
    sql(
      "order",
      'DROP TRIGGER _d2_demo_reply_fault ON "DemoPaymentCommand"; DROP FUNCTION _d2_demo_reply_fault();',
    );
    await due(localAttempt.id);
    await service().recoverDemoPayments();
    assert.equal((await start(local, 1, localKey)).data.order.version, 2);
    assert.equal(await quantity(local), 8);
    const competingKey = randomUUID();
    const results = await Promise.allSettled([
      outcome(local, localAttempt.id, "SUCCEEDED", 2, competingKey),
      outcome(local, localAttempt.id, "FAILED", 2),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const final = await current(local);
    assert.ok(["PAID", "PENDING"].includes(final.status));
    assert.equal(final.version, 3);
    assert.equal(await quantity(local), final.status === "PAID" ? 8 : 10);
    console.log(
      "[d2-demo-db] local-reply-fault-rolls-back-status=ok expired-lease-recreated-owner=ok competing-outcomes-one-winner=ok",
    );
    const immediate = await fixture();
    const immediateStart = await start(immediate, 1);
    const finalizeBefore = calls.finalize;
    assert.equal(
      (await outcome(immediate, immediateStart.data.attempt.id, "SUCCEEDED", 2))
        .data.order.status,
      "PAID",
    );
    assert.equal(
      calls.finalize,
      finalizeBefore,
      "first_payment_success_does_not_finalize_or_deduct_twice",
    );
    assert.equal(await quantity(immediate), 8);
    const ceiling = await fixture();
    await orderDb.order.update({
      where: { id: ceiling.id },
      data: { version: 2147483646 },
    });
    await assert.rejects(
      start(ceiling, 2147483646),
      /demo_payment_version_capacity/,
    );
    assert.equal(
      await orderDb.demoPaymentAttempt.count({
        where: { orderId: ceiling.id },
      }),
      0,
    );
    assert.equal(await quantity(ceiling), 8);
    const manual = await fixture();
    assert.equal(
      (
        await service().updateOrderStatusAdmin(
          manual.id,
          { status: "PAID", expectedVersion: 1 },
          randomUUID(),
          admin,
        )
      ).data.status,
      "PAID",
    );
    assert.equal(
      (
        await service().updateOrderStatusAdmin(
          manual.id,
          { status: "FULFILLED", expectedVersion: 2 },
          randomUUID(),
          admin,
        )
      ).data.status,
      "FULFILLED",
    );
    assert.equal(await quantity(manual), 8);
    const cancellation = await fixture();
    assert.equal(
      (
        await service().updateOrderStatusAdmin(
          cancellation.id,
          { status: "CANCELLED", expectedVersion: 1 },
          randomUUID(),
          admin,
        )
      ).data.status,
      "CANCELLED",
    );
    assert.equal(await quantity(cancellation), 10);
    console.log(
      "[d2-demo-db] active-order-pending-command-key-constraints=ok concurrent-start-replay=ok original-manual-status-cancellation-regressions=ok",
    );
  } else {
    const variantControl = await fixture({ variant: true });
    assert.equal(await quantity(variantControl), 8);
    console.log(
      "[d2-demo-db] fixture-smoke=ok; full recovery/race scenarios remain pending",
    );
  }
} catch (error) {
  errors.push(error);
} finally {
  for (const client of clients)
    try {
      await client.$disconnect();
    } catch (error) {
      errors.push(error);
    }
  for (const database of created.reverse())
    try {
      assert.match(
        database,
        /^nebula_(order|products)_verify_demo_[a-f0-9]{12}$/,
      );
      assert.equal(
        execute(["dropdb", "-U", "postgres", "--force", database]).status,
        0,
        `d2_demo_cleanup_failed_${database}`,
      );
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(errors, "d2_demo_database_or_cleanup_failed");
console.log(
  `[d2-demo-db] cleaned ${created.length} owned disposable databases; actual Order/Product SQL; transport/publication dependencies stubbed; native deployment remains pending`,
);
