import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { backendServices, repositoryRoot } from "./backend.mjs";
import {
  acquireSession,
  assertFreePorts,
  buildDevelopment,
  changedServices,
  DevelopmentCoordinator,
  developmentPlan,
  inputSnapshot,
  nativeEnvironment,
  nativeRuntimeArguments,
  OwnedProcesses,
  snapshotChanges,
  watchDevelopmentInputs,
} from "./backend-dev.mjs";

const require = createRequire(import.meta.url);
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, "run through pnpm test:backend-dev");
const turbo = path.join(
  path.dirname(require.resolve("turbo/package.json")),
  "bin/turbo",
);
function write(root, file, value) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(
    target,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}
async function temporary(check) {
  const root = mkdtempSync(path.join(tmpdir(), "nebula-backend-dev-"));
  try {
    return await check(root);
  } finally {
    const target = realpathSync(root);
    assert.equal(path.dirname(target), realpathSync(tmpdir()));
    assert.ok(path.basename(target).startsWith("nebula-backend-dev-"));
    rmSync(target, { recursive: true, force: true });
  }
}
function fixture(root) {
  const services = backendServices
    .filter((s) => ["order-service", "gateway"].includes(s.name))
    .map((s) => ({ ...s, database: null }));
  write(root, "package.json", {
    private: true,
    packageManager: "pnpm@10.17.1",
    dependencies: { "fixture-peer": "file:peers/one" },
    nebula: { backendServices: services },
  });
  write(
    root,
    "docker-compose.yml",
    "services:\n  order-service: {}\n  gateway:\n    depends_on:\n      order-service: {condition: service_healthy}\n",
  );
  write(
    root,
    "pnpm-workspace.yaml",
    "packages:\n  - apps/*\n  - packages/*\ninjectWorkspacePackages: true\nsyncInjectedDepsAfterScripts:\n  - build\n",
  );
  write(root, ".npmrc", "inject-workspace-packages=true\n");
  write(root, ".gitignore", "node_modules/\ndist/\n.turbo/\n.ci-evidence/\n");
  write(root, "tsconfig.base.json", {});
  write(root, "turbo.json", {
    tasks: { build: { dependsOn: ["^build"], outputs: ["dist/**"] } },
  });
  write(
    root,
    "scripts/docker/verify-runtime-imports.mjs",
    "import {existsSync} from 'node:fs'; import assert from 'node:assert/strict'; import path from 'node:path'; for(const service of process.argv.slice(3))assert.ok(existsSync(path.join(process.argv[2],'apps',service,'dist/main.js')));\n",
  );
  for (const service of services) {
    write(root, `${service.directory}/package.json`, {
      name: service.packageName,
      version: "1.0.0",
      scripts: { build: "node build.cjs" },
      dependencies: {
        "@fixture/shared": "workspace:*",
        "fixture-peer": `file:../../peers/${service.name === "gateway" ? "two" : "one"}`,
      },
      dependenciesMeta: { "@fixture/shared": { injected: true } },
    });
    write(
      root,
      `${service.directory}/src/main.js`,
      "console.log(require('@fixture/shared'));\n",
    );
    write(
      root,
      `${service.directory}/build.cjs`,
      "const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('src/main.js','dist/main.js');\n",
    );
  }
  write(root, "packages/shared/package.json", {
    name: "@fixture/shared",
    version: "1.0.0",
    main: "dist/index.js",
    files: ["dist"],
    peerDependencies: { "fixture-peer": "*" },
    devDependencies: { "fixture-peer": "file:../../peers/one" },
    scripts: { build: "node build.cjs" },
  });
  write(root, "packages/shared/src/index.js", "module.exports='first';\n");
  write(
    root,
    "packages/shared/build.cjs",
    "const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('src/index.js','dist/index.js');\n",
  );
  for (const [directory, version] of [
    ["one", "1.0.0"],
    ["two", "2.0.0"],
  ]) {
    write(root, `peers/${directory}/package.json`, {
      name: "fixture-peer",
      version,
      main: "index.js",
    });
    write(
      root,
      `peers/${directory}/index.js`,
      `module.exports=${JSON.stringify(version)};\n`,
    );
  }
  return developmentPlan(root, ["order-service"]);
}
function run(root, args, command = "pnpm") {
  const parameters =
    command === "node"
      ? args
      : args[0] === "exec" && args[1] === "turbo"
        ? [turbo, ...args.slice(2), "--log-order=stream", "--log-prefix=task"]
        : [pnpm, ...args];
  const result = spawnSync(process.execPath, parameters, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      GITHUB_ACTIONS: "true",
      TURBO_TELEMETRY_DISABLED: "1",
    },
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("real inventory adds native incoming callers without introducing sibling build dependencies", () => {
  const plan = developmentPlan(repositoryRoot, ["order-service"]);
  assert.deepEqual(
    plan.services.map((s) => s.name),
    ["order-service", "gateway"],
  );
  assert.deepEqual(plan.companions, ["gateway"]);
  assert.ok(plan.dockerDependencies.includes("product-service"));
  assert.ok(!plan.dockerDependencies.includes("order-service"));
  assert.deepEqual(
    developmentPlan(repositoryRoot, ["gateway"]).services.map((s) => s.name),
    ["gateway"],
  );
  const product = developmentPlan(repositoryRoot, ["product-service"]);
  assert.ok(product.companions.includes("order-service"));
  assert.ok(product.companions.includes("gateway"));
  for (const consumer of product.consumers.filter(
    (c) => !product.services.some((s) => s.name === c.name),
  ))
    assert.ok(
      !consumer.dependencies.some((name) =>
        product.services.some((s) => s.name === name),
      ),
    );
  assert.throws(() => developmentPlan(repositoryRoot, []), /unique_selection/);
  assert.throws(
    () => developmentPlan(repositoryRoot, ["order-service", "order-service"]),
    /unique_selection/,
  );
  assert.throws(
    () => developmentPlan(repositoryRoot, ["../unknown"]),
    /unknown_service/,
  );
});

test("native network profile uses host inventory endpoints while preserving secrets/store inputs", () => {
  const plan = developmentPlan(repositoryRoot, ["order-service"]);
  const input = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://private:never-print@127.0.0.1:15432/fixture",
    S2S_OUTBOUND_KEYS: "fixture-trust-map",
    ORDER_GRPC_URL: "order-service:50056",
  };
  const env = nativeEnvironment(plan, plan.services[0], input);
  assert.equal(env.DATABASE_URL, input.DATABASE_URL);
  assert.equal(env.S2S_OUTBOUND_KEYS, input.S2S_OUTBOUND_KEYS);
  assert.equal(env.ORDER_GRPC_URL, "127.0.0.1:50056");
  assert.equal(env.ORDER_GRPC_HOST, "127.0.0.1");
  assert.equal(env.ORDER_HTTP_PORT, "3005");
  assert.equal(env.NEBULA_DEV_DATABASE, "nebula_order");
  assert.equal(env.NEBULA_DEV_POSTGRES_PORT, "15432");
  assert.equal(input.ORDER_GRPC_URL, "order-service:50056");
  assert.throws(
    () => nativeEnvironment(plan, plan.services[0], { NODE_ENV: "production" }),
    /refused_in_production/,
  );
});

test("native Media planning identifies the private scanner gap without publishing or relaxing it", () => {
  const plan = developmentPlan(repositoryRoot, ["media-service"]);
  assert.ok(
    plan.unsupported.some((reason) =>
      reason.includes("reviewed_scanner_transport"),
    ),
  );
  assert.deepEqual(
    developmentPlan(repositoryRoot, ["order-service"]).unsupported,
    [],
  );
});

test("authored input changes scope rebuilds and env restarts; manifest/schema changes require explicit preparation", async () =>
  temporary((root) => {
    const plan = fixture(root);
    const initial = inputSnapshot(plan);
    write(root, "apps/order-service/src/main.js", "changed");
    write(root, "apps/order-service/dist/stale.js", "ignored");
    write(root, "apps/order-service/prisma/generated/client.js", "ignored");
    write(root, "apps/order-service/src/generated/prisma/client.ts", "ignored");
    write(root, "packages/shared/src/index.spec.ts", "ignored");
    const changed = snapshotChanges(initial, inputSnapshot(plan));
    assert.deepEqual(changed, ["apps/order-service/src/main.js"]);
    assert.deepEqual(
      [...changedServices(plan, changed)],
      [["order-service", true]],
    );
    assert.deepEqual(
      [...changedServices(plan, ["packages/shared/src/index.js"])].sort(),
      [
        ["gateway", true],
        ["order-service", true],
      ],
    );
    assert.deepEqual(
      [...changedServices(plan, ["apps/order-service/.env"])],
      [["order-service", false]],
    );
    assert.equal(changedServices(plan, [".env"]).size, 2);
    for (const file of [
      "pnpm-lock.yaml",
      "package.json",
      "apps/order-service/package.json",
      "apps/order-service/prisma/schema.prisma",
      "apps/order-service/prisma.config.ts",
      "apps/order-service/prisma/migrations/new/migration.sql",
    ])
      assert.throws(() => changedServices(plan, [file]), /restart_required/);
  }));

test("native environment validation uses real Nest precedence/expansion in a clean fixture and reports no secrets", async () =>
  temporary((root) => {
    const app = path.join(root, "apps/order-service");
    const appRequire = createRequire(
      path.join(repositoryRoot, "apps/order-service/package.json"),
    );
    const config = appRequire.resolve("@nestjs/config");
    const joi = appRequire.resolve("joi");
    write(
      root,
      "apps/order-service/dist/config/env.validation.js",
      `const Joi=require(${JSON.stringify(joi)});exports.envSchema=Joi.object({NODE_ENV:Joi.string().valid('development'),FEATURE:Joi.string().valid(process.env.EXPECTED).required(),DATABASE_URL:Joi.string().uri().required(),SHADOW_DATABASE_URL:Joi.string().uri()});`,
    );
    write(
      root,
      ".env",
      "FEATURE=root\nDB_HOST=127.0.0.1\nDATABASE_URL=postgresql://u:fixture-private-secret@${DB_HOST}:5432/fixture?schema=demo&connection_limit=2\nSHADOW_DATABASE_URL=postgresql://u:fixture-private-secret@127.0.0.1:5432/postgres?schema=fixture_shadow\n",
    );
    write(root, "apps/order-service/.env", "FEATURE=service\n");
    const original = readFileSync(path.join(root, ".env"), "utf8");
    const preload = pathToFileURL(
      path.join(repositoryRoot, "scripts/backend-dev-env.mjs"),
    ).href;
    const source = `import {prepareNativeEnvironment} from ${JSON.stringify(preload)};
      import {createRequire} from 'node:module'; import assert from 'node:assert/strict';
      const load=createRequire(${JSON.stringify(path.join(app, "package.json"))});
      try { await prepareNativeEnvironment({load:(name)=>name==='@nestjs/config'?load(${JSON.stringify(config)}):load(name)});
       const url=new URL(process.env.DATABASE_URL); assert.equal(url.port,'15432');assert.equal(url.username,'u');assert.equal(url.password,'fixture-private-secret');assert.equal(url.searchParams.get('schema'),'demo');assert.equal(url.searchParams.get('connection_limit'),'2');
       const shadow=new URL(process.env.SHADOW_DATABASE_URL);assert.equal(shadow.port,'15432');assert.equal(shadow.pathname,'/postgres');assert.equal(shadow.searchParams.get('schema'),'fixture_shadow');
      } catch(error){console.error(error.message);process.exitCode=1;}`;
    const clean = Object.fromEntries(
      Object.entries({
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: "development",
        NEBULA_DEV_DATABASE: "fixture",
        NEBULA_DEV_POSTGRES_PORT: "15432",
        CI: "true",
        GITHUB_ACTIONS: "true",
      }).filter(([, value]) => value !== undefined),
    );
    const check = (extra) =>
      spawnSync(process.execPath, ["--input-type=module", "-e", source], {
        cwd: app,
        env: { ...clean, ...extra },
        encoding: "utf8",
      });
    assert.equal(check({ EXPECTED: "service" }).status, 0);
    assert.equal(check({ EXPECTED: "process", FEATURE: "process" }).status, 0);
    rmSync(path.join(app, ".env"));
    assert.equal(check({ EXPECTED: "root" }).status, 0);
    const remote = check({
      EXPECTED: "root",
      DATABASE_URL:
        "postgresql://u:fixture-private-secret@postgres:5432/fixture",
    });
    assert.equal(remote.status, 1);
    assert.match(remote.stderr, /native_endpoint_required: DATABASE_URL/);
    assert.ok(!remote.stderr.includes("fixture-private-secret"));
    const wrongOwner = check({
      EXPECTED: "root",
      DATABASE_URL:
        "postgresql://u:fixture-private-secret@127.0.0.1:5432/some-other-db",
    });
    assert.equal(wrongOwner.status, 1);
    assert.match(wrongOwner.stderr, /database_owner_mismatch/);
    const invalid = check({
      EXPECTED: "root",
      DATABASE_URL: "fixture-private-secret",
    });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /invalid_env_fields: DATABASE_URL/);
    assert.ok(!invalid.stderr.includes("fixture-private-secret"));
    assert.equal(readFileSync(path.join(root, ".env"), "utf8"), original);
  }));

test("native Media validates effective S3 endpoint keys without exposing secrets or rejecting unused fallbacks", async () =>
  temporary((root) => {
    const app = path.join(root, "apps/media-service");
    const owner = createRequire(
      path.join(repositoryRoot, "apps/media-service/package.json"),
    );
    const config = owner.resolve("@nestjs/config");
    const joi = owner.resolve("joi");
    write(
      root,
      "apps/media-service/dist/config/env.validation.js",
      `const Joi=require(${JSON.stringify(joi)});exports.envSchema=Joi.object({NODE_ENV:Joi.string().valid('development'),MEDIA_STORAGE_DRIVER:Joi.string().valid('s3','local').default('s3'),MEDIA_S3_ENDPOINT:Joi.string().uri(),MEDIA_S3_INTERNAL_ENDPOINT:Joi.string().uri(),MEDIA_S3_PUBLIC_ENDPOINT:Joi.string().uri(),MEDIA_S3_SECRET_KEY:Joi.string().required()});`,
    );
    write(
      root,
      ".env",
      "MEDIA_STORAGE_DRIVER=s3\nMEDIA_S3_ENDPOINT=http://127.0.0.1:9000\nMEDIA_S3_SECRET_KEY=storage-fixture-private-secret\n",
    );
    write(root, "apps/media-service/.env", "");
    const preload = pathToFileURL(
      path.join(repositoryRoot, "scripts/backend-dev-env.mjs"),
    ).href;
    const source = `import {prepareNativeEnvironment} from ${JSON.stringify(preload)};
      import {createRequire} from 'node:module';import assert from 'node:assert/strict';
      const load=createRequire(${JSON.stringify(path.join(app, "package.json"))});
      try {await prepareNativeEnvironment({load:(name)=>name==='@nestjs/config'?load(${JSON.stringify(config)}):load(name)});assert.equal(process.env.MEDIA_S3_SECRET_KEY,'storage-fixture-private-secret');}
      catch(error){console.error(error.message);process.exitCode=1;}`;
    const clean = Object.fromEntries(
      Object.entries({
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        NODE_ENV: "development",
        CI: "true",
        GITHUB_ACTIONS: "true",
      }).filter(([, value]) => value !== undefined),
    );
    const run = (extra) =>
      spawnSync(process.execPath, ["--input-type=module", "-e", source], {
        cwd: app,
        env: { ...clean, ...extra },
        encoding: "utf8",
      });
    assert.equal(run({}).status, 0);
    assert.equal(
      run({
        MEDIA_S3_INTERNAL_ENDPOINT: "http://127.0.0.1:19000",
        MEDIA_S3_PUBLIC_ENDPOINT: "http://localhost:19000",
      }).status,
      0,
    );
    assert.equal(
      run({
        MEDIA_S3_INTERNAL_ENDPOINT: "http://[::1]:19000",
        MEDIA_S3_ENDPOINT: "http://minio:9000",
      }).status,
      0,
    );
    assert.equal(
      run({
        MEDIA_STORAGE_DRIVER: "local",
        MEDIA_S3_INTERNAL_ENDPOINT: "http://seaweed:8333",
      }).status,
      0,
    );
    for (const [extra, key] of [
      [{ MEDIA_S3_ENDPOINT: "http://minio:9000" }, "MEDIA_S3_ENDPOINT"],
      [
        { MEDIA_S3_INTERNAL_ENDPOINT: "http://seaweed:8333" },
        "MEDIA_S3_INTERNAL_ENDPOINT",
      ],
      [
        { MEDIA_S3_PUBLIC_ENDPOINT: "http://seaweed:8333" },
        "MEDIA_S3_PUBLIC_ENDPOINT",
      ],
    ]) {
      const rejected = run(extra);
      assert.equal(rejected.status, 1);
      assert.ok(rejected.stderr.includes(`native_endpoint_required: ${key}`));
      assert.ok(!rejected.stderr.includes("storage-fixture-private-secret"));
    }
    assert.equal(
      readFileSync(path.join(root, ".env"), "utf8"),
      "MEDIA_STORAGE_DRIVER=s3\nMEDIA_S3_ENDPOINT=http://127.0.0.1:9000\nMEDIA_S3_SECRET_KEY=storage-fixture-private-secret\n",
    );
  }));

test("awaited Node preload preserves the CommonJS main guard and Windows-safe file URL", async () =>
  temporary((root) => {
    write(
      root,
      "scripts/backend-dev-env.mjs",
      "await Promise.resolve();globalThis.prepared=true;\n",
    );
    write(
      root,
      "apps/gateway/dist/main.js",
      "if(require.main!==module)throw Error('main guard lost');if(!globalThis.prepared)throw Error('preload not awaited');console.log('main-ready');\n",
    );
    const result = spawnSync(process.execPath, nativeRuntimeArguments(root), {
      cwd: path.join(root, "apps/gateway"),
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "main-ready");
    assert.match(nativeRuntimeArguments(root)[1], /^file:/);
  }));

test("focused dev checks are wired into CI while the full backend entry remains unchanged", () => {
  const scripts = JSON.parse(
    readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
  ).scripts;
  assert.equal(scripts["dev:backend"], "node ./scripts/backend.mjs dev");
  assert.equal(scripts["dev:watch"], "node ./scripts/backend-dev.mjs");
  assert.equal(
    scripts["test:backend-dev"],
    "node --test ./scripts/backend-dev.test.mjs",
  );
  assert.match(
    readFileSync(path.join(repositoryRoot, ".github/workflows/ci.yml"), "utf8"),
    /run: pnpm test:backend-dev/,
  );
});

test("real filesystem watch debounces saves, ignores generated output and notices new authored roots and deletions", async () =>
  temporary(async (root) => {
    const plan = fixture(root);
    const events = [];
    const errors = [];
    const close = watchDevelopmentInputs(
      plan,
      (files) => events.push(files),
      (error) => errors.push(error),
    );
    try {
      write(root, "apps/order-service/src/main.js", "one");
      write(root, "apps/order-service/src/main.js", "two");
      write(root, "apps/order-service/dist/output.js", "ignored");
      for (let i = 0; i < 30 && !events.length; i++) await delay(100);
      assert.deepEqual(events, [["apps/order-service/src/main.js"]]);
      write(root, "apps/order-service/src/main.js", "two");
      await delay(350);
      assert.equal(events.length, 1);
      write(root, "apps/order-service/assets/new.txt", "asset");
      for (let i = 0; i < 30 && events.length < 2; i++) await delay(100);
      assert.deepEqual(events[1], ["apps/order-service/assets/new.txt"]);
      rmSync(path.join(root, "apps/order-service/assets/new.txt"));
      for (let i = 0; i < 30 && events.length < 3; i++) await delay(100);
      assert.deepEqual(events[2], ["apps/order-service/assets/new.txt"]);
      assert.deepEqual(errors, []);
    } finally {
      close();
    }
  }));

test("coordinator serializes edits during a build before starting native callers", async () => {
  const plan = { services: [{ name: "order-service" }, { name: "gateway" }] };
  const events = [];
  const entered = deferred();
  const hold = deferred();
  let round = 0;
  const engine = new DevelopmentCoordinator(plan, {
    stop: async (names) => events.push(["stop", ...names]),
    build: async (names) => {
      events.push(["build", ...names]);
      if (++round === 1) {
        entered.resolve();
        await hold.promise;
      }
    },
    start: async (names) => events.push(["start", ...names]),
  });
  const first = engine.request(
    new Map([
      ["order-service", true],
      ["gateway", true],
    ]),
  );
  await entered.promise;
  engine.request(new Map([["order-service", true]]));
  hold.resolve();
  await first;
  assert.deepEqual(
    events.map((e) => e[0]),
    ["stop", "build", "stop", "build", "start"],
  );
  assert.deepEqual(events.at(-1), ["start", "order-service", "gateway"]);
  await engine.close();
});

test("failed builds stay stopped; a repair retries the failed group and env-only changes then avoid compilation", async () => {
  const plan = { services: [{ name: "order-service" }, { name: "gateway" }] };
  const events = [];
  let fail = true;
  const engine = new DevelopmentCoordinator(plan, {
    stop: async (names) => events.push(["stop", ...names]),
    build: async (names) => {
      events.push(["build", ...names]);
      if (fail) throw Error("fixture compile failure");
    },
    start: async (names) => events.push(["start", ...names]),
    report: (message) => events.push(["error", message]),
  });
  await engine.request(
    new Map([
      ["order-service", true],
      ["gateway", true],
    ]),
  );
  assert.ok(!events.some((e) => e[0] === "start"));
  fail = false;
  await engine.request(new Map([["gateway", true]]));
  assert.deepEqual(
    new Set(events.findLast((e) => e[0] === "build").slice(1)),
    new Set(["order-service", "gateway"]),
  );
  const count = events.filter((e) => e[0] === "build").length;
  await engine.request(new Map([["order-service", false]]));
  assert.equal(events.filter((e) => e[0] === "build").length, count);
  assert.deepEqual(events.at(-1), ["start", "order-service"]);
  await engine.close();
});

test("closing during compilation aborts owned work and prevents any late restart", async () => {
  const hold = deferred();
  const entered = deferred();
  const events = [];
  const engine = new DevelopmentCoordinator(
    { services: [{ name: "order-service" }] },
    {
      stop: async () => events.push("stop"),
      start: async () => events.push("start"),
      build: async () => {
        entered.resolve();
        await hold.promise;
      },
      abort: async () => {
        events.push("abort");
        hold.resolve();
      },
    },
  );
  const build = engine.request(new Map([["order-service", true]]));
  await entered.promise;
  await engine.close();
  await build;
  assert.ok(events.includes("abort"));
  assert.ok(!events.includes("start"));
  await engine.request(new Map([["order-service", true]]));
  assert.ok(!events.includes("start"));
});

test("session ownership prevents concurrent writers and never deletes someone else's replacement lock", async () =>
  temporary((root) => {
    const release = acquireSession(root);
    assert.throws(() => acquireSession(root), /session_locked/);
    release();
    const second = acquireSession(root);
    write(root, ".ci-evidence/backend-dev/session.lock", "changed-owner");
    assert.throws(second, /lock_ownership_changed/);
    assert.equal(
      readFileSync(
        path.join(root, ".ci-evidence/backend-dev/session.lock"),
        "utf8",
      ),
      "changed-owner",
    );
  }));

test("port conflicts fail without taking over an existing listener", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = server.address().port;
    await assert.rejects(
      () =>
        assertFreePorts({ services: [{ name: "fixture", httpPort: port }] }),
      /port_in_use/,
    );
    assert.ok(server.listening);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("owned Node shutdown releases its port without terminating another tracked process", async () => {
  const pool = new OwnedProcesses();
  const script =
    "const net=require('node:net');const s=net.createServer();s.listen(0,'127.0.0.1',()=>console.log(s.address().port));";
  const first = pool.launch(process.execPath, ["-e", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const second = pool.launch(process.execPath, ["-e", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const port = Number(
      await new Promise((resolve) =>
        first.child.stdout.once("data", (value) =>
          resolve(value.toString().trim()),
        ),
      ),
    );
    await pool.stop(first.child);
    await first.completion;
    assert.ok(pool.expected.has(first.child));
    assert.ok(pool.children.has(second.child));
    await assertFreePorts({ services: [{ name: "released", httpPort: port }] });
  } finally {
    await pool.stopAll();
  }
  assert.equal(pool.children.size, 0);
});

test("real pinned pnpm/Turbo build refreshes shared injected copies after edits and cached producer restoration", async () =>
  temporary(async (root) => {
    const plan = fixture(root);
    assert.equal(run(root, ["--version"]).trim(), "10.17.1");
    run(root, [
      "install",
      "--lockfile-only",
      "--offline",
      "--ignore-scripts",
      "--config.frozen-lockfile=false",
      "--store-dir",
      path.join(root, "store"),
    ]);
    run(root, [
      "install",
      "--offline",
      "--ignore-scripts",
      "--frozen-lockfile",
      "--store-dir",
      path.join(root, "store"),
    ]);
    const commands = [];
    const execute = async (command, args, cwd) => {
      commands.push({ command, args });
      return run(cwd, args, command);
    };
    await buildDevelopment(
      root,
      plan.services.map((s) => s.name),
      execute,
    );
    const runtime = () =>
      run(
        path.join(root, "apps/order-service"),
        ["dist/main.js"],
        "node",
      ).trim();
    assert.equal(runtime(), "first");
    write(root, "packages/shared/src/index.js", "module.exports='second';\n");
    await buildDevelopment(root, ["order-service", "gateway"], execute);
    assert.equal(runtime(), "second");
    // Distinct peer contexts require an actual injected consumer copy; a simple
    // peer-free workspace may legitimately deduplicate back to its source link.
    const slot = realpathSync(
      path.join(root, "apps/gateway/node_modules/@fixture/shared"),
    );
    assert.ok(
      path.relative(root, slot).startsWith(`node_modules${path.sep}.pnpm`),
    );
    writeFileSync(
      path.join(slot, "dist/index.js"),
      "module.exports='stale';\n",
    );
    const producer = realpathSync(path.join(root, "packages/shared/dist"));
    assert.equal(
      path.dirname(producer),
      realpathSync(path.join(root, "packages/shared")),
    );
    rmSync(producer, { recursive: true, force: true });
    write(
      root,
      "apps/gateway/src/main.js",
      "console.log(require('@fixture/shared')); // new consumer\n",
    );
    await buildDevelopment(root, ["gateway"], execute);
    assert.ok(existsSync(path.join(producer, "index.js")));
    assert.equal(
      run(path.join(root, "apps/gateway"), ["dist/main.js"], "node").trim(),
      "second",
    );
    assert.ok(
      !commands.some(
        (c) => c.command === "docker" || c.args.includes("migrate"),
      ),
    );
  }));
