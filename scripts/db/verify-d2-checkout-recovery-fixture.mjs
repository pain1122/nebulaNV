import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { finalizationFaultSql } from "../../packages/api-client/test/d2-checkout-recovery.mjs";

assert.notEqual(process.env.NODE_ENV?.toLowerCase(), "production");
const root = fileURLToPath(new URL("../../", import.meta.url));
const database = `nebula_products_verify_recovery_${randomBytes(6).toString("hex")}`;
const databasePattern = /^nebula_products_verify_recovery_[0-9a-f]{12}$/;
const own = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const held = "00000000-0000-4000-8000-000000000003";
const control = "00000000-0000-4000-8000-000000000004";
let created = false;
const errors = [];
function docker(args, input) {
  const result = spawnSync(
    process.env.NEBULA_DOCKER_COMMAND ?? "docker",
    ["compose", "exec", "-T", "postgres", ...args],
    { cwd: root, input, encoding: "utf8", timeout: 30_000 },
  );
  if (result.error) throw result.error;
  return result;
}
function sql(text) {
  return docker(
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
      "-qAt",
    ],
    text,
  );
}
function ok(text) {
  const result = sql(text);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
try {
  assert.match(database, databasePattern);
  const result = docker(["createdb", "-U", "postgres", database]);
  assert.equal(result.status, 0, result.stderr);
  created = true;
  const folder = fileURLToPath(
    new URL("../../apps/product-service/prisma/migrations/", import.meta.url),
  );
  ok(
    readdirSync(folder)
      .filter((name) => /^\d/.test(name))
      .sort()
      .map((name) => readFileSync(`${folder}/${name}/migration.sql`, "utf8"))
      .join("\n"),
  );
  // Valid controls include the current description column before injecting
  // only the intended finalization fault.
  ok(`INSERT INTO "Product" (id,slug,title,description,"category_id",price,currency,sku,tags,"complementaryIds","updatedAt") VALUES
    ('${own}','proof-owned','Proof owned','Fixture','fd400000-0000-4000-8000-000000000001',0.10,'USD','PROOF-OWN',ARRAY[]::text[],ARRAY[]::text[],now()),
    ('${other}','proof-control','Proof control','Fixture','fd400000-0000-4000-8000-000000000001',0.10,'USD','PROOF-CTL',ARRAY[]::text[],ARRAY[]::text[],now());
    INSERT INTO "CheckoutStockIntent" (id,"payloadHash",state,"updatedAt") VALUES
    ('${held}',repeat('a',64),'HELD',now()),('${control}',repeat('b',64),'HELD',now());
    INSERT INTO "CheckoutStockLine" (id,"intentId","productId","selectionKey",quantity,tracked,"heldProductId") VALUES
    ('00000000-0000-4000-8000-000000000005','${held}','${own}','${own}:base',1,true,'${own}'),
    ('00000000-0000-4000-8000-000000000006','${control}','${other}','${other}:base',1,true,'${other}');`);
  ok(finalizationFaultSql(own, true));
  ok(
    `UPDATE "CheckoutStockIntent" SET state='FINALIZED' WHERE id='${control}';`,
  );
  const failure = sql(
    `UPDATE "CheckoutStockIntent" SET state='FINALIZED' WHERE id='${held}';`,
  );
  assert.notEqual(failure.status, 0);
  assert.match(
    failure.stderr,
    /ERROR:\s+P0001: d2_live_finalize_outage_fixture/,
  );
  assert.equal(
    ok(`SELECT state FROM "CheckoutStockIntent" WHERE id='${held}';`),
    "HELD",
  );
  assert.equal(
    ok(`SELECT state FROM "CheckoutStockIntent" WHERE id='${control}';`),
    "FINALIZED",
  );
  ok(finalizationFaultSql(own, false));
  ok(`UPDATE "CheckoutStockIntent" SET state='FINALIZED' WHERE id='${held}';`);
  assert.equal(
    ok(`SELECT state FROM "CheckoutStockIntent" WHERE id='${held}';`),
    "FINALIZED",
  );
  assert.equal(
    ok(
      "SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'd2_checkout_finalize_%';",
    ),
    "0",
  );
  process.stdout.write(
    "[d2-recovery-fixture] current-migrations valid-controls exact-P0001 scoped-fault removal-finalization=ok\n",
  );
} catch (error) {
  errors.push(error);
} finally {
  if (created)
    try {
      assert.match(database, databasePattern);
      const result = docker(["dropdb", "-U", "postgres", database]);
      assert.equal(result.status, 0, result.stderr);
      process.stdout.write(
        "[d2-recovery-fixture] owned-disposable-database-cleaned\n",
      );
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(errors, "d2_recovery_fixture_or_cleanup_failed");
