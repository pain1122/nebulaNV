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
  throw new Error("d2_stock_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_products_verify_stock_${randomBytes(6).toString("hex")}`;
const directory = path.join(root, "apps/product-service/prisma/migrations");
const target = "20261014000100_checkout_stock_intents";
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
  if (expectedError) {
    assert.notEqual(result.status, 0, "d2_stock_expected_failure_missing");
    const first = result.stderr.slice(result.stderr.indexOf("ERROR:"));
    assert.match(first, expectedError);
  } else assert.equal(result.status, 0, `d2_stock_sql_failed ${result.stderr}`);
  return result.stdout.trim();
}
const baseId = "fd100000-0000-4000-8000-000000000001";
const otherId = "fd100000-0000-4000-8000-000000000002";
const variantsId = "fd100000-0000-4000-8000-000000000003";
const unmanagedId = "fd100000-0000-4000-8000-000000000004";
const variantA = "fd300000-0000-4000-8000-000000000001";
const variantB = "fd300000-0000-4000-8000-000000000002";
const controlId = "fd200000-0000-4000-8000-000000000001";
const migration = readFileSync(
  path.join(directory, target, "migration.sql"),
  "utf8",
);
let created = false;
let failure;
try {
  assert.equal(
    execute(["createdb", "-U", "postgres", database]).status,
    0,
    "d2_stock_createdb_failed",
  );
  created = true;
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name < target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  sql(`INSERT INTO "Product" (id,slug,title,description,sku,price,currency,category_id,tags,"complementaryIds","trackInventory","stockQuantity","updatedAt")
    VALUES ('${baseId}','stock-control','Stock control','Valid required description','STOCK',7.25,'USD','fd400000-0000-4000-8000-000000000001','{}','{}',true,10,now());`);
  const before = sql(
    'SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Product" t;',
  );
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_stock_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /^ERROR:\s+P0001: d2_stock_upgrade_fault/,
  );
  assert.equal(
    sql(`SELECT to_regclass('public."CheckoutStockIntent"') IS NULL;`),
    "t",
  );
  assert.equal(
    sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Product" t;'),
    before,
  );
  sql(migration);
  assert.equal(
    sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY id)::text FROM "Product" t;'),
    before,
  );
  const control = `INSERT INTO "CheckoutStockIntent" (id,"payloadHash",state,"updatedAt") VALUES ('${controlId}',repeat('a',64),'HELD',now());
    INSERT INTO "CheckoutStockLine" (id,"intentId","productId","selectionKey",quantity,tracked,"heldProductId") VALUES ('${controlId}','${controlId}','${baseId}','${baseId}:base',1,true,'${baseId}');`;
  sql(`BEGIN; ${control} ROLLBACK;`);
  for (const [update, constraint] of [
    [
      `UPDATE "CheckoutStockIntent" SET "payloadHash"='bad';`,
      "CheckoutStockIntent_hash_check",
    ],
    [
      `UPDATE "CheckoutStockLine" SET quantity=0;`,
      "CheckoutStockLine_quantity_check",
    ],
    [
      `UPDATE "CheckoutStockLine" SET "selectionKey"='wrong';`,
      "CheckoutStockLine_selection_check",
    ],
    [
      `UPDATE "CheckoutStockLine" SET "heldProductId"=NULL,"heldVariantId"='${variantA}';`,
      "CheckoutStockLine_hold_check",
    ],
  ])
    sql(
      `BEGIN; ${control} ${update} COMMIT;`,
      new RegExp(`^ERROR:\\s+23514:[\\s\\S]*${constraint}`),
    );
  sql(
    `BEGIN; ${control} DELETE FROM "Product" WHERE id='${baseId}'; COMMIT;`,
    /^ERROR:\s+23503:[\s\S]*CheckoutStockLine_heldProductId_fkey/,
  );

  // Current runtime follows the pinned historical migration/rollback proof.
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name) && name > target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));

  const require = createRequire(
    path.join(root, "apps/product-service/package.json"),
  );
  require("ts-node").register({
    project: path.join(root, "apps/product-service/tsconfig.json"),
    transpileOnly: true,
  });
  const { PrismaClient } = require("./prisma/generated/client");
  const {
    CheckoutStockService,
  } = require("./src/product/checkout-stock.service.ts");
  const { ProductServiceImpl } = require("./src/product/product.service.ts");
  const { checkoutStockHash } = require("@nebula/clients");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
      },
    },
  });
  try {
    // Only remote publication eligibility is stubbed. Quantities, discounts,
    // versions, FK protection and transaction/concurrency use actual owner Prisma.
    const catalogue = { getPublic: async () => ({}) };
    const stock = new CheckoutStockService(prisma, catalogue);
    const emptyClient = { getService: () => ({}) };
    const admin = new ProductServiceImpl(
      prisma,
      emptyClient,
      emptyClient,
      emptyClient,
    );
    const line = (id, version, quantity, overrides = {}) => ({
      productId: id,
      variantId: "",
      expectedVersion: version,
      quantity,
      sku: "STOCK",
      unitPrice: "7.25",
      selectedOptions: {},
      ...overrides,
    });
    const request = (lines, id = randomUUID()) => {
      const facts = { currency: "USD", lines };
      return { ...facts, intentId: id, payloadHash: checkoutStockHash(facts) };
    };
    const product = (id) => prisma.product.findUniqueOrThrow({ where: { id } });
    const create = async (id, overrides = {}) =>
      prisma.product.create({
        data: {
          id,
          slug: id,
          title: "Stock proof",
          description: "Required control",
          sku: id,
          price: "7.25",
          currency: "USD",
          categoryId: "fd400000-0000-4000-8000-000000000001",
          tags: [],
          complementaryIds: [],
          ...overrides,
        },
      });
    await create(otherId, {
      trackInventory: true,
      stockQuantity: 0,
      sku: "EMPTY",
    });
    await create(variantsId, {
      selectionMode: "VARIANT",
      trackInventory: true,
    });
    await create(unmanagedId, { sku: "UNMANAGED" });
    for (const [id, color] of [
      [variantA, "Blue"],
      [variantB, "Red"],
    ])
      await prisma.productVariant.create({
        data: {
          id,
          productId: variantsId,
          sku: color,
          options: { Color: color },
          optionKey: JSON.stringify([["color", color.toLowerCase()]]),
          stockQuantity: 10,
        },
      });

    const first = request([line(baseId, 1, 3)]);
    const same = await Promise.all([
      stock.reserve(first),
      stock.reserve(first),
    ]);
    assert.deepEqual(same[0], same[1]);
    assert.equal((await product(baseId)).stockQuantity, 7);
    assert.equal((await product(baseId)).version, 2);
    await assert.rejects(
      admin.update(baseId, { stockQuantity: 20 }, 2),
      /product_version_conflict/,
    );
    await assert.rejects(
      prisma.product.delete({ where: { id: baseId } }),
      (error) => error.code === "P2003",
    );
    await stock.finalize(first);
    await stock.finalize(first);
    assert.equal((await product(baseId)).stockQuantity, 7);
    await assert.rejects(stock.cancel(first), /checkout_stock_conflict/);
    const changed = request([line(baseId, 2, 1)], first.intentId);
    await assert.rejects(stock.reserve(changed), /checkout_stock_conflict/);

    const attempts = [
      request([line(baseId, 2, 7)]),
      request([line(baseId, 2, 7)]),
    ];
    const winners = await Promise.allSettled(
      attempts.map((input) => stock.reserve(input)),
    );
    assert.equal(
      winners.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const losing = winners.find((result) => result.status === "rejected");
    assert.match(losing.reason.message, /checkout_stock_conflict/);
    assert.equal((await product(baseId)).stockQuantity, 0);
    const winner =
      attempts[winners.findIndex((result) => result.status === "fulfilled")];
    const restarted = new CheckoutStockService(prisma, {
      getPublic: async () => {
        throw new Error("completed_replay_must_not_requote");
      },
    });
    assert.equal((await restarted.reserve(winner)).state, "HELD");
    await Promise.all([stock.cancel(winner), stock.cancel(winner)]);
    assert.equal((await product(baseId)).stockQuantity, 7);
    assert.equal((await stock.reserve(winner)).state, "CANCELLED");

    const beforeMulti = await product(baseId);
    const multi = request([
      line(baseId, beforeMulti.version, 1),
      line(otherId, 1, 1, { sku: "EMPTY" }),
    ]);
    await assert.rejects(stock.reserve(multi), /checkout_stock_conflict/);
    assert.equal(
      (await product(baseId)).stockQuantity,
      beforeMulti.stockQuantity,
    );
    assert.equal((await product(baseId)).version, beforeMulti.version);
    assert.equal(
      await prisma.checkoutStockIntent.count({ where: { id: multi.intentId } }),
      0,
    );

    const late = request([line(baseId, beforeMulti.version, 1)]);
    await stock.cancel(late);
    assert.equal((await stock.reserve(late)).state, "CANCELLED");
    assert.equal(
      (await product(baseId)).stockQuantity,
      beforeMulti.stockQuantity,
    );

    const variantRequest = request([
      line(variantsId, 1, 3, {
        variantId: variantA,
        sku: "Blue",
        selectedOptions: { Color: "Blue" },
      }),
      line(variantsId, 1, 4, {
        variantId: variantB,
        sku: "Red",
        selectedOptions: { Color: "Red" },
      }),
    ]);
    await stock.reserve(variantRequest);
    assert.equal((await product(variantsId)).version, 2);
    assert.equal(
      (
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantA },
        })
      ).stockQuantity,
      7,
    );
    await assert.rejects(
      admin.updateVariant(variantsId, variantA, { stockQuantity: 20 }, 2),
      /checkout_stock_held/,
    );
    assert.equal((await product(variantsId)).version, 2);
    await admin.deleteVariant(variantsId, variantA, 2);
    await stock.cancel(variantRequest);
    assert.equal(
      (
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantA },
        })
      ).stockQuantity,
      10,
    );
    assert.equal(
      (
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantB },
        })
      ).stockQuantity,
      10,
    );
    assert.ok(
      (
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantA },
        })
      ).deletedAt,
    );

    const unmanaged = request([
      line(unmanagedId, 1, 100, { sku: "UNMANAGED" }),
    ]);
    await stock.reserve(unmanaged);
    assert.equal((await product(unmanagedId)).stockQuantity, 0);
    await assert.rejects(
      admin.update(unmanagedId, { trackInventory: true }, 2),
      /product_version_conflict/,
    );
    await stock.cancel(unmanaged);
    await admin.update(unmanagedId, { trackInventory: true }, 3);
    assert.equal((await product(unmanagedId)).stockQuantity, 0);

    const current = await product(baseId);
    const saturated = request([line(baseId, current.version, 2)]);
    await stock.reserve(saturated);
    await prisma.product.update({
      where: { id: baseId },
      data: { version: 2_147_483_647, deletedAt: new Date() },
    });
    await stock.cancel(saturated);
    assert.equal((await product(baseId)).stockQuantity, current.stockQuantity);
    assert.equal((await product(baseId)).version, 2_147_483_647);
    await prisma.product.delete({ where: { id: baseId } });
    assert.equal(
      await prisma.checkoutStockLine.count({
        where: { productId: baseId, heldProductId: { not: null } },
      }),
      0,
    );
    assert.ok(
      await prisma.checkoutStockLine.count({ where: { productId: baseId } }),
    );

    console.log(
      "[d2-stock-db] populated-preservation-first-error-rollback-exact-constraints=ok",
    );
    console.log(
      "[d2-stock-db] same-key-restart-replay-no-oversell-multiline-rollback=ok",
    );
    console.log(
      "[d2-stock-db] finalize-cancel-tombstone-admin-overwrite-protection=ok",
    );
    console.log(
      "[d2-stock-db] variants-unmanaged-deleted-row-refund-version-ceiling=ok",
    );
    console.log(
      "[d2-stock-db] Product owner SQL/Prisma only; remote eligibility stubbed; native migrate and cross-service recovery remain separate",
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
    assert.match(database, /^nebula_products_verify_stock_[a-f0-9]{12}$/);
    assert.equal(
      execute(["dropdb", "-U", "postgres", "--force", database]).status,
      0,
      "d2_stock_dropdb_failed",
    );
  } catch (error) {
    cleanupFailure = error;
  }
if (failure && cleanupFailure)
  throw new AggregateError(
    [failure, cleanupFailure],
    "d2_stock_proof_and_cleanup_failed",
  );
if (failure || cleanupFailure) throw failure ?? cleanupFailure;
console.log("[d2-stock-db] cleaned 1 owned disposable database");
