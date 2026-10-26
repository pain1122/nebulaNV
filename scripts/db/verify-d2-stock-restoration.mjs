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
  throw new Error("d2_restore_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_products_verify_restore_${randomBytes(6).toString("hex")}`;
const docker = process.env.NEBULA_DOCKER_COMMAND ?? "docker";
const target = "20261019000100_finalized_stock_restoration";
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
  const r = execute(
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
    assert.notEqual(r.status, 0, "d2_restore_expected_sql_failure_missing");
    assert.match(r.stderr.slice(r.stderr.indexOf("ERROR:")), expected);
  } else assert.equal(r.status, 0, `d2_restore_sql_failed ${r.stderr}`);
  return r.stdout.trim();
}
const require = createRequire(
  path.join(root, "apps/product-service/package.json"),
);
require("ts-node").register({
  project: path.join(root, "apps/product-service/tsconfig.json"),
  transpileOnly: true,
});
const { PrismaClient } = require("./prisma/generated");
const {
  CheckoutStockService,
} = require("./src/product/checkout-stock.service.ts");
const { checkoutStockHash } = require("@nebula/clients");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
    },
  },
});
const stock = () =>
  new CheckoutStockService(prisma, { getPublic: async () => ({}) });
const create = (id = randomUUID(), overrides = {}) =>
  prisma.product.create({
    data: {
      id,
      slug: id,
      sku: id,
      title: "Restoration proof",
      description: "Current required description",
      price: "7.25",
      currency: "USD",
      categoryId: "fd400000-0000-4000-8000-000000000001",
      tags: [],
      complementaryIds: [],
      trackInventory: true,
      stockQuantity: 10,
      ...overrides,
    },
  });
const product = (id) => prisma.product.findUniqueOrThrow({ where: { id } });
async function line(id, variant) {
  const p = await product(id);
  return {
    productId: id,
    variantId: variant?.id ?? "",
    quantity: 2,
    expectedVersion: p.version,
    sku: variant?.sku ?? p.sku,
    unitPrice: "7.25",
    selectedOptions: variant?.options ?? {},
  };
}
async function finalized(lines) {
  const facts = { currency: "USD", lines };
  const identity = {
    intentId: randomUUID(),
    payloadHash: checkoutStockHash(facts),
  };
  await stock().reserve({ ...identity, ...facts });
  await stock().finalize(identity);
  return identity;
}
let created = false;
const errors = [];
try {
  assert.equal(execute(["pg_isready", "-U", "postgres"]).status, 0);
  assert.equal(execute(["createdb", "-U", "postgres", database]).status, 0);
  created = true;
  const directory = path.join(root, "apps/product-service/prisma/migrations");
  for (const name of readdirSync(directory)
    .filter((n) => /^\d/.test(n) && n < target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  const control = randomUUID(),
    historicalProduct = randomUUID();
  sql(`INSERT INTO "CheckoutStockIntent" (id,"payloadHash",state,"updatedAt") VALUES ('${control}',repeat('a',64),'FINALIZED',now());
    INSERT INTO "CheckoutStockLine" (id,"intentId","productId","selectionKey",quantity,tracked) VALUES ('${randomUUID()}','${control}','${historicalProduct}','${historicalProduct}:base',1,false);`);
  const before = sql(
    "SELECT jsonb_build_object('intents',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM \"CheckoutStockIntent\" t),'lines',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM \"CheckoutStockLine\" t))::text;",
  );
  const migration = readFileSync(
    path.join(directory, target, "migration.sql"),
    "utf8",
  );
  sql(
    migration.replace(
      "COMMIT;",
      () =>
        "DO $$ BEGIN RAISE EXCEPTION 'd2_restore_upgrade_fault'; END $$;\nCOMMIT;",
    ),
    /^ERROR:\s+P0001: d2_restore_upgrade_fault/,
  );
  assert.equal(
    sql(`SELECT to_regclass('public."CheckoutStockRestoration"') IS NULL;`),
    "t",
  );
  sql(migration);
  assert.equal(
    sql(
      "SELECT jsonb_build_object('intents',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM \"CheckoutStockIntent\" t),'lines',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM \"CheckoutStockLine\" t))::text;",
    ),
    before,
  );
  for (const name of readdirSync(directory)
    .filter((n) => /^\d/.test(n) && n > target)
    .sort())
    sql(readFileSync(path.join(directory, name, "migration.sql"), "utf8"));
  assert.equal(await prisma.checkoutStockRestoration.count(), 0);
  const valid = `INSERT INTO "CheckoutStockRestoration" ("intentId") VALUES ('${control}');`;
  sql(`BEGIN; ${valid} ROLLBACK;`);
  sql(
    `BEGIN; INSERT INTO "CheckoutStockRestoration" ("intentId") VALUES ('${randomUUID()}'); COMMIT;`,
    /^ERROR:\s+23503:[\s\S]*CheckoutStockRestoration_intentId_fkey/,
  );
  sql(
    `BEGIN; ${valid} ${valid} COMMIT;`,
    /^ERROR:\s+23505:[\s\S]*CheckoutStockRestoration_pkey/,
  );
  sql(
    `BEGIN; ${valid} DELETE FROM "CheckoutStockLine" WHERE "intentId"='${control}'; DELETE FROM "CheckoutStockIntent" WHERE id='${control}'; COMMIT;`,
    /^ERROR:\s+23503:[\s\S]*CheckoutStockRestoration_intentId_fkey/,
  );

  const base = await create();
  const identity = await finalized([await line(base.id)]);
  assert.equal((await product(base.id)).stockQuantity, 8);
  await prisma.product.update({
    where: { id: base.id },
    data: { status: "ARCHIVED", deletedAt: new Date(), version: 2147483647 },
  });
  const [a, b] = await Promise.all([
    stock().restore(identity),
    stock().restore(identity),
  ]);
  assert.deepEqual(a, b);
  assert.equal(a.state, "RESTORED");
  assert.equal((await product(base.id)).stockQuantity, 10);
  assert.equal((await product(base.id)).version, 2147483647);
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: identity.intentId },
    }),
    1,
  );
  assert.equal(
    (
      await prisma.checkoutStockIntent.findUniqueOrThrow({
        where: { id: identity.intentId },
      })
    ).state,
    "FINALIZED",
  );
  assert.equal((await stock().finalize(identity)).state, "FINALIZED");
  await assert.rejects(stock().cancel(identity), /checkout_stock_conflict/);
  assert.equal((await product(base.id)).stockQuantity, 10);
  await prisma.product.delete({ where: { id: base.id } });
  assert.deepEqual(await stock().restore(identity), a);
  await assert.rejects(
    stock().restore({ ...identity, payloadHash: "b".repeat(64) }),
    /checkout_stock_restore_conflict/,
  );

  const parent = await create(undefined, {
    selectionMode: "VARIANT",
    stockQuantity: 0,
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: parent.id,
      sku: randomUUID(),
      options: { Colour: "Blue" },
      optionKey: "colour=blue",
      stockQuantity: 4,
    },
  });
  const vi = await finalized([await line(parent.id, variant)]);
  await prisma.product.update({
    where: { id: parent.id },
    data: { trackInventory: false },
  });
  await prisma.productVariant.update({
    where: { id: variant.id },
    data: { active: false, deletedAt: new Date() },
  });
  await stock().restore(vi);
  assert.equal(
    (
      await prisma.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      })
    ).stockQuantity,
    4,
  );
  assert.equal((await product(parent.id)).version, 3);

  const unmanaged = await create(undefined, {
    trackInventory: false,
    stockQuantity: 0,
  });
  const ui = await finalized([await line(unmanaged.id)]);
  await prisma.product.update({
    where: { id: unmanaged.id },
    data: { trackInventory: true, stockQuantity: 5 },
  });
  await stock().restore(ui);
  assert.equal((await product(unmanaged.id)).stockQuantity, 5);

  const low = await create("fd230000-0000-4000-8000-000000000010");
  const high = await create("fd230000-0000-4000-8000-000000000020", {
    selectionMode: "VARIANT",
    stockQuantity: 0,
  });
  const gone = await prisma.productVariant.create({
    data: {
      productId: high.id,
      sku: randomUUID(),
      options: { Size: "Large" },
      optionKey: "size=large",
      stockQuantity: 4,
    },
  });
  const mixed = await finalized([
    await line(low.id),
    await line(high.id, gone),
  ]);
  await prisma.productVariant.delete({ where: { id: gone.id } });
  const replacement = await prisma.productVariant.create({
    data: {
      productId: high.id,
      sku: gone.sku,
      options: gone.options,
      optionKey: gone.optionKey,
      stockQuantity: 0,
    },
  });
  await assert.rejects(
    stock().restore(mixed),
    /checkout_stock_restore_conflict/,
  );
  assert.equal((await product(low.id)).stockQuantity, 8);
  assert.equal((await product(low.id)).version, 2);
  assert.equal(
    (
      await prisma.productVariant.findUniqueOrThrow({
        where: { id: replacement.id },
      })
    ).stockQuantity,
    0,
  );
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: mixed.intentId },
    }),
    0,
  );

  const overflow = await create();
  const oi = await finalized([await line(overflow.id)]);
  await prisma.product.update({
    where: { id: overflow.id },
    data: { stockQuantity: 2147483647 },
  });
  await assert.rejects(stock().restore(oi), /checkout_stock_restore_conflict/);
  assert.equal((await product(overflow.id)).stockQuantity, 2147483647);
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: oi.intentId },
    }),
    0,
  );
  await prisma.product.update({
    where: { id: overflow.id },
    data: { stockQuantity: 2147483645 },
  });
  sql(`CREATE FUNCTION _d2_restore_receipt_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'd2_restore_receipt_fault'; END $$;
    CREATE TRIGGER _d2_restore_receipt_fault BEFORE INSERT ON "CheckoutStockRestoration" FOR EACH ROW EXECUTE FUNCTION _d2_restore_receipt_fault();`);
  await assert.rejects(stock().restore(oi), /d2_restore_receipt_fault/);
  assert.equal((await product(overflow.id)).stockQuantity, 2147483645);
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: oi.intentId },
    }),
    0,
  );
  sql(
    'DROP TRIGGER _d2_restore_receipt_fault ON "CheckoutStockRestoration"; DROP FUNCTION _d2_restore_receipt_fault();',
  );
  await stock().restore(oi);
  assert.equal((await product(overflow.id)).stockQuantity, 2147483647);

  const missing = await create();
  const mi = await finalized([await line(missing.id)]);
  await prisma.product.delete({ where: { id: missing.id } });
  await assert.rejects(stock().restore(mi), /checkout_stock_restore_conflict/);
  assert.equal(await prisma.product.count({ where: { id: missing.id } }), 0);
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: mi.intentId },
    }),
    0,
  );
  const mode = await create();
  const qi = await finalized([await line(mode.id)]);
  await prisma.product.update({
    where: { id: mode.id },
    data: { selectionMode: "VARIANT", stockQuantity: 0 },
  });
  await assert.rejects(stock().restore(qi), /checkout_stock_restore_conflict/);
  assert.equal(
    await prisma.checkoutStockRestoration.count({
      where: { intentId: qi.intentId },
    }),
    0,
  );
  await assert.rejects(
    stock().restore({ intentId: randomUUID(), payloadHash: "a".repeat(64) }),
    /checkout_stock_restore_conflict/,
  );
  console.log(
    "[d2-restore-db] populated-preservation-upgrade-rollback-exact-pk-fk=ok same-key-race-one-credit=ok recreated-owner-replay-after-deletion=ok base-variant-unmanaged-original-facts=ok soft-delete-version-ceiling=ok multiline-rollback-no-replacement-credit=ok missing-mode-capacity-denial=ok",
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
      assert.match(database, /^nebula_products_verify_restore_[a-f0-9]{12}$/);
      assert.equal(
        execute(["dropdb", "-U", "postgres", "--force", database]).status,
        0,
        "d2_restore_cleanup_failed",
      );
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(errors, "d2_restore_database_or_cleanup_failed");
console.log(
  "[d2-restore-db] cleaned 1 owned disposable database; remote publication stubbed; native deployment and Order cancellation/recovery remain separate",
);
