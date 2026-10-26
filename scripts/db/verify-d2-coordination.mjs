import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_coordination_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const suffix = randomBytes(6).toString("hex");
const databases = {
  order: `nebula_order_verify_coord_${suffix}`,
  product: `nebula_products_verify_coord_${suffix}`,
};
const docker = process.env.NEBULA_DOCKER_COMMAND ?? "docker";
const created = [];
const errors = [];
const clients = [];
function execute(args, input) {
  const result = spawnSync(
    docker,
    ["compose", "exec", "-T", "postgres", ...args],
    { cwd: root, input, encoding: "utf8", timeout: 30000 },
  );
  if (result.error) throw result.error;
  return result;
}
function sql(kind, text, expected) {
  const result = execute(
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
    assert.notEqual(result.status, 0, "d2_coord_expected_failure_missing");
    assert.match(
      result.stderr.slice(result.stderr.indexOf("ERROR:")),
      expected,
    );
  } else assert.equal(result.status, 0, `d2_coord_sql_failed ${result.stderr}`);
  return result.stdout.trim();
}
try {
  for (const [kind, database] of Object.entries(databases)) {
    assert.equal(execute(["createdb", "-U", "postgres", database]).status, 0);
    created.push(database);
    const directory = path.join(root, `apps/${kind}-service/prisma/migrations`);
    for (const name of readdirSync(directory)
      .filter((name) => /^\d/.test(name))
      .sort()) {
      const migration = readFileSync(
        path.join(directory, name, "migration.sql"),
        "utf8",
      );
      if (
        kind === "order" &&
        name === "20261013000100_cart_selections_and_money"
      ) {
        // This historical fixture predates selectionKey. Insert at its real
        // schema boundary, then let the existing Cart migration backfill it.
        sql(
          kind,
          readFileSync(
            path.join(root, "scripts/db/d1-order-upgrade-fixture.sql"),
            "utf8",
          ),
        );
      }
      if (kind === "order" && name === "20261014000100_checkout_attempts") {
        const before = sql(
          kind,
          'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
        );
        sql(
          kind,
          migration.replace(
            "COMMIT;",
            () =>
              "DO $$ BEGIN RAISE EXCEPTION 'd2_attempt_upgrade_fault'; END $$;\nCOMMIT;",
          ),
          /^ERROR:\s+P0001: d2_attempt_upgrade_fault/,
        );
        assert.equal(
          sql(kind, `SELECT to_regclass('public."CheckoutAttempt"') IS NULL;`),
          "t",
        );
        assert.equal(
          sql(
            kind,
            'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
          ),
          before,
        );
        sql(kind, migration);
        assert.equal(
          sql(
            kind,
            'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
          ),
          before,
        );
      } else if (
        kind === "order" &&
        name === "20261014000200_order_payment_processing"
      ) {
        sql(
          kind,
          `BEGIN; ${migration}\nDO $$ BEGIN RAISE EXCEPTION 'd2_status_upgrade_fault'; END $$; COMMIT;`,
          /^ERROR:\s+P0001: d2_status_upgrade_fault/,
        );
        assert.equal(
          sql(
            kind,
            `SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='OrderStatus' AND e.enumlabel='PAYMENT_PROCESSING';`,
          ),
          "0",
        );
        sql(kind, migration);
      } else sql(kind, migration);
    }
  }
  const controlId = "fd600000-0000-4000-8000-000000000001";
  const otherId = "fd600000-0000-4000-8000-000000000002";
  const owner = "fd600000-0000-4000-8000-000000000099";
  const control = `INSERT INTO "CheckoutAttempt" (id,"userId","keyHash","intentHash","stockHash","cartId","cartFingerprint",payload,"updatedAt") VALUES ('${controlId}','${owner}',repeat('a',64),repeat('b',64),repeat('c',64),'${controlId}',repeat('d',64),'{}',now());`;
  sql("order", `BEGIN; ${control} ROLLBACK;`);
  for (const [update, constraint] of [
    [`"keyHash"='invalid'`, "CheckoutAttempt_hashes_check"],
    [`payload='[]'`, "CheckoutAttempt_state_check"],
    [`"leaseToken"='${otherId}'`, "CheckoutAttempt_lease_check"],
    [`state='COMPLETED'`, "CheckoutAttempt_state_check"],
    [`failures=-1`, "CheckoutAttempt_failures_check"],
  ])
    sql(
      "order",
      `BEGIN; ${control} UPDATE "CheckoutAttempt" SET ${update} WHERE id='${controlId}'; COMMIT;`,
      new RegExp(`^ERROR:\\s+23514:[\\s\\S]*${constraint}`),
    );
  sql(
    "order",
    `BEGIN; ${control} INSERT INTO "CheckoutAttempt" SELECT '${otherId}',"userId",repeat('e',64),"intentHash","stockHash","cartId","cartFingerprint",state,payload,"orderId","leaseToken","leaseUntil","nextRetryAt",failures,"createdAt","updatedAt" FROM "CheckoutAttempt" WHERE id='${controlId}'; COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*CheckoutAttempt_one_active_owner/,
  );

  assert.equal(
    sql("order", `SELECT enum_range(NULL::"OrderStatus")::text;`),
    "{PENDING,PAYMENT_PROCESSING,PAID,FULFILLED,CANCELLED}",
  );
  const controlHeader = `INSERT INTO "Order" (id,"orderNumber","userId",currency,subtotal,total,"updatedAt") VALUES ('${controlId}','D2-ATTEMPT-FK-CONTROL','${owner}','USD',0,0,now());`;
  const completeControl = `${controlHeader} ${control} UPDATE "CheckoutAttempt" SET state='COMPLETED',"orderId"=id,payload=NULL WHERE id='${controlId}';`;
  sql("order", `BEGIN; ${completeControl} ROLLBACK;`);
  sql(
    "order",
    `BEGIN; ${completeControl} DELETE FROM "Order" WHERE id='${controlId}'; COMMIT;`,
    /^ERROR:\s+23503:[\s\S]*CheckoutAttempt_orderId_fkey/,
  );
  sql(
    "order",
    `BEGIN; ${control} UPDATE "CheckoutAttempt" SET state='CANCELLED',payload=NULL WHERE id='${controlId}'; INSERT INTO "CheckoutAttempt" SELECT '${otherId}',"userId","keyHash","intentHash","stockHash","cartId","cartFingerprint",state,payload,"orderId","leaseToken","leaseUntil","nextRetryAt",failures,"createdAt","updatedAt" FROM "CheckoutAttempt" WHERE id='${controlId}'; COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*CheckoutAttempt_userId_keyHash_key/,
  );

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
  const { CheckoutReceiptRetention } = orderRequire(
    "./src/order/checkout-receipt-retention.ts",
  );
  const { ProductServiceImpl } = productRequire(
    "./src/product/product.service.ts",
  );
  const { CheckoutStockService } = productRequire(
    "./src/product/checkout-stock.service.ts",
  );
  const { defer, of, firstValueFrom } = orderRequire("rxjs");
  const { toGrpcBoundaryException } = orderRequire("@nebula/grpc-auth");
  async function rpc(work) {
    try {
      return await work();
    } catch (error) {
      if (typeof error?.code === "number") throw error;
      throw toGrpcBoundaryException(error).getError();
    }
  }
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
  // Only publication dependencies and transport are stubbed. Both owning
  // services, catalogue pricing and all local transactions use actual Prisma.
  Object.assign(catalogue, { assertPublicEligibility: async () => undefined });
  const stock = new CheckoutStockService(productDb, catalogue);
  let reserveLost = false,
    finalizeOffline = false,
    cancelOffline = false,
    publicationOffline = false;
  let reserveCalls = 0,
    finalizeCalls = 0,
    cancelCalls = 0;
  function service(db = orderDb) {
    const instance = new OrderService(db, {}, {});
    Object.assign(instance, {
      settingsSvc: {
        GetString: ({ namespace }) =>
          of({ found: true, value: namespace === "pricing" ? "USD" : "30" }),
      },
      productSvc: {
        GetProduct: ({ id }) =>
          defer(() =>
            rpc(() => {
              if (publicationOffline) throw new Error("publication_offline");
              return catalogue.getPublic(id);
            }),
          ),
        ReserveCheckoutStock: (request) =>
          defer(() =>
            rpc(async () => {
              reserveCalls++;
              const result = await stock.reserve(request);
              if (reserveLost) {
                reserveLost = false;
                throw { code: 14, details: "response_lost_after_reserve" };
              }
              return result;
            }),
          ),
        FinalizeCheckoutStock: (request) =>
          defer(() =>
            rpc(async () => {
              finalizeCalls++;
              if (finalizeOffline)
                throw { code: 14, details: "finalize_offline" };
              return stock.finalize(request);
            }),
          ),
        CancelCheckoutStock: (request) =>
          defer(() =>
            rpc(async () => {
              cancelCalls++;
              if (cancelOffline) throw { code: 14, details: "cancel_offline" };
              return stock.cancel(request);
            }),
          ),
      },
    });
    return instance;
  }
  const orders = service();
  const productId = randomUUID(),
    variantParent = randomUUID(),
    variantId = randomUUID(),
    unmanagedId = randomUUID();
  const makeProduct = (id, extra = {}) =>
    productDb.product.create({
      data: {
        id,
        slug: id,
        sku: id,
        title: "Coordination proof",
        description: "Required valid fixture",
        categoryId: "fd400000-0000-4000-8000-000000000001",
        currency: "USD",
        price: "7.25",
        tags: [],
        complementaryIds: [],
        ...extra,
      },
    });
  await makeProduct(productId, { trackInventory: true, stockQuantity: 30 });
  await makeProduct(variantParent, {
    selectionMode: "VARIANT",
    trackInventory: true,
  });
  await productDb.productVariant.create({
    data: {
      id: variantId,
      productId: variantParent,
      sku: "COORD-BLUE",
      options: { Color: "Blue" },
      optionKey: '[["color","blue"]]',
      stockQuantity: 10,
    },
  });
  await makeProduct(unmanagedId);
  const quantity = async () =>
    (await productDb.product.findUniqueOrThrow({ where: { id: productId } }))
      .stockQuantity;
  const buyer = () => randomUUID();
  const add = (customer, extra = {}) =>
    orders.addToCart(customer, { productId, quantity: 2, ...extra });
  const forceDue = async (customer) => {
    const row = await orderDb.checkoutAttempt.findFirstOrThrow({
      where: {
        userId: customer,
        state: { in: ["PREPARED", "ORDER_COMMITTED", "CANCELLING"] },
      },
    });
    // Preserve a running executor's token; an already released retry gets a
    // complete expired lease pair, never the invalid null-token/non-null-date.
    return orderDb.checkoutAttempt.update({
      where: { id: row.id },
      data: {
        leaseToken: row.leaseToken ?? randomUUID(),
        leaseUntil: new Date(0),
        nextRetryAt: new Date(0),
      },
    });
  };
  const attempt = (customer) =>
    orderDb.checkoutAttempt.findFirstOrThrow({ where: { userId: customer } });

  const firstOwner = buyer();
  await add(firstOwner);
  const concurrent = await Promise.all([
    orders.checkout(firstOwner, "coord-same-key-concurrent"),
    orders.checkout(firstOwner, "coord-same-key-concurrent"),
  ]);
  assert.deepEqual(concurrent[0], concurrent[1]);
  assert.equal(await quantity(), 28);
  assert.equal(await orderDb.order.count({ where: { userId: firstOwner } }), 1);
  publicationOffline = true;
  assert.deepEqual(
    await service().checkout(firstOwner, "coord-same-key-concurrent"),
    concurrent[0],
  );
  publicationOffline = false;
  await add(firstOwner);
  const freshCart = await orders.getCartForUser(firstOwner);
  assert.deepEqual(
    await service().checkout(firstOwner, "coord-same-key-concurrent"),
    concurrent[0],
  );
  assert.deepEqual(await orders.getCartForUser(firstOwner), freshCart);

  const failedOwner = buyer();
  await add(failedOwner);
  const originalCart = await orders.getCartForUser(failedOwner);
  sql(
    "order",
    `CREATE FUNCTION coord_fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'coord_receipt_write_fault'; END $$; CREATE TRIGGER coord_receipt_write_fault BEFORE INSERT ON "CheckoutReceipt" FOR EACH ROW EXECUTE FUNCTION coord_fail_receipt();`,
  );
  await assert.rejects(
    orders.checkout(failedOwner, "coord-receipt-write-failure"),
    /coord_receipt_write_fault/,
  );
  sql(
    "order",
    'DROP TRIGGER coord_receipt_write_fault ON "CheckoutReceipt"; DROP FUNCTION coord_fail_receipt();',
  );
  assert.equal(await quantity(), 28);
  assert.equal((await attempt(failedOwner)).state, "CANCELLED");
  assert.equal(
    await orderDb.order.count({ where: { userId: failedOwner } }),
    0,
  );
  assert.equal(
    await orderDb.checkoutReceipt.count({ where: { userId: failedOwner } }),
    0,
  );
  assert.deepEqual(await orders.getCartForUser(failedOwner), originalCart);

  const lostOwner = buyer();
  await add(lostOwner);
  reserveLost = true;
  await assert.rejects(
    orders.checkout(lostOwner, "coord-reserve-response-lost"),
    /response_lost_after_reserve/,
  );
  assert.equal(await quantity(), 28);
  assert.equal((await attempt(lostOwner)).state, "CANCELLED");

  const cancellationOwner = buyer();
  await add(cancellationOwner);
  reserveLost = true;
  cancelOffline = true;
  await assert.rejects(
    orders.checkout(cancellationOwner, "coord-cancel-outage-key"),
    /checkout_recovery_pending/,
  );
  assert.equal(await quantity(), 26);
  assert.equal((await attempt(cancellationOwner)).state, "CANCELLING");
  await assert.rejects(
    orders.addToCart(cancellationOwner, { productId, quantity: 1 }),
    /checkout_in_progress/,
  );
  await assert.rejects(
    orders.removeCartItem(
      cancellationOwner,
      (await orders.getCartForUser(cancellationOwner)).data.items[0].id,
    ),
    /checkout_in_progress/,
  );
  cancelOffline = false;
  await forceDue(cancellationOwner);
  await service().recoverCheckouts();
  assert.equal(await quantity(), 28);
  assert.equal((await attempt(cancellationOwner)).state, "CANCELLED");

  const pendingOwner = buyer();
  await add(pendingOwner);
  finalizeOffline = true;
  await assert.rejects(
    orders.checkout(pendingOwner, "coord-finalize-outage-key"),
    /checkout_recovery_pending/,
  );
  const pending = await attempt(pendingOwner);
  assert.equal(pending.state, "ORDER_COMMITTED");
  assert.equal(await quantity(), 26);
  assert.deepEqual((await orders.listOrdersForUser(pendingOwner)).data, []);
  await assert.rejects(
    orders.getOrderForUser(pendingOwner, pending.id),
    /order_not_found/,
  );
  await assert.rejects(
    orders.updateOrderStatusAdmin(
      pending.id,
      { status: "PAID", expectedVersion: 1 },
      "coord-status-pending-key",
      { userId: "fd230000-0000-4000-8000-000000000090", role: "admin" },
    ),
    /checkout_in_progress/,
  );
  await orderDb.checkoutReceipt.update({
    where: { orderId: pending.id },
    data: {
      createdAt: new Date("2020-01-01"),
      replayUntil: new Date("2020-01-08"),
    },
  });
  await new CheckoutReceiptRetention(orderDb).compact();
  assert.notEqual(
    (
      await orderDb.checkoutReceipt.findUniqueOrThrow({
        where: { orderId: pending.id },
      })
    ).response,
    null,
  );
  const cancelsBefore = cancelCalls;
  finalizeOffline = false;
  await forceDue(pendingOwner);
  await service().recoverCheckouts();
  assert.equal((await attempt(pendingOwner)).state, "COMPLETED");
  assert.equal(cancelCalls, cancelsBefore);
  assert.equal(await quantity(), 26);
  const recovered = await service().checkout(
    pendingOwner,
    "coord-finalize-outage-key",
  );
  assert.equal(recovered.data.id, pending.id);
  assert.equal(
    (
      await orderDb.checkoutReceipt.findUniqueOrThrow({
        where: { orderId: pending.id },
      })
    ).replayUntil.getTime() > Date.now(),
    true,
  );
  assert.equal((await attempt(pendingOwner)).payload, null);

  const ambiguousOwner = buyer();
  await add(ambiguousOwner);
  let txNumber = 0;
  const ambiguousDb = new Proxy(orderDb, {
    get(target, property) {
      if (property !== "$transaction") return Reflect.get(target, property);
      return async (...args) => {
        const number = ++txNumber;
        const result = await target.$transaction(...args);
        if (number === 2) throw new Error("coord_committed_response_lost");
        return result;
      };
    },
  });
  const beforeCancel = cancelCalls;
  const ambiguousResult = await service(ambiguousDb).checkout(
    ambiguousOwner,
    "coord-commit-response-lost",
  );
  assert.equal((await attempt(ambiguousOwner)).state, "COMPLETED");
  assert.equal(cancelCalls, beforeCancel);
  assert.equal(await quantity(), 24);
  assert.equal(
    await orderDb.order.count({ where: { userId: ambiguousOwner } }),
    1,
  );
  await orders.updateOrderStatusAdmin(
    ambiguousResult.data.id,
    { status: "PAID", expectedVersion: 1 },
    "coord-status-after-complete",
    { userId: "fd230000-0000-4000-8000-000000000090", role: "admin" },
  );
  assert.equal(
    (await orders.getOrderForUser(ambiguousOwner, ambiguousResult.data.id)).data
      .status,
    "PAID",
  );
  assert.equal(
    (await service().checkout(ambiguousOwner, "coord-commit-response-lost"))
      .data.status,
    "PENDING",
  );

  // Restart windows around the actual remote operation, including an RPC
  // accepted only after recovery writes a cancellation tombstone.
  for (const beforeReserve of [false, true]) {
    const interruptedOwner = buyer();
    await add(interruptedOwner);
    const beforeQuantity = await quantity();
    let release, entered;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const signal = new Promise((resolve) => {
      entered = resolve;
    });
    const interrupted = service();
    let rawRpc;
    interrupted.productSvc.ReserveCheckoutStock = (request) =>
      defer(() => {
        rawRpc = rpc(async () => {
          if (beforeReserve) {
            entered();
            await gate;
            return stock.reserve(request);
          }
          const result = await stock.reserve(request);
          entered();
          await gate;
          return result;
        });
        return rawRpc;
      });
    const outcome = interrupted
      .checkout(interruptedOwner, `coord-interrupted-${beforeReserve}`)
      .then(
        (value) => ({ value }),
        (error) => ({ error }),
      );
    try {
      await Promise.race([
        signal,
        outcome.then((result) => {
          throw result.error ?? new Error("coord_interruption_not_reached");
        }),
      ]);
      assert.equal((await attempt(interruptedOwner)).state, "PREPARED");
      await forceDue(interruptedOwner);
      await service().recoverCheckouts();
      release();
      const result = await outcome;
      await rawRpc;
      assert.match(result.error?.message ?? "", /checkout_recovery_pending/);
      assert.equal((await attempt(interruptedOwner)).state, "CANCELLED");
      assert.equal(await quantity(), beforeQuantity);
      assert.equal(
        await orderDb.order.count({ where: { userId: interruptedOwner } }),
        0,
      );
      assert.equal(
        (
          await productDb.checkoutStockIntent.findUniqueOrThrow({
            where: { id: (await attempt(interruptedOwner)).id },
          })
        ).state,
        "CANCELLED",
      );
    } finally {
      release();
      await outcome;
      if (rawRpc) await rawRpc.catch(() => undefined);
    }
  }

  const uncertainOwner = buyer();
  await add(uncertainOwner);
  let uncertainTx = 0;
  const uncertainDb = new Proxy(orderDb, {
    get(target, property) {
      if (property !== "$transaction") return Reflect.get(target, property);
      return async (...args) => {
        const number = ++uncertainTx;
        if (number === 3) throw new Error("coord_commit_decision_unavailable");
        const result = await target.$transaction(...args);
        if (number === 2) throw new Error("coord_committed_response_lost");
        return result;
      };
    },
  });
  const uncertainCancelCount = cancelCalls;
  await assert.rejects(
    service(uncertainDb).checkout(uncertainOwner, "coord-unknown-commit-key"),
    /checkout_recovery_pending/,
  );
  assert.equal((await attempt(uncertainOwner)).state, "ORDER_COMMITTED");
  assert.equal(cancelCalls, uncertainCancelCount);
  await forceDue(uncertainOwner);
  await service().recoverCheckouts();
  assert.equal((await attempt(uncertainOwner)).state, "COMPLETED");
  assert.equal(cancelCalls, uncertainCancelCount);
  const stableQuantity = await quantity();
  assert.equal(stableQuantity, 22);

  const racedOwner = buyer();
  await add(racedOwner);
  const raced = service();
  const normalReserve = raced.productSvc.ReserveCheckoutStock;
  raced.productSvc.ReserveCheckoutStock = (request) =>
    defer(async () => {
      await productDb.product.update({
        where: { id: productId },
        data: { status: "ARCHIVED", version: { increment: 1 } },
      });
      return firstValueFrom(normalReserve(request));
    });
  await assert.rejects(
    raced.checkout(racedOwner, "coord-publication-race-key"),
    (error) =>
      error.getStatus?.() === 409 &&
      error.message === "checkout_selection_changed",
  );
  assert.equal((await attempt(racedOwner)).state, "CANCELLED");
  assert.equal(await quantity(), stableQuantity);
  await productDb.product.update({
    where: { id: productId },
    data: { status: "ACTIVE", version: { increment: 1 } },
  });

  const variantOwner = buyer();
  await add(variantOwner, { productId: variantParent, variantId });
  const variantOrder = await orders.checkout(
    variantOwner,
    "coord-variant-selection-key",
  );
  assert.equal(variantOrder.data.items[0].variantId, variantId);
  assert.equal(
    (
      await productDb.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      })
    ).stockQuantity,
    8,
  );
  const unmanagedOwner = buyer();
  await add(unmanagedOwner, { productId: unmanagedId, quantity: 100 });
  const competingKeys = await Promise.allSettled([
    orders.checkout(unmanagedOwner, "coord-unmanaged-selection-key"),
    orders.checkout(unmanagedOwner, "coord-other-unmanaged-key"),
  ]);
  assert.equal(
    competingKeys.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    await orderDb.order.count({ where: { userId: unmanagedOwner } }),
    1,
  );
  assert.equal(
    (await productDb.product.findUniqueOrThrow({ where: { id: unmanagedId } }))
      .stockQuantity,
    0,
  );

  await orderDb.checkoutReceipt.update({
    where: { orderId: recovered.data.id },
    data: {
      createdAt: new Date("2020-01-01"),
      replayUntil: new Date("2020-01-08"),
    },
  });
  await new CheckoutReceiptRetention(orderDb).compact();
  assert.equal(
    (
      await orderDb.checkoutReceipt.findUniqueOrThrow({
        where: { orderId: recovered.data.id },
      })
    ).response,
    null,
  );
  await assert.rejects(
    service().checkout(pendingOwner, "coord-finalize-outage-key"),
    /checkout_replay_expired/,
  );
  assert.equal(await quantity(), stableQuantity);
  assert.ok(reserveCalls > 0 && finalizeCalls > 0 && cancelCalls > 0);
  console.log(
    "[d2-coordination-db] populated-upgrade-rollback-exact-constraints-payment-status=ok",
  );
  console.log(
    "[d2-coordination-db] same-key-concurrency-restart-replay-new-cart-preserved=ok",
  );
  console.log(
    "[d2-coordination-db] receipt-write-rollback-lost-reserve-compensation-cart-freeze=ok",
  );
  console.log(
    "[d2-coordination-db] cancel-outage-recovery-commit-response-loss-no-refund=ok",
  );
  console.log(
    "[d2-coordination-db] finalize-outage-hidden-order-retention-replay-window=ok",
  );
  console.log("[d2-coordination-db] variant-unmanaged-expiry-consumed-key=ok");
  console.log(
    "[d2-coordination-db] expired-lease-fencing-late-reserve-tombstone-unknown-commit-no-refund=ok",
  );
  console.log(
    "[d2-coordination-db] both owners use real Prisma; publication and RPC transport stubbed; native images/S2S/restarts remain separate",
  );
} catch (error) {
  errors.push(error);
}
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
      /^nebula_(order|products)_verify_coord_[a-f0-9]{12}$/,
    );
    assert.equal(
      execute(["dropdb", "-U", "postgres", "--force", database]).status,
      0,
      "d2_coord_dropdb_failed",
    );
  } catch (error) {
    errors.push(error);
  }
if (errors.length)
  throw new AggregateError(errors, "d2_coordination_proof_or_cleanup_failed");
console.log("[d2-coordination-db] cleaned 2 owned disposable databases");
