import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_checkout_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_order_verify_checkout_${randomBytes(6).toString("hex")}`;
const directory = path.join(root, "apps/order-service/prisma/migrations");
const target = "20261013000200_order_commercial_snapshots";
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
function sql(text, expectedError) {
  const result = execute(
    ["psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"],
    `\\set VERBOSITY verbose\n${text}`,
  );
  if (expectedError) {
    assert.notEqual(result.status, 0, "d2_checkout_expected_failure_missing");
    assert.match(result.stderr, expectedError);
  } else
    assert.equal(result.status, 0, `d2_checkout_sql_failed ${result.stderr}`);
  return result.stdout.trim();
}
const migration = readFileSync(
  path.join(directory, target, "migration.sql"),
  "utf8",
);
const owner = "fd200000-0000-4000-8000-000000000098";
const product = "fd100000-0000-4000-8000-000000000001";
const variant = "fd300000-0000-4000-8000-000000000001";
const legacyOrder = "fd200000-0000-4000-8000-000000000003";
const legacyItem = "fd200000-0000-4000-8000-000000000004";
let created = false;
let failure;
try {
  assert.equal(
    execute(["createdb", "-U", "postgres", database]).status,
    0,
    "d2_checkout_createdb_failed",
  );
  created = true;
  const baselineNames = readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name < target)
    .sort();
  const fixtureBoundary = "20261013000100_cart_selections_and_money";
  assert.ok(
    baselineNames.includes(fixtureBoundary),
    "d2_checkout_fixture_boundary_missing",
  );
  for (const name of baselineNames.filter((name) => name < fixtureBoundary))
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  sql(
    readFileSync(
      path.join(root, "scripts/db/d1-order-upgrade-fixture.sql"),
      "utf8",
    ),
  );
  for (const name of baselineNames.filter((name) => name >= fixtureBoundary))
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  const before = sql(
    'SELECT row_to_json(t)::text FROM "OrderItem" t ORDER BY id;',
  );
  const headerBefore = sql(
    'SELECT row_to_json(t)::text FROM "Order" t ORDER BY id;',
  );
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_checkout_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /P0001: d2_checkout_upgrade_fault/,
  );
  assert.equal(
    sql(
      `SELECT count(*) FROM information_schema.columns WHERE (table_name='OrderItem' AND column_name IN ('variantId','selectedOptions')) OR (table_name='Order' AND column_name='checkoutMode');`,
    ),
    "0",
  );
  sql(migration);
  assert.deepEqual(
    JSON.parse(
      sql(
        `SELECT (to_jsonb(t)-'variantId'-'selectedOptions')::text FROM "OrderItem" t ORDER BY id;`,
      ),
    ),
    JSON.parse(before),
  );
  // Compare JSON semantically: PostgreSQL jsonb changes key ordering only.
  assert.deepEqual(
    JSON.parse(
      sql(
        `SELECT (to_jsonb(t)-'checkoutMode')::text FROM "Order" t ORDER BY id;`,
      ),
    ),
    JSON.parse(headerBefore),
  );
  assert.equal(
    sql(`SELECT "checkoutMode" FROM "Order" WHERE id='${legacyOrder}';`),
    "DEMO_NO_PAYMENT",
  );
  assert.deepEqual(
    JSON.parse(
      sql(
        `SELECT "selectedOptions"::text FROM "OrderItem" WHERE id='${legacyItem}';`,
      ),
    ),
    {},
  );
  // Valid controls first. Each failure changes only the named constraint inputs.
  sql(
    `BEGIN;
     INSERT INTO "Order" (id,"orderNumber","userId",currency,"checkoutMode",subtotal,total,"updatedAt")
     VALUES ('${variant}','D2-VALID-CONTROL','${owner}','USD','DEMO_NO_PAYMENT',14.50,14.50,now());
     INSERT INTO "OrderItem" (id,"orderId","productId","variantId","selectedOptions",sku,name,quantity,"unitPrice","lineTotal","updatedAt")
     VALUES ('${variant}','${variant}','${product}','${variant}','{"colour":"Blue"}','BLUE','Valid control',2,7.25,14.50,now());
     ROLLBACK;`,
  );
  for (const bad of [
    `"variantId"='${variant}',"selectedOptions"='{}'`,
    `"selectedOptions"='{"colour":"Blue"}'`,
    `"variantId"='${variant}',"selectedOptions"='{"colour":7}'`,
    `"variantId"='${variant}',"selectedOptions"='{"colour":""}'`,
    `"selectedOptions"='[]'`,
  ])
    sql(
      `BEGIN; UPDATE "OrderItem" SET ${bad} WHERE id='${legacyItem}'; COMMIT;`,
      /23514:[\s\S]*OrderItem_selection_snapshot_check/,
    );
  sql(
    `UPDATE "Order" SET "checkoutMode"='DEMO_NO_PAYMENT' WHERE id='${legacyOrder}';`,
  );
  sql(
    `BEGIN; UPDATE "Order" SET "checkoutMode"='REAL_PAYMENT' WHERE id='${legacyOrder}'; COMMIT;`,
    /23514:[\s\S]*Order_checkoutMode_demo_check/,
  );

  // Historic snapshot rollback stays pinned above; current runtime needs the tail.
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name > target)
    .sort()) {
    const next = readFileSync(
      path.join(directory, name, "migration.sql"),
      "utf8",
    );
    if (name === "20261013000300_checkout_receipts") {
      const headers = sql(
        'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;',
      );
      sql(
        next.replace(
          "COMMIT;",
          () =>
            "DO $$ BEGIN RAISE EXCEPTION 'd2_receipt_upgrade_fault'; END $$;\nCOMMIT;",
        ),
        /P0001: d2_receipt_upgrade_fault/,
      );
      assert.equal(
        sql(`SELECT to_regclass('public."CheckoutReceipt"') IS NULL;`),
        "t",
      );
      sql(next);
      assert.equal(
        sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Order" t;'),
        headers,
      );
      sql(
        `BEGIN; INSERT INTO "CheckoutReceipt" (id,"userId","keyHash","intentHash","cartFingerprint","orderId",response,"createdAt","replayUntil") VALUES ('${variant}','${owner}',repeat('a',64),repeat('b',64),repeat('c',64),'${legacyOrder}','{}','2026-10-13','2026-10-20'); ROLLBACK;`,
      );
      for (const [column, value, constraint] of [
        ["keyHash", "bad", "CheckoutReceipt_hashes_check"],
        ["response", "[]", "CheckoutReceipt_response_check"],
        ["replayUntil", "2026-10-21", "CheckoutReceipt_replay_window_check"],
      ]) {
        sql(
          `BEGIN; INSERT INTO "CheckoutReceipt" (id,"userId","keyHash","intentHash","cartFingerprint","orderId",response,"createdAt","replayUntil") VALUES ('${variant}','${owner}',repeat('a',64),repeat('b',64),repeat('c',64),'${legacyOrder}','{}','2026-10-13','2026-10-20'); UPDATE "CheckoutReceipt" SET "${column}"='${value}'; COMMIT;`,
          new RegExp(`23514:[\\s\\S]*${constraint}`),
        );
      }
    } else sql(next);
  }

  const require = createRequire(
    path.join(root, "apps/order-service/package.json"),
  );
  require("ts-node").register({
    project: path.join(root, "apps/order-service/tsconfig.json"),
    transpileOnly: true,
  });
  const { OrderService } = require("./src/order/order.service.ts");
  const { PrismaClient } = require("./prisma/generated/client");
  const { of } = require("rxjs");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
      },
    },
  });
  try {
    let amount = "7.25";
    let title = "Demo variant";
    const service = new OrderService(prisma, {}, {});
    Object.assign(service, {
      productSvc: {
        ReserveCheckoutStock: (identity) => of({ ...identity, state: "HELD" }),
        FinalizeCheckoutStock: (identity) =>
          of({ ...identity, state: "FINALIZED" }),
        CancelCheckoutStock: (identity) =>
          of({ ...identity, state: "CANCELLED" }),
        GetProduct: () =>
          of({
            data: {
              id: product,
              version: 1,
              title,
              sku: "PARENT",
              status: "ACTIVE",
              deletedAt: "",
              selectionMode: "VARIANT",
              availability: "AVAILABLE",
              trackInventory: true,
              stockQuantity: 9,
              currency: "USD",
              effectivePriceAmount: "1.00",
              variants: [
                {
                  id: variant,
                  productId: product,
                  sku: "BLUE",
                  active: true,
                  deletedAt: "",
                  availability: "AVAILABLE",
                  stockQuantity: 3,
                  options: { colour: "Blue" },
                  effectivePriceAmount: amount,
                },
              ],
            },
          }),
      },
      settingsSvc: {
        GetString: ({ namespace }) =>
          of({ found: true, value: namespace === "pricing" ? "USD" : "30" }),
      },
    });
    await service.addToCart(owner, {
      productId: product,
      variantId: variant,
      quantity: 2,
    });
    const cartBefore = (await service.getCartForUser(owner)).data;
    amount = "8.00";
    await assert.rejects(
      service.checkout(owner, "sql-price-checkout-key"),
      /checkout_selection_changed/,
    );
    assert.deepEqual((await service.getCartForUser(owner)).data, cartBefore);
    assert.equal(await prisma.order.count({ where: { userId: owner } }), 0);
    amount = "7.25";
    // Force an actual database failure after the header insert, during nested items.
    sql(
      `CREATE FUNCTION d2_checkout_fail_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'd2_checkout_item_fault'; END $$; CREATE TRIGGER d2_checkout_item_fault BEFORE INSERT ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION d2_checkout_fail_item();`,
    );
    await assert.rejects(
      service.checkout(owner, "sql-failed-checkout-key"),
      /d2_checkout_item_fault/,
    );
    assert.equal(await prisma.order.count({ where: { userId: owner } }), 0);
    assert.deepEqual((await service.getCartForUser(owner)).data, cartBefore);
    sql(
      'DROP TRIGGER d2_checkout_item_fault ON "OrderItem"; DROP FUNCTION d2_checkout_fail_item();',
    );
    sql(
      `CREATE FUNCTION d2_receipt_fail_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'd2_receipt_write_fault'; END $$; CREATE TRIGGER d2_receipt_write_fault BEFORE INSERT ON "CheckoutReceipt" FOR EACH ROW EXECUTE FUNCTION d2_receipt_fail_write();`,
    );
    await assert.rejects(
      service.checkout(owner, "sql-receipt-write-fault", "demo"),
      /d2_receipt_write_fault/,
    );
    assert.equal(await prisma.order.count({ where: { userId: owner } }), 0);
    assert.equal(
      await prisma.checkoutReceipt.count({ where: { userId: owner } }),
      0,
    );
    assert.deepEqual((await service.getCartForUser(owner)).data, cartBefore);
    sql(
      'DROP TRIGGER d2_receipt_write_fault ON "CheckoutReceipt"; DROP FUNCTION d2_receipt_fail_write();',
    );
    const attempts = await Promise.allSettled([
      service.checkout(owner, "sql-checkout-key-a", "demo"),
      service.checkout(owner, "sql-checkout-key-b", "demo"),
    ]);
    assert.equal(
      attempts.filter((value) => value.status === "fulfilled").length,
      1,
    );
    const success = attempts.find(
      (value) => value.status === "fulfilled",
    ).value;
    assert.equal(await prisma.order.count({ where: { userId: owner } }), 1);
    assert.equal(success.data.checkoutMode, "DEMO_NO_PAYMENT");
    assert.equal(success.data.total, "14.50");
    assert.equal(success.data.items[0].variantId, variant);
    assert.deepEqual(success.data.items[0].selectedOptions, { colour: "Blue" });
    assert.equal(await prisma.cart.count({ where: { userId: owner } }), 0);
    title = "Later catalogue title";
    amount = "99.00";
    assert.deepEqual(
      await service.getOrderForUser(owner, success.data.id),
      success,
    );
    const winningKey =
      attempts[0].status === "fulfilled"
        ? "sql-checkout-key-a"
        : "sql-checkout-key-b";
    // Fresh instance simulates lost process/cache state; replay uses no remote calls.
    const restarted = new OrderService(prisma, {}, {});
    assert.deepEqual(
      await restarted.checkout(owner, winningKey, "demo"),
      success,
    );
    await assert.rejects(
      restarted.checkout(owner, winningKey, "changed"),
      /checkout_idempotency_conflict/,
    );
    await prisma.order.update({
      where: { id: success.data.id },
      data: { status: "PAID" },
    });
    assert.deepEqual(
      await restarted.checkout(owner, winningKey, "demo"),
      success,
    );
    const otherOwner = "fd200000-0000-4000-8000-000000000097";
    amount = "7.25";
    await service.addToCart(otherOwner, {
      productId: product,
      variantId: variant,
      quantity: 1,
    });
    const shared = await Promise.all([
      service.checkout(otherOwner, winningKey, "demo"),
      service.checkout(otherOwner, winningKey, "demo"),
    ]);
    assert.deepEqual(shared[0], shared[1]);
    assert.notEqual(shared[0].data.id, success.data.id);
    assert.equal(
      await prisma.order.count({ where: { userId: otherOwner } }),
      1,
    );
    // A fresh Cart survives a retry of the original consumed key.
    await service.addToCart(owner, {
      productId: product,
      variantId: variant,
      quantity: 1,
    });
    const newerCart = (await service.getCartForUser(owner)).data;
    assert.deepEqual(
      await restarted.checkout(owner, winningKey, "demo"),
      success,
    );
    assert.deepEqual((await service.getCartForUser(owner)).data, newerCart);
    // Move both timestamps together to keep the exact database retention contract.
    await prisma.checkoutReceipt.updateMany({
      where: { userId: owner },
      data: {
        createdAt: new Date("2020-01-01"),
        replayUntil: new Date("2020-01-08"),
      },
    });
    const {
      CheckoutReceiptRetention,
    } = require("./src/order/checkout-receipt-retention.ts");
    await new CheckoutReceiptRetention(prisma).compact();
    const tombstone = await prisma.checkoutReceipt.findFirstOrThrow({
      where: { userId: owner },
    });
    assert.equal(tombstone.response, null);
    await assert.rejects(
      restarted.checkout(owner, winningKey, "demo"),
      /checkout_replay_expired/,
    );
    assert.equal(await prisma.order.count({ where: { userId: owner } }), 1);
    assert.deepEqual((await service.getCartForUser(owner)).data, newerCart);
    const retentionOwner = "fd200000-0000-4000-8000-000000000096";
    sql(`WITH fixtures AS (
      INSERT INTO "Order" (id,"orderNumber","userId",currency,subtotal,total,"updatedAt")
      SELECT gen_random_uuid(),'D2-RETENTION-'||n,'${retentionOwner}','USD',0,0,now() FROM generate_series(1,101) n RETURNING id
    ) INSERT INTO "CheckoutReceipt" (id,"userId","keyHash","intentHash","cartFingerprint","orderId",response,"createdAt","replayUntil")
      SELECT gen_random_uuid(),'${retentionOwner}',repeat(md5(id::text),2),repeat('b',64),repeat('c',64),id,'{}','2021-01-01','2021-01-08' FROM fixtures;`);
    sql(
      `BEGIN; DELETE FROM "Order" WHERE id=(SELECT "orderId" FROM "CheckoutReceipt" WHERE "userId"='${retentionOwner}' LIMIT 1); COMMIT;`,
      /23503:[\s\S]*CheckoutReceipt_orderId_fkey/,
    );
    const { Prisma: receiptPrisma } = require("./prisma/generated/client");
    await new CheckoutReceiptRetention(prisma).compact();
    assert.equal(
      await prisma.checkoutReceipt.count({
        where: {
          userId: retentionOwner,
          response: { not: receiptPrisma.DbNull },
        },
      }),
      1,
    );
    await new CheckoutReceiptRetention(prisma).compact();
    assert.equal(
      await prisma.checkoutReceipt.count({
        where: {
          userId: retentionOwner,
          response: { not: receiptPrisma.DbNull },
        },
      }),
      0,
    );
    assert.equal(
      await prisma.checkoutReceipt.count({ where: { userId: retentionOwner } }),
      101,
    );
    console.log(
      "[d2-checkout-db] receipt-upgrade-rollback-controls=ok receipt-write-rollback=ok durable-response-loss-restart-replay=ok same-key-concurrency=ok owner-scope-intent-conflict=ok new-cart-preserved=ok expiry-compaction-tombstone=ok bounded-100-body-compaction=ok",
    );
    console.log(
      "[d2-checkout-db] populated-preservation=ok first-error-upgrade-rollback=ok exact-constraints=ok actual-prisma-stale-price-write-rollback-concurrent-checkout-snapshot=ok",
    );
  } finally {
    await prisma.$disconnect();
  }
} catch (error) {
  failure = error;
}
let cleanupFailure;
if (created)
  try {
    assert.match(database, /^nebula_order_verify_checkout_[a-f0-9]{12}$/);
    assert.equal(
      execute(["dropdb", "-U", "postgres", "--force", database]).status,
      0,
      "d2_checkout_dropdb_failed",
    );
  } catch (error) {
    cleanupFailure = error;
  }
if (failure && cleanupFailure)
  throw new AggregateError(
    [failure, cleanupFailure],
    "d2_checkout_proof_and_cleanup_failed",
  );
if (failure || cleanupFailure) throw failure ?? cleanupFailure;
console.log(
  "[d2-checkout-db] cleaned 1 owned disposable database; native Prisma deployment/replay/remote stock proofs remain separate",
);
