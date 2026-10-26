import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import { randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV?.toLowerCase() === "production")
  throw new Error("d2_order_reads_proof_refused_in_production");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const database = `nebula_order_verify_reads_${randomBytes(6).toString("hex")}`;
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
  assert.equal(
    result.status,
    0,
    `d2_order_reads_database_command_failed ${result.stderr}`,
  );
}
const require = createRequire(
  path.join(root, "apps/order-service/package.json"),
);
require("ts-node").register({
  project: path.join(root, "apps/order-service/tsconfig.json"),
  transpileOnly: true,
});
const { PrismaClient, Prisma } = require("./prisma/generated/client");
const { OrderService } = require("./src/order/order.service.ts");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
    },
  },
});
const id = (n) => `fd230000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(90),
  other = id(91);
let created = false;
const errors = [];
try {
  execute(["pg_isready", "-U", "postgres"]);
  execute(["createdb", "-U", "postgres", database]);
  created = true;
  const directory = path.join(root, "apps/order-service/prisma/migrations");
  for (const name of readdirSync(directory)
    .filter((name) => /^\d/.test(name))
    .sort())
    execute(
      ["psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1"],
      readFileSync(path.join(directory, name, "migration.sql"), "utf8"),
    );
  for (let n = 1; n <= 6; n++) {
    await prisma.order.create({
      data: {
        id: id(n),
        userId: n === 6 ? other : owner,
        orderNumber: `D2-READ-${n}`,
        status: n === 2 ? "PAID" : "PENDING",
        currency: "USD",
        subtotal: 0,
        total: 0,
        createdAt: new Date(
          n === 1
            ? "2026-10-18T00:00:00Z"
            : n >= 5
              ? "2026-10-19T01:00:00Z"
              : "2026-10-19T00:00:00Z",
        ),
      },
    });
  }
  for (const [n, state] of [
    [4, "COMPLETED"],
    [5, "ORDER_COMMITTED"],
  ]) {
    const hash = createHash("sha256").update(String(n)).digest("hex");
    await prisma.checkoutAttempt.create({
      data: {
        id: id(n),
        orderId: id(n),
        userId: owner,
        cartId: id(80),
        state,
        keyHash: hash,
        intentHash: hash,
        stockHash: hash,
        cartFingerprint: hash,
        payload: state === "COMPLETED" ? Prisma.DbNull : {},
      },
    });
  }
  const service = new OrderService(prisma, {}, {});
  const all = await service.listOrdersForAdmin();
  assert.deepEqual(
    all.data.map((row) => row.id),
    [6, 4, 3, 2, 1].map(id),
  );
  assert.equal(all.total, 5);
  const query = { userId: owner, status: "PENDING", limit: 1 };
  for (const [page, expected] of [
    [1, 4],
    [2, 3],
    [3, 1],
  ]) {
    const result = await service.listOrdersForAdmin({ ...query, page });
    assert.deepEqual(
      result.data.map((row) => row.id),
      [id(expected)],
    );
    assert.equal(result.total, 3);
  }
  assert.deepEqual(
    (await service.listOrdersForAdmin({ ...query, page: 4 })).data,
    [],
  );
  assert.deepEqual(await service.listOrdersForAdmin({ userId: id(92) }), {
    data: [],
    page: 1,
    limit: 20,
    total: 0,
  });
  assert.equal((await service.getOrderForAdmin(id(6))).data.userId, other);
  assert.equal((await service.getOrderForAdmin(id(4))).data.id, id(4));
  await assert.rejects(service.getOrderForAdmin(id(5)), { status: 404 });
  await assert.rejects(service.getOrderForAdmin(id(99)), { status: 404 });
  await assert.rejects(service.getOrderForUser(owner, id(6)), { status: 404 });
  assert.deepEqual(
    (await service.listOrdersForUser(owner)).data.map((row) => row.id).sort(),
    [1, 2, 3, 4].map(id),
  );
  for (const input of [
    { limit: 0 },
    { limit: 101 },
    { status: "BAD" },
    { userId: "bad" },
  ])
    await assert.rejects(service.listOrdersForAdmin(input), { status: 400 });
  console.log(
    "[d2-order-reads-db] pagination-tie-order-filters-total=ok completed-legacy-visible=ok unfinished-hidden=ok personal-owner-denial=ok",
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
      assert.match(database, /^nebula_order_verify_reads_[a-f0-9]{12}$/);
      execute(["dropdb", "-U", "postgres", "--force", database]);
    } catch (error) {
      errors.push(error);
    }
}
if (errors.length)
  throw new AggregateError(errors, "d2_order_reads_database_or_cleanup_failed");
console.log(
  "[d2-order-reads-db] cleaned 1 owned disposable database; native deployment and Gateway proof remain separate",
);
