import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BACKUP_MANIFEST,
  DEMO_BLOG_POST,
  DEMO_PRODUCT,
  PRISMA_OPERATIONS,
  RESTORE_CONFIRMATION,
  backendServices,
  backupLocalDatabases,
  buildBackendQualityArgs,
  buildBackendImages,
  buildDevCommands,
  buildPrismaArgs,
  buildTrivyImageArgs,
  buildTrivySourceArgs,
  checkBackendHealth,
  classifyDependencyAdvisories,
  collectRuntimeDependencyVersions,
  disposableMigrationServices,
  downBackend,
  generateBackendDependencyReport,
  missingExpectedDatabases,
  prismaServices,
  provisionBackend,
  releaseImages,
  repositoryRoot,
  runBackendImageScans,
  runBackendQualityTask,
  runBackendSourceScan,
  runPrismaOperation,
  sanitizeOutput,
  seedBackendDemo,
  restoreLocalDatabases,
  validateBackupManifest,
  verifyCleanMigrations,
  verifyDatabaseRecovery,
  waitForExpectedDatabases,
} from "./backend.mjs";

function source(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function serviceBlock(contents, serviceName) {
  const marker = new RegExp(`^  ${serviceName}:\\s*$`, "m");
  const match = marker.exec(contents);
  assert.notEqual(match, null, `${serviceName} is missing`);
  const tail = contents.slice(match.index + match[0].length);
  const next = tail.search(/\r?\n  [A-Za-z0-9][A-Za-z0-9_-]*:\s*(?:\r?\n|$)/);
  return next === -1 ? tail : tail.slice(0, next);
}

function envValues(contents) {
  const values = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function serviceDependencies(contents, serviceName) {
  const block = serviceBlock(contents, serviceName);
  const dependencies =
    block.match(
      /\r?\n    depends_on:\s*\r?\n([\s\S]*?)(?=\r?\n    [a-z_][A-Za-z0-9_-]*:|$)/,
    )?.[1] ?? "";
  return Object.fromEntries(
    [
      ...dependencies.matchAll(
        /^      ([A-Za-z0-9_-]+):\s*\r?\n        condition: ([a-z_]+)$/gm,
      ),
    ].map((match) => [match[1], match[2]]),
  );
}

function jsonResponse(status, data) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return data;
    },
  };
}

function queuedFetch(responses, calls) {
  return async (url, options = {}) => {
    calls.push({ url: String(url), options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    assert.notEqual(next, undefined, `unexpected request to ${url}`);
    return next;
  };
}

test("backend inventory is complete, unique, and ordered", () => {
  assert.deepEqual(
    backendServices.map((service) => service.name),
    [
      "user-service",
      "auth-service",
      "settings-service",
      "media-service",
      "taxonomy-service",
      "product-service",
      "blog-service",
      "order-service",
    ],
  );
  assert.deepEqual(
    prismaServices.map((service) => service.database),
    [
      "nebula_users",
      "nebula_settings",
      "nebula_media",
      "nebula_taxonomy",
      "nebula_products",
      "nebula_blog",
      "nebula_order",
    ],
  );

  assert.equal(new Set(backendServices.map((service) => service.name)).size, 8);
  assert.equal(
    new Set(
      backendServices.flatMap((service) => [
        service.httpPort,
        service.grpcPort,
      ]),
    ).size,
    16,
  );

  for (const service of backendServices) {
    const directory = path.join(repositoryRoot, service.directory);
    assert.equal(
      existsSync(directory),
      true,
      `${service.directory} is missing`,
    );
    const manifest = JSON.parse(
      readFileSync(path.join(directory, "package.json"), "utf8"),
    );
    assert.equal(manifest.name, service.packageName);
    assert.equal(
      existsSync(path.join(directory, "src", service.moduleFile)),
      true,
      `${service.name} module file is missing`,
    );
    assert.equal(
      service.defaultImage,
      `nebulanv-main-${service.dockerService}:latest`,
    );
    if (service.database) {
      assert.equal(
        existsSync(path.join(directory, "prisma", "schema.prisma")),
        true,
        `${service.name} Prisma schema is missing`,
      );
    }
  }
});

test("runtime ports, healthchecks, dependencies, and database initialization match the inventory", () => {
  const localCompose = source("docker-compose.yml");
  const releaseCompose = source("docker-compose.release.yml");
  const bake = source("docker-bake.hcl");
  const dockerfile = source("docker/backend.Dockerfile");
  const databaseInit = source("scripts/db/init-multiple-dbs.sh");
  const rootExample = envValues(source(".env.example"));
  const releaseExample = envValues(source("deploy/.env.production.example"));

  const backendGroup =
    bake.match(/group "backend"\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const bakeTargets = [...backendGroup.matchAll(/"([a-z]+-service)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    bakeTargets,
    backendServices.map((service) => service.dockerService),
  );
  assert.match(
    dockerfile,
    /COPY scripts\/backend\.mjs \.\/scripts\/backend\.mjs/,
  );
  assert.match(
    dockerfile,
    /COPY scripts\/docker\/verify-runtime-imports\.mjs \.\/scripts\/docker\/verify-runtime-imports\.mjs/,
  );

  for (const service of backendServices) {
    for (const compose of [localCompose, releaseCompose]) {
      const block = serviceBlock(compose, service.dockerService);
      assert.match(block, new RegExp(`-${service.dockerService}:`));
      assert.match(block, new RegExp(`:${service.httpPort}["']`));
      assert.match(block, new RegExp(`:${service.grpcPort}["']`));
    }

    const runtimeName = service.name.replace(/-service$/, "-runtime");
    assert.match(dockerfile, new RegExp(`AS ${runtimeName}\\b`));
    assert.match(
      dockerfile,
      new RegExp(`EXPOSE ${service.httpPort} ${service.grpcPort}`),
    );
    assert.match(
      dockerfile,
      new RegExp(`http://localhost:${service.httpPort}/health/ready`),
    );

    const main = source(`${service.directory}/src/main.ts`);
    assert.match(main, new RegExp(`defaultHttpPort:\\s*${service.httpPort}`));
    assert.match(main, new RegExp(`defaultGrpcPort:\\s*${service.grpcPort}`));

    const serviceExample = envValues(
      source(`${service.directory}/.env.example`),
    );
    assert.equal(serviceExample.get("PORT"), String(service.httpPort));
    assert.equal(serviceExample.get("GRPC_PORT"), String(service.grpcPort));

    const prefix = service.name.replace(/-service$/, "").toUpperCase();
    assert.equal(
      rootExample.get(`${prefix}_HTTP_PORT`),
      String(service.httpPort),
    );
    assert.equal(
      releaseExample.get(`${prefix}_HTTP_PORT`),
      String(service.httpPort),
    );
    assert.equal(
      releaseExample.get(`${prefix}_GRPC_PORT`),
      String(service.grpcPort),
    );

    const localDependencies = serviceDependencies(
      localCompose,
      service.dockerService,
    );
    const releaseDependencies = serviceDependencies(
      releaseCompose,
      service.dockerService,
    );
    assert.deepEqual(releaseDependencies, localDependencies);
    for (const [dependency, condition] of Object.entries(localDependencies)) {
      if (backendServices.some((entry) => entry.dockerService === dependency)) {
        assert.equal(condition, "service_healthy");
      }
    }
  }

  for (const compose of [localCompose, releaseCompose]) {
    assert.match(
      serviceBlock(compose, "minio"),
      /http:\/\/localhost:9000\/minio\/health\/ready/,
    );
    assert.equal(
      serviceDependencies(compose, "minio-init").minio,
      "service_healthy",
    );
    assert.equal(
      serviceDependencies(compose, "media-service").minio,
      "service_healthy",
    );
    assert.doesNotMatch(compose, /condition:\s*service_started/);
  }

  const initializedDatabases = [
    ...databaseInit.matchAll(/CREATE DATABASE ([a-z_]+);/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    initializedDatabases.toSorted(),
    prismaServices.map((service) => service.database).toSorted(),
  );
});

test("existing scripts and wiring tests consume the package inventory", () => {
  assert.equal(
    existsSync(path.join(repositoryRoot, "scripts/e2e-provision.mjs")),
    false,
  );
  assert.match(
    source("scripts/docker/verify-runtime-imports.mjs"),
    /backend\.mjs/,
  );
  assert.match(
    source("scripts/docker/save-release-images.ps1"),
    /backend\.mjs/,
  );
  assert.match(source("scripts/docker/build-backend.ps1"), /build-images/);
  assert.doesNotMatch(
    source("scripts/docker/build-backend.ps1"),
    /buildx["']?,\s*["']bake["']?,\s*["']backend/,
  );

  for (const file of [
    "packages/config/test/health-wiring.spec.ts",
    "packages/config/test/logging-wiring.spec.ts",
    "packages/config/test/http-policy-wiring.spec.ts",
    "packages/grpc-auth/test/service-wiring.spec.ts",
  ]) {
    assert.match(source(file), /source\("package\.json"\)/);
  }
});

test("base seed ownership excludes product and blog demo writes", () => {
  const userSeed = source("apps/user-service/prisma/seed.ts");
  const settingsSeed = source("apps/settings-service/prisma/seed.ts");

  assert.match(userSeed, /development_user_seed_refused_in_production/);
  assert.match(userSeed, /prisma\.user\.upsert/);
  assert.match(settingsSeed, /prisma\.setting\.upsert/);

  for (const file of [
    "apps/media-service/prisma/seed.ts",
    "apps/taxonomy-service/prisma/seed.ts",
    "apps/product-service/prisma/seed.ts",
    "apps/blog-service/prisma/seed.ts",
    "apps/order-service/prisma/seed.ts",
  ]) {
    const seed = source(file);
    assert.doesNotMatch(
      seed,
      /prisma\.\w+\.(?:create|createMany|upsert|update|updateMany|delete|deleteMany)/,
      `${file} must not own base data writes`,
    );
  }
});

test("Prisma actions select the expected package commands", () => {
  const user = prismaServices[0];
  for (const [operation, operationArgs] of Object.entries(PRISMA_OPERATIONS)) {
    assert.deepEqual(buildPrismaArgs(operation, user), [
      "--filter",
      user.packageName,
      ...operationArgs,
    ]);
  }
  assert.throws(
    () => buildPrismaArgs("unknown", user),
    /unknown_prisma_operation/,
  );
});

test("root command names point at the consolidated backend tool", () => {
  const manifest = JSON.parse(source("package.json"));
  assert.deepEqual(
    {
      generate: manifest.scripts["prisma:gen"],
      development: manifest.scripts["prisma:migrate:dev"],
      deploy: manifest.scripts["prisma:migrate:deploy"],
      status: manifest.scripts["prisma:migrate:status"],
      seed: manifest.scripts["prisma:seed"],
      demoSeed: manifest.scripts["backend:seed"],
      push: manifest.scripts["db:push"],
      verifyMigrations: manifest.scripts["db:verify:migrations"],
      backup: manifest.scripts["db:backup"],
      restore: manifest.scripts["db:restore"],
      recovery: manifest.scripts["test:database-recovery"],
      boot: manifest.scripts["backend:boot"],
      health: manifest.scripts["backend:health"],
      down: manifest.scripts["backend:down"],
      provision: manifest.scripts["test:e2e:provision"],
      dockerBuild: manifest.scripts["docker:build:backend"],
      dockerClean: manifest.scripts["docker:build:backend:clean"],
      sourceBuild: manifest.scripts["build:backend"],
      sourceLint: manifest.scripts["lint:backend"],
      sourceTypes: manifest.scripts["check-types:backend"],
      dependencyScan: manifest.scripts["scan:dependencies:backend"],
      sourceScan: manifest.scripts["scan:source:backend"],
      imageScan: manifest.scripts["scan:images:backend"],
      e2e: manifest.scripts["test:e2e"],
    },
    {
      generate: "node ./scripts/backend.mjs prisma generate",
      development: "node ./scripts/backend.mjs prisma migrate-dev",
      deploy: "node ./scripts/backend.mjs prisma migrate-deploy",
      status: "node ./scripts/backend.mjs prisma migrate-status",
      seed: "node ./scripts/backend.mjs prisma seed",
      demoSeed: "node ./scripts/backend.mjs seed",
      push: "node ./scripts/backend.mjs prisma push",
      verifyMigrations: "node ./scripts/backend.mjs database verify-migrations",
      backup: "node ./scripts/backend.mjs database backup",
      restore: "node ./scripts/backend.mjs database restore",
      recovery: "node ./scripts/backend.mjs database test-recovery",
      boot: "node ./scripts/backend.mjs boot",
      health: "node ./scripts/backend.mjs health",
      down: "node ./scripts/backend.mjs down",
      provision: "node ./scripts/backend.mjs boot",
      dockerBuild: "node ./scripts/backend.mjs build-images",
      dockerClean: "node ./scripts/backend.mjs build-images --clean",
      sourceBuild: "node ./scripts/backend.mjs quality build",
      sourceLint: "node ./scripts/backend.mjs quality lint",
      sourceTypes: "node ./scripts/backend.mjs quality check-types",
      dependencyScan: "node ./scripts/backend.mjs security dependencies",
      sourceScan: "node ./scripts/backend.mjs security source",
      imageScan: "node ./scripts/backend.mjs security images",
      e2e: "pnpm build:backend && pnpm -r --workspace-concurrency=1 --filter=./apps/* --if-present run test:e2e",
    },
  );
  assert.equal(
    manifest.scripts["dev:backend"],
    "node ./scripts/backend.mjs dev",
  );
});

test("backend quality tasks derive filters from the inventory and exclude web", () => {
  const services = backendServices.slice(0, 2);
  assert.deepEqual(buildBackendQualityArgs("build", services), [
    "exec",
    "turbo",
    "run",
    "build",
    `--filter=${services[0].packageName}...`,
    `--filter=${services[1].packageName}...`,
  ]);
  assert.throws(
    () => buildBackendQualityArgs("format", services),
    /unknown_backend_quality_task_format/,
  );

  const calls = [];
  runBackendQualityTask("lint", {
    services,
    execute(args) {
      calls.push(args);
      return { status: 0 };
    },
    logger: { log() {} },
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].some((arg) => arg.includes("web")),
    false,
  );

  assert.throws(
    () =>
      runBackendQualityTask("check-types", {
        services,
        execute() {
          return { status: 6 };
        },
        logger: { log() {} },
      }),
    /backend_check-types_failed_exit_6/,
  );
});

test("runtime dependency inventory excludes optional CLI peers", () => {
  const workspaces = [
    {
      path: "service",
      dependencies: {
        "@prisma/client": {
          path: "prisma-client",
          version: "6.16.2",
          dependencies: {
            prisma: {
              path: "prisma-cli",
              version: "6.16.2",
              dependencies: {
                effect: { path: "effect", version: "3.16.12" },
              },
            },
          },
        },
        "@grpc/grpc-js": {
          path: "grpc",
          version: "1.14.0",
          dependencies: {
            protobufjs: { path: "protobufjs", version: "7.5.4" },
          },
        },
      },
    },
  ];
  const manifests = new Map([
    ["prisma-client", { peerDependenciesMeta: { prisma: { optional: true } } }],
  ]);
  const versions = collectRuntimeDependencyVersions(workspaces, {
    readManifest: (directory) => manifests.get(directory) ?? {},
  });

  assert.equal(versions.get("@prisma/client").has("6.16.2"), true);
  assert.equal(versions.has("prisma"), false);
  assert.equal(versions.has("effect"), false);
  assert.equal(versions.get("@grpc/grpc-js").has("1.14.0"), true);
  assert.equal(versions.get("protobufjs").has("7.5.4"), true);
});

test("dependency findings are classified before the backend runtime gate", () => {
  const audit = {
    advisories: {
      1: {
        id: 1,
        module_name: "protobufjs",
        severity: "critical",
        title: "runtime finding",
        patched_versions: ">=7.5.5",
        findings: [{ version: "7.5.4" }],
      },
      2: {
        id: 2,
        module_name: "effect",
        severity: "high",
        title: "tooling finding",
        patched_versions: ">=3.20.0",
        findings: [{ version: "3.16.12" }],
      },
      3: {
        id: 3,
        module_name: "next",
        severity: "high",
        title: "web finding",
        patched_versions: ">=16.1.0",
        findings: [{ version: "16.0.7" }],
      },
      4: {
        id: 4,
        module_name: "low-package",
        severity: "low",
        title: "not gated",
        findings: [{ version: "1.0.0" }],
      },
    },
  };
  const backend = new Map([["protobufjs", new Set(["7.5.4"])]]);
  const web = new Map([["next", new Set(["16.0.7"])]]);
  const findings = classifyDependencyAdvisories(audit, backend, web);

  assert.deepEqual(
    Object.fromEntries(
      findings.map((finding) => [finding.package, finding.classifications]),
    ),
    {
      effect: ["backend-tooling"],
      protobufjs: ["backend-runtime"],
      next: ["deferred-web"],
    },
  );
});

test("dependency report writes classifications and blocks runtime findings", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-security-"));
  const audit = {
    metadata: { vulnerabilities: { high: 2, critical: 1 } },
    advisories: {
      1: {
        id: 1,
        module_name: "protobufjs",
        severity: "critical",
        title: "runtime finding",
        patched_versions: ">=7.5.5",
        findings: [{ version: "7.5.4" }],
      },
      2: {
        id: 2,
        module_name: "next",
        severity: "high",
        title: "web finding",
        patched_versions: ">=16.1.0",
        findings: [{ version: "16.0.7" }],
      },
    },
  };
  const backendList = [
    {
      path: "service",
      dependencies: {
        protobufjs: { path: "protobufjs", version: "7.5.4" },
      },
    },
  ];
  const webList = [
    {
      path: "web",
      dependencies: { next: { path: "next", version: "16.0.7" } },
    },
  ];

  try {
    assert.throws(
      () =>
        generateBackendDependencyReport({
          execute(args) {
            if (args[0] === "audit") {
              return { status: 1, stdout: JSON.stringify(audit) };
            }
            if (args[0] === "--filter=./apps/web") {
              return { status: 0, stdout: JSON.stringify(webList) };
            }
            return { status: 0, stdout: JSON.stringify(backendList) };
          },
          logger: { log() {} },
          outputDirectory: temporary,
          services: backendServices.slice(0, 1),
        }),
      /backend_dependency_gate_failed_1_high_or_critical/,
    );
    const report = JSON.parse(
      readFileSync(path.join(temporary, "backend-dependencies.json"), "utf8"),
    );
    assert.deepEqual(report.summary, {
      highCritical: 2,
      backendRuntime: 1,
      backendTooling: 0,
      deferredWeb: 1,
    });
    assert.deepEqual(report.policy.approvedAdvisories, []);
    assert.deepEqual(
      report.findings.find((finding) => finding.package === "protobufjs")
        .backendPaths,
      ["service > protobufjs@7.5.4"],
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("Trivy source scope excludes web, env, generated, and vendor inputs", () => {
  const args = buildTrivySourceArgs("source.json");
  assert.deepEqual(args.slice(0, 11), [
    "fs",
    "--scanners",
    "secret,misconfig",
    "--severity",
    "HIGH,CRITICAL",
    "--exit-code",
    "1",
    "--format",
    "json",
    "--output",
    "source.json",
  ]);
  for (const excluded of [
    "apps/web",
    "**/node_modules",
    "**/dist",
    "**/generated",
    "**/vendor",
  ]) {
    assert.equal(args.includes(excluded), true);
  }
  assert.equal(args.includes(".env"), true);
  assert.equal(args.includes("**/.env"), true);
  assert.equal(args.includes("**/.env.local"), true);
  assert.equal(args.includes("**/.env.*"), false);
  assert.equal(args.includes("**/.env.example"), false);
  assert.equal(args.at(-1), ".");

  const calls = [];
  runBackendSourceScan({
    execute(command, commandArgs) {
      calls.push({ command, commandArgs });
      return { status: 0 };
    },
    logger: { log() {} },
    outputDirectory: ".security-reports-test",
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, "trivy");
  assert.equal(calls[1].commandArgs[0], "convert");
  rmSync(".security-reports-test", { recursive: true, force: true });
});

test("Trivy image scans reuse every inventory image and collect failures", () => {
  const services = backendServices.slice(0, 3);
  const args = buildTrivyImageArgs(services[0].defaultImage, "image.json");
  assert.equal(args[0], "image");
  assert.equal(args.includes("--ignore-unfixed"), false);
  assert.equal(args.at(-1), services[0].defaultImage);

  const calls = [];
  assert.throws(
    () =>
      runBackendImageScans({
        services,
        execute(command, commandArgs) {
          calls.push({ command, commandArgs });
          const isScan = commandArgs[0] === "image";
          return {
            status:
              isScan && commandArgs.at(-1) === services[1].defaultImage ? 1 : 0,
          };
        },
        logger: { log() {} },
        outputDirectory: ".security-reports-test",
      }),
    /backend_image_gate_failed_auth-service/,
  );
  assert.deepEqual(
    calls
      .filter((call) => call.commandArgs[0] === "image")
      .map((call) => call.commandArgs.at(-1)),
    services.map((service) => service.defaultImage),
  );
  rmSync(".security-reports-test", { recursive: true, force: true });
});

test("backend image targets build sequentially and stop on the first failure", () => {
  const services = backendServices.slice(0, 3);
  const calls = [];
  buildBackendImages({
    services,
    execute(command, args) {
      calls.push({ command, args });
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.deepEqual(
    calls.map((call) => call.args[2]),
    services.map((service) => service.dockerService),
  );
  assert.equal(
    calls.every((call) => call.args.includes("--load")),
    true,
  );
  assert.equal(
    calls.every((call) => call.args.includes("--progress=plain")),
    true,
  );

  const failedCalls = [];
  assert.throws(
    () =>
      buildBackendImages({
        services,
        execute(command, args) {
          failedCalls.push(args);
          return { status: failedCalls.length === 2 ? 7 : 0 };
        },
        logger: { log() {} },
      }),
    /backend_image_auth-service_failed_exit_7/,
  );
  assert.equal(failedCalls.length, 2);

  const cleanCalls = [];
  buildBackendImages({
    clean: true,
    services: services.slice(0, 2),
    execute(command, args) {
      cleanCalls.push(args);
      return { status: 0 };
    },
    logger: { log() {} },
  });
  assert.equal(cleanCalls[0].includes("--pull"), true);
  assert.equal(cleanCalls[0].includes("--no-cache"), true);
  assert.equal(cleanCalls[1].includes("--pull"), false);
  assert.equal(cleanCalls[1].includes("--no-cache"), false);
  assert.equal(
    cleanCalls.every((args) =>
      args.some((arg) => arg.endsWith(".args.TURBO_FORCE=1")),
    ),
    true,
  );
});

test("database readiness uses the inventory and waits for missing databases", async () => {
  const allDatabases = prismaServices.map((service) => service.database);
  assert.deepEqual(
    missingExpectedDatabases(`${allDatabases.slice(0, -1).join("\n")}\n`),
    [allDatabases.at(-1)],
  );

  let calls = 0;
  let clock = 0;
  await waitForExpectedDatabases({
    execute(command, args) {
      calls += 1;
      assert.match(command, /docker/);
      assert.equal(args.includes("psql"), true);
      return {
        status: 0,
        stdout:
          calls === 1
            ? `${allDatabases.slice(0, -1).join("\n")}\n`
            : `${allDatabases.join("\n")}\n`,
      };
    },
    logger: { log() {} },
    now: () => clock,
    sleep: async (milliseconds) => {
      clock += milliseconds;
    },
    timeoutMs: 5_000,
  });
  assert.equal(calls, 2);
});

test("backend boot reuses migration, seed, Bake, Compose, and readiness owners in order", async () => {
  const events = [];
  const allDatabases = prismaServices
    .map((service) => service.database)
    .join("\n");

  await provisionBackend({
    ensureEnvironment() {
      events.push("environment");
    },
    executeDocker(command, args) {
      if (args.includes("psql")) {
        events.push("databases");
        return { status: 0, stdout: `${allDatabases}\n` };
      }
      events.push(`docker:${args.join(" ")}`);
      return { status: 0, stdout: "" };
    },
    executePnpm(args) {
      if (args[0] === "run" && args[1] === "docker:build:backend") {
        events.push("bake");
      } else if (args.includes("deploy")) {
        events.push(`deploy:${args[1]}`);
      } else if (args.includes("status")) {
        events.push(`status:${args[1]}`);
      } else if (args.includes("db:seed")) {
        events.push(`base-seed:${args[1]}`);
      }
      return { status: 0 };
    },
    async fetchImpl(url) {
      const service = backendServices.find((entry) =>
        String(url).includes(`:${entry.httpPort}/`),
      );
      assert.notEqual(service, undefined);
      events.push(`health:${service.name}`);
      return jsonResponse(200, { service: service.name, status: "ok" });
    },
    logger: { log() {} },
    async seedDemo() {
      events.push("demo-seed");
    },
  });

  assert.deepEqual(events.slice(0, 3), [
    "environment",
    "docker:compose up -d --wait --wait-timeout 120 postgres redis minio",
    "databases",
  ]);
  assert.equal(
    events.some((event) => event.includes("minio-init")),
    false,
  );
  assert.deepEqual(
    events.filter((event) => event.startsWith("deploy:")),
    prismaServices.map((service) => `deploy:${service.packageName}`),
  );
  assert.deepEqual(
    events.filter((event) => event.startsWith("status:")),
    prismaServices.map((service) => `status:${service.packageName}`),
  );
  assert.deepEqual(
    events.filter((event) => event.startsWith("base-seed:")),
    prismaServices.map((service) => `base-seed:${service.packageName}`),
  );
  assert.equal(events.filter((event) => event === "bake").length, 1);
  assert.equal(events.includes("docker:compose up -d --no-build"), true);
  assert.equal(
    events.some((event) => event.includes("--build")),
    false,
  );
  assert.deepEqual(
    events.filter((event) => event.startsWith("health:")),
    backendServices.map((service) => `health:${service.name}`),
  );
  assert.equal(events.at(-1), "demo-seed");
});

test("backend health is read-only and backend down preserves named volumes", async () => {
  const healthCalls = [];
  const logs = [];
  const services = backendServices.slice(0, 2);
  const health = await checkBackendHealth({
    services,
    async fetchImpl(url) {
      healthCalls.push(String(url));
      const service = services[healthCalls.length - 1];
      return jsonResponse(200, { service: service.name, status: "ok" });
    },
    logger: { log: (message) => logs.push(message) },
  });
  assert.equal(health.length, services.length);
  assert.equal(
    healthCalls.every((url) => url.endsWith("/health/ready")),
    true,
  );
  assert.equal(logs.length, services.length);

  const dockerCalls = [];
  downBackend({
    execute(command, args) {
      dockerCalls.push({ command, args });
      return { status: 0 };
    },
    logger: { log: (message) => logs.push(message) },
  });
  assert.deepEqual(dockerCalls[0].args, ["compose", "down"]);
  assert.equal(dockerCalls[0].args.includes("-v"), false);
  assert.match(logs.at(-1), /volumes were preserved/);
});

test("Prisma actions run sequentially and stop at the first failure", () => {
  const calls = [];
  const logs = [];
  assert.throws(
    () =>
      runPrismaOperation("migrate-deploy", {
        services: prismaServices.slice(0, 4),
        execute(args) {
          calls.push(args[1]);
          return { status: calls.length === 3 ? 7 : 0 };
        },
        logger: { log: (message) => logs.push(message) },
      }),
    /media-service_nebula_media_failed_exit_7/,
  );

  assert.deepEqual(calls, [
    "@nebula/user-service",
    "@nebula/settings-service",
    "@nebula/media-service",
  ]);
  assert.equal(logs.length, 3);
  assert.match(logs[2], /media-service \(nebula_media\)/);

  assert.throws(
    () =>
      runPrismaOperation("generate", {
        services: [prismaServices[0]],
        execute() {
          throw new Error("postgresql://admin:secret@localhost/private");
        },
        logger: { log() {} },
      }),
    /user-service_nebula_users_failed_to_start/,
  );
});

test("clean migration verification uses disposable databases and always cleans up", () => {
  const dockerCalls = [];
  const prismaCalls = [];
  const services = prismaServices.slice(0, 2);
  const expected = disposableMigrationServices(services, "success-run");

  const verified = verifyCleanMigrations({
    services,
    runId: "success-run",
    executeDocker(command, args) {
      dockerCalls.push({ command, args });
      return { status: 0 };
    },
    executePrisma(args) {
      prismaCalls.push(args);
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.deepEqual(
    verified,
    expected.map((service) => service.database),
  );
  assert.deepEqual(
    prismaCalls.map((args) =>
      args.includes("deploy") ? "migrate-deploy" : "migrate-status",
    ),
    ["migrate-deploy", "migrate-status", "migrate-deploy", "migrate-status"],
  );
  assert.deepEqual(
    dockerCalls
      .filter((call) => call.args.includes("createdb"))
      .map((call) => call.args.at(-1)),
    expected.map((service) => service.database),
  );
  assert.deepEqual(
    dockerCalls
      .filter((call) => call.args.includes("dropdb"))
      .map((call) => call.args.at(-1)),
    expected.map((service) => service.database).reverse(),
  );
});

test("clean migration verification stops after failure and cleans only created databases", () => {
  const dockerCalls = [];
  let prismaCalls = 0;
  const services = prismaServices.slice(0, 3);
  const expected = disposableMigrationServices(services, "failure-run");

  assert.throws(
    () =>
      verifyCleanMigrations({
        services,
        runId: "failure-run",
        executeDocker(command, args) {
          dockerCalls.push({ command, args });
          return { status: 0 };
        },
        executePrisma() {
          prismaCalls += 1;
          return { status: prismaCalls === 3 ? 9 : 0 };
        },
        logger: { log() {} },
      }),
    /settings-service.*failed_exit_9/,
  );

  assert.equal(prismaCalls, 3);
  assert.deepEqual(
    dockerCalls
      .filter((call) => call.args.includes("createdb"))
      .map((call) => call.args.at(-1)),
    expected.slice(0, 2).map((service) => service.database),
  );
  assert.deepEqual(
    dockerCalls
      .filter((call) => call.args.includes("dropdb"))
      .map((call) => call.args.at(-1)),
    expected
      .slice(0, 2)
      .map((service) => service.database)
      .reverse(),
  );
});

test("backup refuses running backends and removes incomplete output", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-backup-test-"));
  const runningTarget = path.join(temporary, "running");
  let binaryCalls = 0;

  await assert.rejects(
    backupLocalDatabases(runningTarget, {
      execute(command, args) {
        assert.match(command, /docker/);
        assert.deepEqual(args.slice(0, 3), ["compose", "ps", "--services"]);
        return { status: 0, stdout: "postgres\nuser-service\n" };
      },
      async executeBinary() {
        binaryCalls += 1;
      },
      logger: { log() {} },
    }),
    /backend_services_must_be_stopped_user-service/,
  );
  assert.equal(binaryCalls, 0);
  assert.equal(existsSync(runningTarget), false);

  const failedTarget = path.join(temporary, "failed");
  let dumps = 0;
  await assert.rejects(
    backupLocalDatabases(failedTarget, {
      execute(command, args) {
        if (args.includes("ps")) return { status: 0, stdout: "postgres\n" };
        return { status: 0, stdout: "" };
      },
      async executeBinary(command, args, options) {
        dumps += 1;
        writeFileSync(options.outputPath, Buffer.from([0, 255, dumps]));
        return { status: dumps === 2 ? 5 : 0 };
      },
      logger: { log() {} },
    }),
    /backup_nebula_settings_failed_exit_5/,
  );
  assert.equal(existsSync(failedTarget), false);
  rmSync(temporary, { recursive: true, force: true });
});

test("backup writes one binary dump per inventory database and a strict manifest", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-backup-test-"));
  const target = path.join(temporary, "complete");
  const binaryCalls = [];

  const resolved = await backupLocalDatabases(target, {
    execute(command, args) {
      if (args.includes("ps")) return { status: 0, stdout: "postgres\n" };
      return { status: 0, stdout: "" };
    },
    async executeBinary(command, args, options) {
      binaryCalls.push({ command, args, options });
      writeFileSync(options.outputPath, Buffer.from([0, 1, 2, 255]));
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.equal(resolved, target);
  assert.equal(binaryCalls.length, prismaServices.length);
  assert.equal(
    binaryCalls.every((call) => call.args.includes("--format=custom")),
    true,
  );
  const manifest = validateBackupManifest(
    JSON.parse(readFileSync(path.join(target, BACKUP_MANIFEST), "utf8")),
  );
  assert.deepEqual(
    manifest.databases.map((entry) => entry.database),
    prismaServices.map((service) => service.database),
  );
  for (const entry of manifest.databases) {
    assert.equal(existsSync(path.join(target, entry.file)), true);
  }

  const changed = structuredClone(manifest);
  changed.databases[0].database = "unexpected_database";
  assert.throws(
    () => validateBackupManifest(changed),
    /backup_manifest_database_inventory_mismatch/,
  );
  rmSync(temporary, { recursive: true, force: true });
});

test("restore validates confirmation and restores only manifest databases", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-restore-test-"));
  const target = path.join(temporary, "backup");
  await backupLocalDatabases(target, {
    execute(command, args) {
      if (args.includes("ps")) return { status: 0, stdout: "postgres\n" };
      return { status: 0, stdout: "" };
    },
    async executeBinary(command, args, options) {
      writeFileSync(options.outputPath, Buffer.from([0, 255, 10]));
      return { status: 0 };
    },
    logger: { log() {} },
  });

  let dockerCalls = 0;
  await assert.rejects(
    restoreLocalDatabases(target, "wrong-confirmation", {
      execute() {
        dockerCalls += 1;
      },
      logger: { log() {} },
    }),
    /restore_confirmation_required/,
  );
  assert.equal(dockerCalls, 0);

  const postgresCalls = [];
  const restoreCalls = [];
  await restoreLocalDatabases(target, RESTORE_CONFIRMATION, {
    execute(command, args) {
      if (args.includes("ps")) return { status: 0, stdout: "postgres\n" };
      postgresCalls.push(args);
      return { status: 0, stdout: "" };
    },
    async executeBinary(command, args, options) {
      restoreCalls.push({ command, args, options });
      assert.equal(existsSync(options.inputPath), true);
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.equal(restoreCalls.length, prismaServices.length);
  assert.equal(
    restoreCalls.every((call) => call.args.includes("pg_restore")),
    true,
  );
  assert.equal(
    postgresCalls.filter((args) => args.includes("dropdb")).length,
    prismaServices.length,
  );
  assert.equal(
    postgresCalls.filter((args) => args.includes("createdb")).length,
    prismaServices.length,
  );
  rmSync(temporary, { recursive: true, force: true });
});

test("recovery proof uses binary data, a temporary failed migration, and disposable databases", async () => {
  const dockerCalls = [];
  const binaryCalls = [];
  const prismaCalls = [];
  let failingSchema;

  await verifyDatabaseRecovery({
    runId: "unit-recovery",
    executeDocker(command, args) {
      dockerCalls.push({ command, args });
      const sql = args.at(-1);
      if (typeof sql === "string" && sql.includes("SELECT encode")) {
        return { status: 0, stdout: "0001027f80feff\n" };
      }
      if (typeof sql === "string" && sql.includes("to_regclass")) {
        return { status: 0, stdout: "t\n" };
      }
      return { status: 0, stdout: "" };
    },
    async executeBinary(command, args, options) {
      binaryCalls.push({ command, args, options });
      if (options.outputPath) {
        writeFileSync(
          options.outputPath,
          Buffer.from([0, 1, 2, 127, 128, 254, 255]),
        );
      }
      if (options.inputPath) assert.equal(existsSync(options.inputPath), true);
      return { status: 0 };
    },
    executePrisma(args) {
      prismaCalls.push(args);
      const schema = args.find(
        (arg) => typeof arg === "string" && arg.endsWith("schema.prisma"),
      );
      if (schema && schema !== "./prisma/schema.prisma") {
        failingSchema = schema;
        return { status: 7 };
      }
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.equal(binaryCalls.length, 2);
  assert.equal(typeof failingSchema, "string");
  assert.equal(existsSync(failingSchema), false);
  assert.deepEqual(
    prismaCalls.map((args) => args[1]),
    [
      "@nebula/user-service",
      "@nebula/settings-service",
      "@nebula/settings-service",
      "@nebula/settings-service",
    ],
  );
  assert.equal(
    dockerCalls
      .filter((call) => call.args.includes("dropdb"))
      .every((call) => String(call.args.at(-1)).includes("_verify_")),
    true,
  );
});

test("tooling output redacts database credentials and configured secrets", () => {
  const env = {
    DATABASE_URL: "postgresql://admin:database-pass@localhost:5432/example",
    JWT_SECRET: "jwt-secret-value",
    SEED_ADMIN_PASS: "seed-admin-password",
  };
  const sanitized = sanitizeOutput(
    `failed ${env.DATABASE_URL} jwt-secret-value seed-admin-password postgresql://other:password@db:5432/test`,
    env,
  );

  assert.doesNotMatch(
    sanitized,
    /database-pass|jwt-secret-value|seed-admin-password|other:password/,
  );
  assert.match(sanitized, /\[REDACTED\]/);
});

test("demo seed creates stable records through the existing HTTP contracts", async () => {
  const calls = [];
  const logs = [];
  const fetchImpl = queuedFetch(
    [
      jsonResponse(200, {
        accessToken: "access-token-secret",
        refreshToken: "refresh-token-secret",
      }),
      jsonResponse(200, { data: [] }),
      jsonResponse(201, { data: { ...DEMO_PRODUCT, id: "product-id" } }),
      jsonResponse(404, { message: "post_not_found" }),
      jsonResponse(201, {
        data: { ...DEMO_BLOG_POST, id: "blog-post-id" },
      }),
    ],
    calls,
  );

  const result = await seedBackendDemo({
    env: {
      NODE_ENV: "development",
      SEED_ADMIN_EMAIL: "seed-admin@example.com",
      SEED_ADMIN_PASS: "seed-admin-password",
    },
    fetchImpl,
    logger: { log: (message) => logs.push(message) },
  });

  assert.deepEqual(result, { product: "created", blog: "created" });
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ["POST", "GET", "POST", "GET", "POST"],
  );
  const loginBody = JSON.parse(calls[0].options.body);
  assert.deepEqual(loginBody, {
    identifier: "seed-admin@example.com",
    password: "seed-admin-password",
  });
  const productBody = JSON.parse(calls[2].options.body);
  assert.equal(productBody.data.slug, DEMO_PRODUCT.slug);
  assert.equal(productBody.data.sku, DEMO_PRODUCT.sku);
  assert.equal("categoryId" in productBody.data, false);
  assert.equal(
    calls[2].options.headers.authorization,
    "Bearer access-token-secret",
  );
  assert.equal(
    calls[4].options.headers.authorization,
    "Bearer access-token-secret",
  );
  assert.doesNotMatch(
    logs.join("\n"),
    /seed-admin-password|access-token-secret|refresh-token-secret/,
  );
});

test("demo seed safely skips both matching records on repeat", async () => {
  const calls = [];
  const result = await seedBackendDemo({
    env: { NODE_ENV: "development" },
    fetchImpl: queuedFetch(
      [
        jsonResponse(200, { accessToken: "access-token" }),
        jsonResponse(200, { data: [{ ...DEMO_PRODUCT }] }),
        jsonResponse(200, { data: { ...DEMO_BLOG_POST } }),
      ],
      calls,
    ),
    logger: { log() {} },
  });

  assert.deepEqual(result, { product: "existing", blog: "existing" });
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ["POST", "GET", "GET"],
  );
});

test("demo seed completes whichever stable record is missing", async () => {
  for (const existing of ["product", "blog"]) {
    const calls = [];
    const responses =
      existing === "product"
        ? [
            jsonResponse(200, { accessToken: "access-token" }),
            jsonResponse(200, { data: [{ ...DEMO_PRODUCT }] }),
            jsonResponse(404, { message: "post_not_found" }),
            jsonResponse(201, { data: { ...DEMO_BLOG_POST } }),
          ]
        : [
            jsonResponse(200, { accessToken: "access-token" }),
            jsonResponse(200, { data: [] }),
            jsonResponse(201, { data: { ...DEMO_PRODUCT } }),
            jsonResponse(200, { data: { ...DEMO_BLOG_POST } }),
          ];

    const result = await seedBackendDemo({
      env: { NODE_ENV: "development" },
      fetchImpl: queuedFetch(responses, calls),
      logger: { log() {} },
    });

    assert.equal(result[existing], "existing");
    assert.equal(
      result[existing === "product" ? "blog" : "product"],
      "created",
    );
  }
});

test("demo seed refuses production and stops on dependency failure", async () => {
  let productionCalls = 0;
  await assert.rejects(
    seedBackendDemo({
      env: { NODE_ENV: "production" },
      fetchImpl: async () => {
        productionCalls += 1;
      },
      logger: { log() {} },
    }),
    /development_demo_seed_refused_in_production/,
  );
  assert.equal(productionCalls, 0);

  const calls = [];
  await assert.rejects(
    seedBackendDemo({
      env: { NODE_ENV: "development" },
      fetchImpl: queuedFetch(
        [
          jsonResponse(200, { accessToken: "access-token" }),
          jsonResponse(503, { status: "error" }),
        ],
        calls,
      ),
      logger: { log() {} },
    }),
    /demo_seed_product_lookup_http_503/,
  );
  assert.equal(calls.length, 2);
});

test("development and release commands derive all backend services", () => {
  assert.deepEqual(buildDevCommands(), [
    "pnpm run dev:user",
    "pnpm run dev:auth",
    "pnpm run dev:settings",
    "pnpm run dev:media",
    "pnpm run dev:taxonomy",
    "pnpm run dev:product",
    "pnpm run dev:blog",
    "pnpm run dev:order",
  ]);
  assert.deepEqual(
    releaseImages("example/nebula", "test"),
    backendServices.map(
      (service) => `example/nebula-${service.dockerService}:test`,
    ),
  );
});
