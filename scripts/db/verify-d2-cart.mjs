import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// SQL proof deliberately separate from Prisma migrate-deploy/status evidence.
if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_cart_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_order_verify_d2_${randomBytes(6).toString("hex")}`;
const target = "20261013000100_cart_selections_and_money";
const directory = path.join(root, "apps/order-service/prisma/migrations");
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
    text,
  );
  if (expectedError) {
    assert.notEqual(result.status, 0, "d2_expected_sql_failure_missing");
    assert.match(result.stderr, new RegExp(expectedError));
  } else assert.equal(result.status, 0, `d2_sql_failed ${result.stderr}`);
  return result.stdout.trim();
}
const migration = readFileSync(
  path.join(directory, target, "migration.sql"),
  "utf8",
);
const cart = "fd200000-0000-4000-8000-000000000001";
const product = "fd100000-0000-4000-8000-000000000001";
const item = "fd200000-0000-4000-8000-000000000002";
const variant = "fd300000-0000-4000-8000-000000000001";
const owner = "fd200000-0000-4000-8000-000000000099";
let created = false;
let failure;
try {
  assert.equal(
    execute(["createdb", "-U", "postgres", database]).status,
    0,
    "d2_createdb_failed",
  );
  created = true;
  for (const name of readdirSync(directory)
    .filter((name) => name < target && /^\d/.test(name))
    .sort()) {
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  }
  sql(
    readFileSync(
      path.join(root, "scripts/db/d1-order-upgrade-fixture.sql"),
      "utf8",
    ),
  );
  const before = sql(
    'SELECT row_to_json(t)::text FROM "CartItem" t ORDER BY id;',
  );
  sql(`UPDATE "CartItem" SET quantity = 0;`);
  sql(migration, "d2_cart_legacy_invalid_item");
  assert.equal(
    sql(
      `SELECT count(*) FROM information_schema.columns WHERE table_name='CartItem' AND column_name='variantId';`,
    ),
    "0",
  );
  sql(`UPDATE "CartItem" SET quantity = 2;
    INSERT INTO "CartItem" (id,"cartId","productId",name,quantity,"unitPrice","updatedAt")
    VALUES ('${variant}','${cart}','${product}','Duplicate',1,1,now());`);
  sql(migration, "d2_cart_legacy_duplicate_selection");
  sql(`DELETE FROM "CartItem" WHERE id='${variant}';`);
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_cart_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    "ERROR:  d2_cart_upgrade_fault",
  );
  assert.equal(
    sql(
      `SELECT count(*) FROM information_schema.columns WHERE table_name='CartItem' AND column_name='variantId';`,
    ),
    "0",
  );
  assert.equal(
    sql('SELECT row_to_json(t)::text FROM "CartItem" t ORDER BY id;'),
    before,
  );
  sql(migration);
  const after = JSON.parse(
    sql('SELECT row_to_json(t)::text FROM "CartItem" t;'),
  );
  delete after.variantId;
  delete after.selectionKey;
  delete after.selectedOptions;
  assert.deepEqual(after, JSON.parse(before), "d2_legacy_facts_changed");
} catch (error) {
  failure = error;
}

// Continuation below is kept inside the same guarded ownership/cleanup lifetime.
if (!failure)
  try {
    const legacy = JSON.parse(beforeForLegacy());
    assert.equal(legacy.quantity, 2);
    assert.equal(legacy.unitPrice, 12.5);
    assert.equal(legacy.selectionKey, `base:${product}`);
    assert.equal(legacy.variantId, null);
    assert.deepEqual(legacy.selectedOptions, {});
    assert.equal(
      sql(
        `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('CartItem','OrderItem','Order') AND data_type='numeric' AND numeric_precision=18 AND numeric_scale=2;`,
      ),
      "7",
    );
    // Valid control first; each negative isolates a single constraint.
    sql(`INSERT INTO "CartItem" (id,"cartId","productId","variantId","selectionKey","selectedOptions",sku,name,quantity,"unitPrice","updatedAt")
    VALUES ('${variant}','${cart}','${product}','${variant}','variant:${variant}','{"colour":"Blue"}','BLUE','Variant',1,0.00,now());`);
    for (const [update, constraint] of [
      ["quantity=0", "CartItem_quantity_check"],
      ['"unitPrice"=-0.01', "CartItem_price_check"],
      ["\"unitPrice\"='NaN'", "CartItem_price_check"],
      ["\"selectionKey\"='wrong'", "CartItem_selection_check"],
      ["\"selectedOptions\"='[]'", "CartItem_selection_check"],
    ])
      sql(`UPDATE "CartItem" SET ${update} WHERE id='${variant}';`, constraint);
    sql(
      `UPDATE "CartItem" SET "selectionKey"='base:${product}', "variantId"=NULL, "selectedOptions"='{}' WHERE id='${variant}';`,
      "CartItem_cartId_selectionKey_key",
    );
    sql(
      `UPDATE "CartItem" SET "selectedOptions"='{"forged":"option"}' WHERE id='${item}';`,
      "CartItem_selection_check",
    );
    sql(
      `UPDATE "CartItem" SET quantity=2147483648 WHERE id='${variant}';`,
      "integer out of range",
    );
    sql(
      `UPDATE "CartItem" SET "unitPrice"=90071992547409.91 WHERE id='${variant}';`,
    );
    assert.equal(
      sql(`SELECT "unitPrice"::text FROM "CartItem" WHERE id='${variant}';`),
      "90071992547409.91",
    );
    sql(
      `UPDATE "CartItem" SET "unitPrice"=10000000000000000.00 WHERE id='${variant}';`,
      "numeric field overflow",
    );
    function concurrent(statement) {
      return new Promise((resolve, reject) => {
        const child = spawn(
          docker,
          [
            "compose",
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
            "-At",
          ],
          { cwd: root, stdio: ["pipe", "pipe", "pipe"] },
        );
        let output = "";
        child.stderr.on("data", (data) => {
          output += data;
        });
        child.stdout.resume();
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error("d2_concurrency_timeout"));
        }, 15000);
        child.on("error", reject);
        child.on("close", (code) => {
          clearTimeout(timer);
          code === 0
            ? resolve()
            : reject(new Error(`d2_concurrency_failed ${output}`));
        });
        child.stdin.end(statement);
      });
    }
    const lock = `SELECT pg_advisory_xact_lock(hashtextextended('nebula-cart:${owner}',0))::text;`;
    const increment = `BEGIN; ${lock} DO $$ DECLARE previous integer; BEGIN SELECT quantity INTO previous FROM "CartItem" WHERE id='${item}'; PERFORM pg_sleep(0.2); UPDATE "CartItem" SET quantity=previous+1 WHERE id='${item}'; END $$; COMMIT;`;
    await Promise.all([concurrent(increment), concurrent(increment)]);
    assert.equal(
      sql(`SELECT quantity FROM "CartItem" WHERE id='${item}';`),
      "4",
    );
    // Same guarded check/create pattern for a new owner, concurrent sessions.
    const newOwner = "fd200000-0000-4000-8000-000000000098";
    const creation = `BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('nebula-cart:${newOwner}',0))::text; SELECT pg_sleep(0.2);
    INSERT INTO "Cart" (id,"userId",currency,"updatedAt") SELECT '${variant}','${newOwner}','USD',now() WHERE NOT EXISTS (SELECT 1 FROM "Cart" WHERE "userId"='${newOwner}'); COMMIT;`;
    await Promise.all([concurrent(creation), concurrent(creation)]);
    assert.equal(
      sql(`SELECT count(*) FROM "Cart" WHERE "userId"='${newOwner}';`),
      "1",
    );
    // Exercise the actual owner with the actual generated Prisma driver. Only
    // remote Product/Settings authority is stubbed; storage and locking are real.
    // Historical Cart assertions above stay pinned; current owner reads the
    // later attempt table when guarding Cart mutations.
    for (const name of readdirSync(directory)
      .filter((name) => /^\d/.test(name) && name > target)
      .sort()) {
      sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
    }
    const orderRequire = createRequire(
      path.join(root, "apps/order-service/package.json"),
    );
    orderRequire("ts-node").register({
      project: path.join(root, "apps/order-service/tsconfig.json"),
      transpileOnly: true,
    });
    const { OrderService } = orderRequire("./src/order/order.service.ts");
    const { PrismaClient } = orderRequire("./prisma/generated/client");
    const { of } = orderRequire("rxjs");
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
        },
      },
    });
    try {
      let amount = "0.10";
      const service = new OrderService(prisma, {}, {});
      Object.assign(service, {
        productSvc: {
          GetProduct: () =>
            of({
              data: {
                id: product,
                title: "Actual owner",
                sku: "ACTUAL",
                status: "ACTIVE",
                deletedAt: "",
                selectionMode: "BASE",
                availability: "AVAILABLE",
                trackInventory: true,
                stockQuantity: 10,
                currency: "USD",
                effectivePriceAmount: amount,
              },
            }),
        },
        settingsSvc: {
          GetString: ({ namespace }) =>
            of({ found: true, value: namespace === "pricing" ? "USD" : "30" }),
        },
      });
      await Promise.all([
        service.addToCart(newOwner, { productId: product, quantity: 1 }),
        service.addToCart(newOwner, { productId: product, quantity: 1 }),
      ]);
      const before = (await service.getCartForUser(newOwner)).data;
      assert.equal(before.items.length, 1);
      assert.equal(before.items[0].quantity, 2);
      assert.equal(before.total, "0.20");
      amount = "9999999999999999.99";
      await assert.rejects(
        service.updateCartItem(newOwner, before.items[0].id, { quantity: 2 }),
        /cart_amount_out_of_range/,
      );
      assert.deepEqual((await service.getCartForUser(newOwner)).data, before);
      amount = "0.10";
      const changes = await Promise.allSettled([
        service.updateCartItem(newOwner, before.items[0].id, { quantity: 3 }),
        service.removeCartItem(newOwner, before.items[0].id),
      ]);
      assert.equal(changes[1].status, "fulfilled");
      if (changes[0].status === "rejected")
        assert.match(changes[0].reason.message, /cart_item_not_found/);
      assert.equal((await service.getCartForUser(newOwner)).data.total, "0.00");
      assert.equal(
        (await service.getCartForUser(newOwner)).data.items.length,
        0,
      );
    } finally {
      await prisma.$disconnect();
    }
    sql(
      `BEGIN; DELETE FROM "CartItem" WHERE "cartId"='${cart}'; DELETE FROM "Cart" WHERE id='${cart}'; COMMIT;`,
    );
    console.log(
      "[d2-cart-db] populated-backfill=ok rollback=ok constraints=ok money=ok concurrent-increments=ok owner-creation-race=ok actual-owner-prisma-concurrency-overflow-removal=ok expiry-fk-cleanup=ok",
    );
  } catch (error) {
    failure = error;
  }
function beforeForLegacy() {
  return sql(
    'SELECT row_to_json(t)::text FROM "CartItem" t ORDER BY id LIMIT 1;',
  );
}
let cleanupFailure;
if (created)
  try {
    assert.match(database, /^nebula_order_verify_d2_[a-f0-9]{12}$/);
    assert.equal(
      execute(["dropdb", "-U", "postgres", "--force", database]).status,
      0,
      "d2_dropdb_failed",
    );
  } catch (error) {
    cleanupFailure = error;
  }
if (failure && cleanupFailure)
  throw new AggregateError(
    [failure, cleanupFailure],
    "d2_cart_proof_and_cleanup_failed",
  );
if (failure || cleanupFailure) throw failure ?? cleanupFailure;
console.log(
  "[d2-cart-db] cleaned 1 owned disposable database; Prisma deployment/rerun proof remains separate",
);
