import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { collectImageIdentities } from "./docker/record-image-identities.mjs";
import { releaseArchiveImages } from "./docker/release-image-inventory.mjs";
import {
  BACKUP_MANIFEST,
  DEMO_BLOG_POST,
  PRISMA_OPERATIONS,
  RESTORE_CONFIRMATION,
  TRIVY_DB_REPOSITORIES,
  backendServices,
  backupLocalDatabases,
  buildBackendQualityArgs,
  buildBackendImages,
  parseBackendBuildOptions,
  buildDevCommands,
  buildPrismaArgs,
  buildTrivyImageArgs,
  buildTrivySourceArgs,
  captureComposeConfigurations,
  captureComposeFailureEvidence,
  checkBackendHealth,
  classifyDependencyAdvisories,
  composeServices,
  collectRuntimeDependencyVersions,
  createTrivyEvidenceReport,
  disposableMigrationServices,
  dropDisposableDatabase,
  downBackend,
  generateBackendDependencyReport,
  hybridServices,
  maintenanceDatabaseServices,
  missingExpectedDatabases,
  migrationVerificationServices,
  prismaServices,
  provisionBackend,
  releaseImages,
  repositoryRoot,
  runBackendImageScans,
  runBackendQualityTask,
  runBackendSourceScan,
  runPrismaOperation,
  runLocalDatabaseMigration,
  main,
  sanitizeOutput,
  seedBackendDemo,
  verifyD1CommerceUpgrade,
  assertD1UpgradeMigrationWindow,
  summarizeTrivyImageVulnerabilities,
  restoreLocalDatabases,
  validateBackupManifest,
  validateRenderedComposeBoundary,
  verifyCleanMigrations,
  verifyMediaProcessingUpgrade,
  verifyProductMetadataUpgrade,
  verifyDatabaseRecovery,
  verifyF4Batch3RoleSeeds,
  verifyF4R2DefaultActors,
  verifyF4R3RealmAuthFoundation,
  verifyF4R4AdminSplitStaged,
  verifyProductInventoryContract,
  verifyTenantAuthorityDefaultSeed,
  verifyTenantAuthorityRegistrationRecords,
  waitForExpectedDatabases,
} from "./backend.mjs";

function source(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("release Authority receives its required membership-epoch signing inputs", () => {
  const require = createRequire(import.meta.url);
  const eslintRequire = createRequire(require.resolve("eslint/package.json"));
  const release = eslintRequire("js-yaml").load(
    source("docker-compose.release.yml"),
  );
  const template = envValues(source("deploy/.env.production.example"));
  for (const name of [
    "AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID",
    "AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY",
  ]) {
    assert.equal(
      release.services["tenant-authority-service"].environment[name],
      "${" + name + ":?" + name + " is required}",
    );
    assert.ok(
      template.has(name),
      `${name} must be supplied by the deployment template`,
    );
    assert.equal(
      source("deploy/.env.production.example")
        .split(/\r?\n/)
        .filter((line) => line.startsWith(`${name}=`)).length,
      1,
      `${name} must not have shadowing duplicate declarations`,
    );
  }
  assert.match(
    template.get("AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID"),
    /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/,
  );
  assert.ok(template.get("AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY").length >= 32);
});

test("D1 upgrade keeps exact historical targets while permitting a later D2 migration", () => {
  const targets = ["20260901000100_one", "20260902000100_two"];
  assert.doesNotThrow(() =>
    assertD1UpgradeMigrationWindow(
      [
        "20260101000100_baseline",
        ...targets,
        "20261013000100_cart_selections_and_money",
      ],
      targets,
      "order",
    ),
  );
  assert.throws(
    () => assertD1UpgradeMigrationWindow([targets[0]], targets, "order"),
    /d1_upgrade_migration_set_changed_order/,
  );
  assert.throws(
    () =>
      assertD1UpgradeMigrationWindow(
        [targets[0], "20260901000200_unexpected", targets[1]],
        targets,
        "order",
      ),
    /d1_upgrade_migration_set_changed_order/,
  );
});

function serviceBlock(contents, serviceName) {
  const marker = new RegExp(`^  ${serviceName}:\\s*$`, "m");
  const match = marker.exec(contents);
  assert.notEqual(match, null, `${serviceName} is missing`);
  const tail = contents.slice(match.index + match[0].length);
  const next = tail.search(/\r?\n {2}[A-Za-z0-9][A-Za-z0-9_-]*:\s*(?:\r?\n|$)/);
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
      /\r?\n {4}depends_on:\s*\r?\n([\s\S]*?)(?=\r?\n {4}[a-z_][A-Za-z0-9_-]*:|$)/,
    )?.[1] ?? "";
  return Object.fromEntries(
    [
      ...dependencies.matchAll(
        /^ {6}([A-Za-z0-9_-]+):\s*\r?\n {8}condition: ([a-z_]+)$/gm,
      ),
    ].map((match) => [match[1], match[2]]),
  );
}

function renderedBoundaryFixture(label) {
  const services = {
    postgres: { ports: label === "local" ? [{ target: 5432 }] : [] },
    redis: { ports: label === "local" ? [{ target: 6379 }] : [] },
    minio: {
      ports:
        label === "local"
          ? [{ target: 9000 }, { target: 9001 }]
          : [{ target: 9000 }],
    },
  };
  for (const service of backendServices) {
    const ports =
      label === "local"
        ? [service.httpPort, service.grpcPort]
            .filter(Number.isInteger)
            .map((target) => ({ target }))
        : service.name === "gateway"
          ? [{ target: 3002 }]
          : [];
    services[service.dockerService] = {
      ports,
      ...(service.transport === "http-grpc"
        ? {
            environment: {
              PUBLIC_MODE:
                label === "release" && service.name === "media-service"
                  ? "OPEN"
                  : "GATEWAY_ONLY",
            },
          }
        : {}),
    };
  }

  services.gateway = {
    ...services.gateway,
    ...(label === "local" ? { build: { target: "gateway-runtime" } } : {}),
    depends_on: {
      "auth-service": { condition: "service_healthy" },
      redis: { condition: "service_healthy" },
    },
    environment: {
      GATEWAY_HTTP_PORT: "3002",
      GATEWAY_REDIS_URL: "redis://redis:6379/0",
      GATEWAY_OUTBOUND_KEYS: "configured",
      GATEWAY_APPLICATION_REGISTRY_JSON: "configured",
      MEDIA_RENDER_HTTP_URL: "http://media-service:3007",
      USER_GRPC_URL: "user-service:50051",
      AUTH_GRPC_URL: "auth-service:50052",
      PRODUCT_GRPC_URL: "product-service:50053",
      SETTINGS_GRPC_URL: "settings-service:50054",
      BLOG_GRPC_URL: "blog-service:50055",
      ORDER_GRPC_URL: "order-service:50056",
      TAXONOMY_GRPC_URL: "taxonomy-service:50057",
      MEDIA_GRPC_URL: "media-service:50058",
      TENANT_AUTHORITY_GRPC_URL: "tenant-authority-service:50059",
    },
    healthcheck: {
      test: ["CMD", "http://localhost:3002/health/ready"],
    },
  };
  services["media-scanner"] = {};
  services["media-service"].depends_on = {
    "media-scanner": { condition: "service_started" },
  };
  return { services };
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
      "realm-auth-service",
      "tenant-authority-service",
      "settings-service",
      "media-service",
      "taxonomy-service",
      "product-service",
      "blog-service",
      "order-service",
      "gateway",
    ],
  );
  assert.deepEqual(
    prismaServices.map((service) => service.database),
    [
      "nebula_users",
      "nebula_realm_auth_default",
      "nebula_authority",
      "nebula_settings",
      "nebula_media",
      "nebula_taxonomy",
      "nebula_products",
      "nebula_blog",
      "nebula_order",
    ],
  );
  assert.deepEqual(
    maintenanceDatabaseServices.map((service) => service.database),
    [
      "nebula_users",
      "nebula_realm_auth_default",
      "nebula_authority",
      "nebula_settings",
      "nebula_media",
      "nebula_taxonomy",
      "nebula_products",
      "nebula_blog",
      "nebula_order",
      "nebula_realm_auth_operator",
    ],
  );

  assert.equal(
    new Set(backendServices.map((service) => service.name)).size,
    11,
  );
  assert.equal(hybridServices.length, 9);
  assert.equal(prismaServices.length, 9);
  assert.equal(composeServices.length, 11);
  assert.equal(
    new Set(
      backendServices.flatMap((service) =>
        service.grpcPort === undefined
          ? [service.httpPort]
          : [service.httpPort, service.grpcPort],
      ),
    ).size,
    20,
  );

  const gateway = backendServices.at(-1);
  assert.equal(gateway.name, "gateway");
  assert.equal(gateway.transport, "http");
  assert.equal(gateway.grpcPort, undefined);
  assert.equal(gateway.database, null);
  assert.equal(gateway.compose, true);

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

test("runtime Joi schema owners use one exact version", () => {
  const ownerDirectories = [
    ...backendServices.map((service) => service.directory),
    "packages/config",
    "packages/grpc-auth",
  ];
  const versions = ownerDirectories.map((directory) => {
    const manifest = JSON.parse(
      readFileSync(
        path.join(repositoryRoot, directory, "package.json"),
        "utf8",
      ),
    );
    const version = manifest.dependencies?.joi;

    assert.match(
      version,
      /^\d+\.\d+\.\d+$/,
      `${manifest.name} must pin Joi because its schemas are composed across workspace boundaries`,
    );
    return version;
  });

  assert.equal(
    new Set(versions).size,
    1,
    "all runtime Joi schema owners must resolve the same version",
  );
});

test("runtime ports, healthchecks, dependencies, and database initialization match the inventory", () => {
  const localCompose = source("docker-compose.yml");
  const releaseCompose = source("docker-compose.release.yml");
  const bake = source("docker-bake.hcl");
  const dockerfile = source("docker/backend.Dockerfile");
  const databaseInit = source("scripts/db/init-multiple-dbs.sh");
  const rootExample = envValues(source(".env.example"));
  const releaseExample = envValues(source("deploy/.env.production.example"));

  assert.match(
    dockerfile,
    /FROM node:22-bookworm@sha256:[a-f0-9]{64} AS build-base/,
    "the build base must use an immutable official-image index",
  );
  assert.match(
    dockerfile,
    /FROM node:22-bookworm-slim@sha256:[a-f0-9]{64} AS runtime-base/,
    "the runtime base must use an immutable official-image index",
  );
  const runtimeBase =
    dockerfile.split(" AS runtime-base")[1]?.split("FROM runtime-base")[0] ??
    "";
  assert.match(
    runtimeBase,
    /apt-get update[\s\S]*?apt-get install[^\n]*\\\r?\n\s+ca-certificates openssl libpcre2-8-0 perl-base/,
  );
  assert.doesNotMatch(
    dockerfile,
    /RUN --mount=type=cache,id=nebula-corepack[^\n]*\n\s*set -eu;/,
    "Corepack preparation must persist in build-base for descendant stages",
  );
  assert.match(
    dockerfile,
    /until corepack prepare pnpm@10\.17\.1 --activate; do[\s\S]*?"\$attempt" -ge 3/,
    "Corepack preparation must use a bounded retry",
  );

  const backendGroup =
    bake.match(/group "backend"\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const bakeTargets = [...backendGroup.matchAll(/"([a-z]+(?:-[a-z]+)*)"/g)].map(
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
  assert.match(
    dockerfile,
    /for target in \/workspace\/node_modules\/\.pnpm\/\*\/node_modules\//,
  );
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/\.runtime-packages \/packages/,
  );
  assert.match(
    dockerfile,
    /require\.resolve\('@nebula\/protos\/tenant_authority\.proto'\)/,
  );
  assert.match(
    dockerfile,
    /--mount=from=prod-deps,source=\/app\/packages,target=\/production-packages,ro/,
  );
  assert.match(
    dockerfile,
    /pnpm install --frozen-lockfile[\s\S]*?--child-concurrency=1[\s\S]*?--filter=@nebula\/protos\.\.\./,
    "build dependency lifecycle scripts must run serially",
  );
  const graphInstall = dockerfile
    .split("FROM graph-fetch AS graph-deps")[1]
    ?.split("FROM graph-deps AS graph-prisma")[0];
  assert.match(
    graphInstall,
    /pnpm install --offline --frozen-lockfile --child-concurrency=1/,
  );
  assert.doesNotMatch(graphInstall, /--ignore-scripts/);
  assert.match(dockerfile, /FROM \$\{BACKEND_BUILD_PIPELINE\}-build AS build/);
  for (const name of backendServices.map((service) => service.name)) {
    assert.match(
      serviceBlock(localCompose, name),
      /BACKEND_BUILD_PIPELINE: graph/,
    );
  }
  assert.match(
    dockerfile,
    /cp -a "\/production-packages\/\$directory\/node_modules" "\/workspace\/packages\/\$directory\/node_modules"/,
  );
  assert.doesNotMatch(dockerfile, /Missing injected pnpm slot/);
  assert.equal(
    dockerfile.split("require(p)").length - 1,
    backendServices.length,
    "every runtime target must load its declared internal dependencies",
  );
  assert.doesNotMatch(dockerfile, /require\.resolve\(p\)/);
  for (const runtimeToolPath of [
    "/usr/local/lib/node_modules/npm",
    "/usr/local/lib/node_modules/corepack",
    "/opt/yarn-*",
    "/usr/local/bin/npm",
    "/usr/local/bin/npx",
    "/usr/local/bin/corepack",
    "/usr/local/bin/yarn",
    "/usr/local/bin/yarnpkg",
    "/usr/local/bin/pnpm",
    "/usr/local/bin/pnpx",
  ]) {
    assert.equal(
      dockerfile.includes(runtimeToolPath),
      true,
      `final runtime cleanup must remove ${runtimeToolPath}`,
    );
  }
  assert.match(dockerfile, /\nUSER node\n/);
  assert.equal(
    existsSync(path.join(repositoryRoot, "Dockerfile.debug")),
    false,
    "the obsolete root diagnostic Dockerfile must not return",
  );

  for (const service of backendServices) {
    assert.equal(
      existsSync(path.join(repositoryRoot, service.directory, "Dockerfile")),
      false,
      `${service.name} must use docker/backend.Dockerfile`,
    );
    const runtimeName = `${service.name.replace(/-service$/, "")}-runtime`;
    assert.match(dockerfile, new RegExp(`AS ${runtimeName}\\b`));
    const exposedPorts =
      service.grpcPort === undefined
        ? `${service.httpPort}`
        : `${service.httpPort} ${service.grpcPort}`;
    assert.match(dockerfile, new RegExp(`EXPOSE ${exposedPorts}`));
    assert.match(
      dockerfile,
      new RegExp(`http://localhost:${service.httpPort}/health/ready`),
    );

    const serviceExample = envValues(
      source(`${service.directory}/.env.example`),
    );
    if (service.transport === "http-grpc") {
      const main = source(`${service.directory}/src/main.ts`);
      assert.match(main, new RegExp(`defaultHttpPort:\\s*${service.httpPort}`));
      assert.match(main, new RegExp(`defaultGrpcPort:\\s*${service.grpcPort}`));
      assert.equal(serviceExample.get("PORT"), String(service.httpPort));
      assert.equal(serviceExample.get("GRPC_PORT"), String(service.grpcPort));

      const prefix = service.name
        .replace(/-service$/, "")
        .replaceAll("-", "_")
        .toUpperCase();
      assert.equal(
        rootExample.get(`${prefix}_HTTP_PORT`),
        String(service.httpPort),
      );
      assert.equal(releaseExample.has(`${prefix}_HTTP_PORT`), false);
      assert.equal(releaseExample.has(`${prefix}_GRPC_PORT`), false);
    } else {
      const prefix = service.name
        .replace(/-service$/, "")
        .replaceAll("-", "_")
        .toUpperCase();
      assert.equal(
        serviceExample.get(`${prefix}_HTTP_PORT`),
        String(service.httpPort),
      );
      assert.equal(
        rootExample.get(`${prefix}_HTTP_PORT`),
        String(service.httpPort),
      );
      if (service.name === "gateway") {
        assert.equal(
          releaseExample.get("GATEWAY_HTTP_PORT"),
          String(service.httpPort),
        );
      } else {
        assert.equal(releaseExample.has(`${prefix}_HTTP_PORT`), false);
      }
      assert.equal(serviceExample.has("GRPC_PORT"), false);
    }

    const localBlock = serviceBlock(localCompose, service.dockerService);
    const releaseBlock = serviceBlock(releaseCompose, service.dockerService);
    assert.match(
      localBlock,
      new RegExp(`BACKEND_BUILD_SERVICE: ${service.name}\\s`),
      `${service.name} must select its own application compilation`,
    );
    assert.match(localBlock, new RegExp(`-${service.dockerService}:`));
    assert.match(releaseBlock, new RegExp(`-${service.dockerService}:`));
    assert.match(localBlock, new RegExp(`:${service.httpPort}["']`));
    if (service.grpcPort !== undefined) {
      assert.match(localBlock, new RegExp(`:${service.grpcPort}["']`));
      assert.doesNotMatch(releaseBlock, /^ {4}ports:/m);
    } else if (service.name === "gateway") {
      assert.match(releaseBlock, /GATEWAY_HOST_PORT:-3002}:3002/);
    } else {
      assert.doesNotMatch(releaseBlock, /^ {4}ports:/m);
    }

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
      if (composeServices.some((entry) => entry.dockerService === dependency)) {
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
    assert.match(
      serviceBlock(compose, "tenant-authority-db-init"),
      /ensure-tenant-authority-db\.sh/,
    );
    assert.equal(
      serviceDependencies(compose, "tenant-authority-service")[
        "tenant-authority-db-init"
      ],
      "service_completed_successfully",
    );
    assert.equal(
      serviceDependencies(compose, "media-service")["media-scanner"],
      "service_started",
      "scanner outage must pause processing without blocking approved delivery startup",
    );
    const mediaBlock = serviceBlock(compose, "media-service");
    const withoutScannerStartup = compose.replace(
      mediaBlock,
      mediaBlock.replace(
        / {6}media-scanner:\r?\n {8}condition: service_started\r?\n/,
        "",
      ),
    );
    assert.doesNotMatch(withoutScannerStartup, /condition:\s*service_started/);
  }

  const authorityProvisioner = source(
    "scripts/db/ensure-tenant-authority-db.sh",
  );
  assert.match(authorityProvisioner, /CREATE DATABASE nebula_authority/);
  assert.match(authorityProvisioner, /CREATE ROLE nebula_authority_runtime/);
  assert.match(authorityProvisioner, /REVOKE CREATE ON SCHEMA public/);
  assert.match(
    authorityProvisioner,
    /GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public/,
  );
  assert.match(
    authorityProvisioner,
    /REVOKE DELETE ON ALL TABLES IN SCHEMA public/,
  );
  assert.match(
    authorityProvisioner,
    /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE DELETE ON TABLES/,
  );
  assert.doesNotMatch(
    authorityProvisioner,
    /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES/,
  );
  assert.match(
    authorityProvisioner,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\._prisma_migrations/,
  );
  assert.doesNotMatch(authorityProvisioner, /DROP (?:DATABASE|ROLE)/);

  const realmAuthProvisioner = source("scripts/db/ensure-realm-auth-dbs.sh");
  for (const value of [
    "nebula_realm_auth_default",
    "nebula_realm_auth_operator",
    "nebula_realm_auth_default_runtime",
    "nebula_realm_auth_operator_runtime",
  ]) {
    assert.match(realmAuthProvisioner, new RegExp(value));
  }
  assert.match(
    realmAuthProvisioner,
    /GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public/,
  );
  assert.match(
    realmAuthProvisioner,
    /REVOKE DELETE ON ALL TABLES IN SCHEMA public/,
  );
  assert.doesNotMatch(realmAuthProvisioner, /DROP (?:DATABASE|ROLE)/);

  for (const compose of [localCompose, releaseCompose]) {
    const defaultRealmAuth = serviceBlock(compose, "realm-auth-service");
    const operatorRealmAuth = serviceBlock(
      compose,
      "operator-realm-auth-service",
    );
    const defaultRedis = serviceBlock(compose, "realm-auth-default-redis");
    const operatorRedis = serviceBlock(compose, "realm-auth-operator-redis");
    assert.match(defaultRealmAuth, /REALM_AUTH_DEPLOYMENT:\s*DEFAULT/);
    assert.match(operatorRealmAuth, /REALM_AUTH_DEPLOYMENT:\s*OPERATOR/);
    assert.match(defaultRealmAuth, /nebula_realm_auth_default/);
    assert.doesNotMatch(defaultRealmAuth, /nebula_realm_auth_operator/);
    assert.match(operatorRealmAuth, /nebula_realm_auth_operator/);
    assert.doesNotMatch(operatorRealmAuth, /nebula_realm_auth_default/);
    assert.match(defaultRealmAuth, /realm-auth-default-redis/);
    assert.doesNotMatch(defaultRealmAuth, /realm-auth-operator-redis/);
    assert.match(operatorRealmAuth, /realm-auth-operator-redis/);
    assert.doesNotMatch(operatorRealmAuth, /realm-auth-default-redis/);
    assert.match(defaultRedis, /redis:7-alpine/);
    assert.match(operatorRedis, /redis:7-alpine/);
    assert.match(operatorRedis, /profiles:\s*\["r3-shadow"\]/);
    assert.match(operatorRealmAuth, /profiles:\s*\["r3-shadow"\]/);
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
    source("scripts/docker/verify-runtime-imports.mjs"),
    /env\.validation\.js/,
  );
  assert.match(
    source("scripts/docker/save-release-images.ps1"),
    /\$repoRoot\s*=\s*Resolve-Path[\s\S]*Join-Path \$repoRoot "scripts\\docker\\release-image-inventory\.mjs"/,
  );
  assert.match(
    source("scripts/docker/save-release-images.ps1"),
    /SupportsShouldProcess\s*=\s*\$true[\s\S]*\$PSCmdlet\.ShouldProcess/,
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
      verifyProduct: manifest.scripts["db:verify:product"],
      verifyOrder: manifest.scripts["db:verify:order"],
      verifyTenantAuthority: manifest.scripts["db:verify:tenant-authority"],
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
      composeEvidence: manifest.scripts["evidence:compose:backend"],
      failureEvidence: manifest.scripts["evidence:failure:backend"],
      sharedTests: manifest.scripts["test:shared:backend"],
      gatewayTests: manifest.scripts["test:gateway:backend"],
      tenantAuthorityTests: manifest.scripts["test:tenant-authority:backend"],
      externalClientTests: manifest.scripts["test:external-client"],
      currentWebTests: manifest.scripts["test:web:current"],
      f3LiveTests: manifest.scripts["test:f3:live"],
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
      verifyProduct:
        "node ./scripts/backend.mjs database verify-migrations product",
      verifyOrder:
        "node ./scripts/backend.mjs database verify-migrations order",
      verifyTenantAuthority:
        "node ./scripts/backend.mjs database verify-migrations tenant-authority",
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
      composeEvidence: "node ./scripts/backend.mjs evidence compose",
      failureEvidence: "node ./scripts/backend.mjs evidence failure",
      sharedTests:
        "pnpm --filter @packages/config test && pnpm --filter @nebula/migration-artifacts test && pnpm --filter @nebula/grpc-auth test && pnpm --filter @nebula/clients test",
      gatewayTests:
        "pnpm --filter @nebula/gateway test && pnpm --filter @nebula/gateway openapi:check",
      tenantAuthorityTests:
        "pnpm --filter @nebula/tenant-authority-service test",
      externalClientTests:
        "pnpm --filter @nebula/gateway openapi:check && pnpm --filter @nebula/api-client generate:check && pnpm --filter @nebula/api-client lint && pnpm --filter @nebula/api-client check-types && pnpm --filter @nebula/api-client test",
      currentWebTests: "pnpm --filter web test",
      f3LiveTests: "pnpm --filter @nebula/api-client test:live",
      e2e: "pnpm build:backend && pnpm -r --workspace-concurrency=1 --filter=./apps/* --if-present run test:e2e",
    },
  );
  assert.equal(
    manifest.scripts["dev:backend"],
    "node ./scripts/backend.mjs dev",
  );
  assert.equal(manifest.dependencies.concurrently, undefined);
  assert.equal(manifest.dependencies["wait-on"], undefined);
  assert.equal(manifest.devDependencies.concurrently, "^9.2.1");
  assert.equal(manifest.devDependencies["wait-on"], "^9.0.3");
});

test("R3 Realm Auth commands stay on the consolidated backend tool", () => {
  const root = JSON.parse(source("package.json"));
  assert.equal(
    root.scripts["db:verify:f4-r3-realm-auth-foundation"],
    "node ./scripts/backend.mjs database verify-f4-r3-realm-auth-foundation",
  );
  assert.equal(
    root.scripts["db:verify:f4-r3-shadow-import"],
    "node ./scripts/backend.mjs database verify-f4-r3-shadow-import",
  );
});

test("R4 staged administrator proof stays on the consolidated backend tool", () => {
  const root = JSON.parse(source("package.json"));
  assert.equal(
    root.scripts["db:verify:f4-r4-admin-split-staged"],
    "node ./scripts/backend.mjs database verify-f4-r4-admin-split-staged",
  );
});

test("CI retains only allowlisted backend evidence for fourteen days", () => {
  const workflow = source(".github/workflows/ci.yml");
  assert.match(workflow, /run: pnpm test:shared:backend/);
  assert.match(workflow, /run: pnpm test:backend-tooling/);
  assert.match(workflow, /run: pnpm test:gateway:backend/);
  assert.match(workflow, /run: pnpm test:tenant-authority:backend/);
  assert.match(workflow, /run: pnpm test:external-client/);
  assert.match(workflow, /run: pnpm test:web:current/);
  assert.match(workflow, /run: pnpm test:f3:live/);
  const uploadAction =
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a";
  assert.equal(workflow.split(uploadAction).length - 1, 2);
  assert.equal(workflow.split("retention-days: 14").length - 1, 2);
  assert.match(workflow, /name: backend-quality-evidence/);
  assert.match(workflow, /name: backend-live-evidence/);
  assert.match(workflow, /run: pnpm evidence:compose:backend/);
  assert.match(workflow, /run: pnpm evidence:failure:backend/);
  assert.equal(workflow.split("run: git diff --exit-code").length - 1, 2);
  assert.match(
    workflow,
    /name: Verify live checks leave tracked files unchanged\r?\n\s+if: always\(\)\r?\n\s+run: git diff --exit-code/,
  );
  assert.doesNotMatch(workflow, /run:\s*docker compose logs/);

  const retainedPaths = [
    ...workflow.matchAll(/ {10}path: \|\r?\n((?: {12}.+\r?\n)+)/g),
  ]
    .flatMap((match) => match[1].trim().split(/\r?\n/))
    .map((entry) => entry.trim());
  assert.deepEqual(retainedPaths, [
    ".security-reports/backend-dependencies.json",
    ".security-reports/backend-source.json",
    ".ci-evidence/compose-local.yaml",
    ".ci-evidence/compose-release.yaml",
    ".security-reports/nebulanv-main-*.json",
    ".ci-evidence/backend-tested-images.json",
    ".ci-evidence/compose-state.jsonl",
    ".ci-evidence/compose-logs.txt",
  ]);
});

test("CI caches preserve quality gates, bounded writers and isolated image scopes", () => {
  const require = createRequire(import.meta.url);
  const eslintRequire = createRequire(require.resolve("eslint/package.json"));
  const workflow = eslintRequire("js-yaml").load(
    source(".github/workflows/ci.yml"),
  );
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  const quality = workflow.jobs.quality;
  const live = workflow.jobs["live-e2e"];
  assert.equal(live.needs, "quality");
  const liveTypes = quality.steps.findIndex(
    (step) => step.name === "Check live test types before provisioning",
  );
  assert.ok(
    liveTypes >
      quality.steps.findIndex((step) => step.name === "Check backend types"),
  );
  assert.ok(
    liveTypes <
      quality.steps.findIndex(
        (step) => step.name === "Run focused container-free security tests",
      ),
  );
  assert.equal(
    quality.steps[liveTypes].run,
    "node scripts/check-backend-test-types.mjs",
  );
  const cacheSha = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
  for (const job of [quality, live]) {
    const restore = job.steps.find((step) => step.id === "host-turbo");
    assert.equal(restore.uses, `actions/cache/restore@${cacheSha}`);
    assert.equal(restore.with.path, ".turbo/cache");
    assert.match(restore.with.key, /runner\.os/);
    assert.match(restore.with.key, /runner\.arch/);
    assert.match(
      restore.with.key,
      /hashFiles\('pnpm-lock\.yaml', 'turbo\.json'\)/,
    );
    assert.match(restore.with.key, /github\.sha/);
    assert.ok(!restore.with["restore-keys"].includes("github.sha"));
  }
  const budget = quality.steps.find((step) => step.id === "turbo-budget");
  assert.match(budget.if, /github\.event_name == 'push'/);
  assert.match(budget.if, /github\.ref == 'refs\/heads\/main'/);
  assert.match(budget.if, /cache-hit != 'true'/);
  assert.match(budget.run, /-le 1073741824/);
  assert.match(budget.run, /du -sb \.turbo\/cache/);
  const save = quality.steps.find(
    (step) => step.uses === `actions/cache/save@${cacheSha}`,
  );
  assert.equal(save.with.path, ".turbo/cache");
  assert.match(save.if, /success\(\)/);
  assert.match(save.if, /turbo-budget\.outputs\.save == 'true'/);
  const indexOf = (job, name) =>
    job.steps.findIndex((step) => step.name === name);
  assert.ok(
    indexOf(quality, "Verify checks leave tracked files unchanged") <
      quality.steps.indexOf(save),
  );
  assert.equal(
    live.steps.some((step) => step.uses === save.uses),
    false,
  );
  assert.equal(quality.env?.BUILDX_BAKE_FILE, undefined);
  assert.equal(
    live.env.BUILDX_BAKE_FILE,
    "docker-compose.yml:docker-bake.hcl:.github/backend-cache.hcl",
  );
  assert.equal(
    live.env.COMPOSE_FILE,
    "docker-compose.yml:.github/minio-offline.yml",
  );
  const vendorCache = live.steps.find(
    (step) => step.name === "Load checksum-pinned MinIO vendor cache",
  );
  assert.equal(vendorCache.shell, "bash");
  assert.equal(vendorCache.env.GH_TOKEN, "${{ github.token }}");
  assert.match(
    vendorCache.run,
    /gh release download vendor-minio-20250907 --repo pain1122\/nebulaNV/,
  );
  assert.match(
    vendorCache.run,
    /e1d3d52e52abddeec06867839e0b239e50ddd48e1ad49313a309ce6da9ce3a6b/,
  );
  assert.ok(
    vendorCache.run.indexOf("hash.digest") < vendorCache.run.indexOf("'load'"),
  );
  assert.match(vendorCache.run, /minio_vendor_identity_mismatch/);
  assert.ok(
    live.steps.indexOf(vendorCache) <
      indexOf(live, "Provision live integration services"),
  );
  const offline = eslintRequire("js-yaml").load(
    source(".github/minio-offline.yml"),
  );
  assert.deepEqual(offline, {
    services: {
      minio: { pull_policy: "never" },
      "minio-init": { pull_policy: "never" },
    },
  });
  assert.match(
    live.env.NEBULA_CI_CACHE_WRITE,
    /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
  );
  const builder = live.steps.find((step) =>
    step.uses?.startsWith("docker/setup-buildx-action@"),
  );
  assert.equal(
    builder.uses,
    "docker/setup-buildx-action@37fe631027851001ddb9b187196cc803df7f5f0e",
  );
  assert.equal(builder.with.driver, "docker-container");
  assert.equal(builder.with.version, "v0.28.0");
  assert.equal(builder.with.cleanup, true);
  assert.match(
    builder.with["driver-opts"],
    /moby\/buildkit:v0\.24\.0@sha256:[a-f0-9]{64}$/,
  );
  const runtime = live.steps.find((step) =>
    step.uses?.startsWith("actions/github-script@"),
  );
  assert.equal(
    runtime.uses,
    "actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd",
  );
  assert.match(
    runtime.with.script,
    /\['ACTIONS_RUNTIME_TOKEN', 'ACTIONS_RESULTS_URL'\]/,
  );
  assert.match(runtime.with.script, /core\.setSecret\(value\)/);
  assert.doesNotMatch(runtime.with.script, /console\.|core\.(info|debug)/);
  const exposed = [];
  const masked = [];
  new Function("core", "process", runtime.with.script)(
    {
      setSecret: (value) => masked.push(value),
      exportVariable: (name, value) => exposed.push([name, value]),
    },
    {
      env: {
        ACTIONS_RUNTIME_TOKEN: "cache-token-fixture",
        ACTIONS_RESULTS_URL: "https://cache.example/",
        UNRELATED_SECRET: "excluded",
      },
    },
  );
  assert.deepEqual(masked, ["cache-token-fixture"]);
  assert.deepEqual(exposed, [
    ["ACTIONS_RUNTIME_TOKEN", "cache-token-fixture"],
    ["ACTIONS_RESULTS_URL", "https://cache.example/"],
  ]);
  assert.throws(
    () => new Function("core", "process", runtime.with.script)({}, { env: {} }),
    /Missing cache runtime field/,
  );
  assert.ok(
    live.steps.indexOf(builder) <
      indexOf(live, "Provision live integration services"),
  );
  assert.ok(
    live.steps.indexOf(runtime) <
      indexOf(live, "Provision live integration services"),
  );
  assert.ok(
    indexOf(live, "Scan the tested backend images") <
      indexOf(live, "Record tested backend image identities"),
  );
  const roundtrip = live.steps.find(
    (step) =>
      step.name ===
      "Verify complete release archive round trip without a temporary tar",
  );
  assert.equal(roundtrip.shell, "bash");
  assert.match(roundtrip.run, /set -euo pipefail/);
  assert.match(
    roundtrip.run,
    /docker image save "\$\{release_images\[@\]\}" \| docker image load/,
  );
  assert.match(
    roundtrip.run,
    /cmp .*release-image-ids-before\.txt.*release-image-ids-after\.txt/,
  );
  assert.ok(
    indexOf(live, "Scan the tested backend images") <
      live.steps.indexOf(roundtrip),
  );
  assert.ok(
    live.steps.indexOf(roundtrip) <
      indexOf(live, "Record tested backend image identities"),
  );
  assert.equal(
    live.steps.find(
      (step) =>
        step.name ===
        "Verify historical Product metadata upgrade with current migration tails",
    ).run,
    "pnpm db:verify:product:metadata:upgrade",
  );
  assert.equal(
    live.steps.find(
      (step) => step.name === "Record tested backend image identities",
    ).run,
    "node scripts/docker/record-image-identities.mjs",
  );
  const overlay = source(".github/backend-cache.hcl");
  assert.deepEqual(
    [...overlay.matchAll(/^target "([\w-]+)"/gm)].map((match) => match[1]),
    backendServices.map((service) => service.dockerService),
  );
  assert.match(overlay, /default = false/);
  assert.match(overlay, /NEBULA_CI_CACHE_WRITE \?/);
  assert.match(overlay, /scope=nebula-backend-graph-v1-\$\{service\}/);
  assert.match(overlay, /version=2/);
  assert.match(overlay, /mode=max/);
  assert.match(overlay, /ignore-error=true/);
  assert.doesNotMatch(overlay, /token=|url_v2=|secret|\bargs\s*=/);
});

test("tested-image evidence records the complete inventory without inspect secrets", () => {
  const calls = [];
  const evidence = collectImageIdentities({
    commit: "a".repeat(40),
    inspect(reference) {
      calls.push(reference);
      return {
        Id: `sha256:${"b".repeat(64)}`,
        RepoDigests: [],
        Config: {
          Env: ["SECRET=must-not-retain"],
          Labels: { secret: "must-not-retain" },
        },
      };
    },
  });
  assert.deepEqual(calls, releaseImages());
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.commit, "a".repeat(40));
  assert.deepEqual(
    evidence.images.map((image) => image.name),
    backendServices.map((service) => service.name),
  );
  assert.deepEqual(Object.keys(evidence.images[0]).sort(), [
    "id",
    "name",
    "reference",
    "repoDigests",
  ]);
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /SECRET|Config|Labels|must-not-retain/,
  );
  assert.throws(
    () => collectImageIdentities({ commit: null, inspect: () => undefined }),
    /nebulanv-main-user-service/,
  );
  assert.throws(
    () =>
      collectImageIdentities({
        commit: null,
        inspect: () => {
          throw new Error("image_missing");
        },
      }),
    /image_missing/,
  );
  assert.throws(
    () =>
      collectImageIdentities({
        commit: null,
        inspect: () => ({
          Id: `sha256:${"b".repeat(64)}`,
          RepoDigests: ["invalid"],
        }),
      }),
    /invalid repository digests/,
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

test("dependency report rejects failed or malformed audits before reporting success", () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-audit-failure-"));
  try {
    for (const audit of [
      { error: { code: "ECONNRESET" } },
      {},
      null,
      { advisories: {}, metadata: {} },
      { advisories: [], metadata: { vulnerabilities: {} } },
      {
        error: { code: "E503" },
        advisories: {},
        metadata: { vulnerabilities: {} },
      },
    ]) {
      assert.throws(
        () =>
          generateBackendDependencyReport({
            execute(args) {
              assert.equal(
                args[0],
                "audit",
                "invalid audits must stop before inventory reads",
              );
              return { status: 1, stdout: JSON.stringify(audit) };
            },
            logger: {
              log() {
                assert.fail("invalid audits must not log a pass");
              },
            },
            outputDirectory: temporary,
          }),
        /backend_dependency_audit_invalid_response/,
      );
      assert.equal(
        existsSync(path.join(temporary, "backend-dependencies.json")),
        false,
      );
    }
    const report = generateBackendDependencyReport({
      execute: () => ({
        status: 0,
        stdout: JSON.stringify({
          advisories: {},
          metadata: { vulnerabilities: {} },
        }),
      }),
      services: [],
      logger: { log() {} },
      outputDirectory: temporary,
    });
    assert.equal(
      report.summary.highCritical,
      0,
      "a valid empty audit remains supported",
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

  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-source-scan-"));
  const calls = [];
  try {
    runBackendSourceScan({
      execute(command, commandArgs) {
        calls.push({ command, commandArgs });
        const output = commandArgs[commandArgs.indexOf("--output") + 1];
        writeFileSync(
          output,
          JSON.stringify({
            SchemaVersion: 2,
            ArtifactName: ".",
            ArtifactType: "filesystem",
            Results: [],
          }),
        );
        return { status: 0 };
      },
      logger: { log() {} },
      outputDirectory: temporary,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "trivy");
    assert.equal(existsSync(path.join(temporary, "backend-source.json")), true);
    assert.equal(
      existsSync(path.join(temporary, "backend-source.trivy-raw")),
      false,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("retained Trivy evidence strips raw secret and image metadata", () => {
  const evidence = createTrivyEvidenceReport({
    SchemaVersion: 2,
    ArtifactName: ".",
    ArtifactType: "filesystem",
    Metadata: { ImageConfig: { config: { Env: ["TOKEN=raw-secret"] } } },
    Results: [
      {
        Target: "config.yml",
        Class: "secret",
        Type: "secret",
        Secrets: [
          {
            RuleID: "example-token",
            Category: "general",
            Severity: "HIGH",
            Title: "Example token",
            StartLine: 4,
            EndLine: 4,
            Match: "raw-secret",
            Code: { Lines: [{ Content: "token=raw-secret" }] },
          },
        ],
        Misconfigurations: [
          {
            ID: "DS-0002",
            Severity: "HIGH",
            Title: "Non-root user required",
            Message: "raw-secret",
          },
        ],
      },
    ],
  });
  const serialized = JSON.stringify(evidence);

  assert.doesNotMatch(serialized, /raw-secret|ImageConfig|Match|Code|Message/);
  assert.equal(evidence.results[0].secrets[0].RuleID, "example-token");
  assert.equal(evidence.results[0].misconfigurations[0].ID, "DS-0002");
});

test("Trivy image scans reuse every inventory image and collect failures", () => {
  const services = backendServices.slice(0, 3);
  const args = buildTrivyImageArgs(services[0].defaultImage, "image.json");
  assert.equal(args[0], "image");
  assert.equal(args.includes("--ignore-unfixed"), false);
  assert.equal(args[args.indexOf("--exit-code") + 1], "0");
  assert.equal(args.at(-1), services[0].defaultImage);
  assert.deepEqual(
    args.flatMap((arg, index) =>
      arg === "--db-repository" ? [args[index + 1]] : [],
    ),
    TRIVY_DB_REPOSITORIES,
  );

  const calls = [];
  assert.throws(
    () =>
      runBackendImageScans({
        services,
        execute(command, commandArgs) {
          calls.push({ command, commandArgs });
          const isScan = commandArgs[0] === "image";
          if (isScan) {
            const output = commandArgs[commandArgs.indexOf("--output") + 1];
            const isBlocked = commandArgs.at(-1) === services[1].defaultImage;
            writeFileSync(
              output,
              JSON.stringify({
                SchemaVersion: 2,
                ArtifactName: commandArgs.at(-1),
                ArtifactType: "container_image",
                Results: isBlocked
                  ? [
                      {
                        Target: "node_modules",
                        Class: "lang-pkgs",
                        Type: "node-pkg",
                        Vulnerabilities: [
                          {
                            VulnerabilityID: "CVE-TEST",
                            PkgName: "example",
                            Severity: "HIGH",
                          },
                        ],
                      },
                    ]
                  : [],
              }),
            );
          }
          return { status: 0 };
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

test("Trivy scanner failures block while the remaining images are still scanned", () => {
  const services = backendServices.slice(0, 2);
  const temporary = mkdtempSync(path.join(tmpdir(), "nebula-image-scan-"));
  const scannedImages = [];

  try {
    assert.throws(
      () =>
        runBackendImageScans({
          services,
          execute(_command, commandArgs) {
            if (commandArgs[0] === "image") {
              const image = commandArgs.at(-1);
              scannedImages.push(image);
              if (image === services[0].defaultImage) return { status: 2 };

              const output = commandArgs[commandArgs.indexOf("--output") + 1];
              writeFileSync(
                output,
                JSON.stringify({
                  SchemaVersion: 2,
                  ArtifactName: image,
                  ArtifactType: "container_image",
                  Results: [],
                }),
              );
            }
            return { status: 0 };
          },
          logger: { log() {} },
          outputDirectory: temporary,
        }),
      /backend_image_gate_failed_user-service/,
    );
    assert.deepEqual(
      scannedImages,
      services.map((service) => service.defaultImage),
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("Trivy image policy defers only Debian findings without a fix", () => {
  const summary = summarizeTrivyImageVulnerabilities({
    results: [
      {
        Class: "os-pkgs",
        Type: "debian",
        vulnerabilities: [
          { Severity: "CRITICAL" },
          { Severity: "HIGH", FixedVersion: "1.2.3" },
        ],
      },
      {
        Class: "lang-pkgs",
        Type: "node-pkg",
        vulnerabilities: [
          { Severity: "HIGH" },
          { Severity: "CRITICAL", FixedVersion: "4.5.6" },
        ],
      },
    ],
  });

  assert.deepEqual(summary, {
    total: 4,
    blocking: 3,
    deferredUnfixedDebian: 1,
  });
});

test("Compose evidence is non-interpolated and sanitized", () => {
  const temporary = mkdtempSync(
    path.join(tmpdir(), "nebula-compose-evidence-"),
  );
  const env = {
    ...process.env,
    JWT_SECRET: "compose-secret-value",
  };
  const calls = [];
  const validated = [];

  try {
    captureComposeConfigurations({
      env,
      execute(command, args) {
        calls.push({ command, args });
        return {
          status: 0,
          stdout:
            "DATABASE_URL=postgresql://admin:password@db:5432/app\nJWT_SECRET=compose-secret-value\n",
          stderr: "",
        };
      },
      validateConfiguration(label) {
        validated.push(label);
      },
      outputDirectory: temporary,
      platform: "linux",
    });

    assert.equal(calls.length, 4);
    assert.equal(
      calls.every((call) => call.command === "docker"),
      true,
    );
    assert.equal(
      calls
        .filter((_call, index) => index % 2 === 0)
        .every((call) => call.args.includes("--no-interpolate")),
      true,
    );
    assert.equal(
      calls
        .filter((_call, index) => index % 2 === 1)
        .every((call) => call.args.includes("--format")),
      true,
    );
    assert.equal(calls[2].args.includes("docker-compose.release.yml"), true);
    assert.deepEqual(validated, ["local", "release"]);
    for (const output of ["compose-local.yaml", "compose-release.yaml"]) {
      const contents = readFileSync(path.join(temporary, output), "utf8");
      assert.doesNotMatch(contents, /password|compose-secret-value/);
      assert.match(contents, /\[REDACTED\]/);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("local Compose keeps the internal Media origin separate from native examples", () => {
  const require = createRequire(import.meta.url);
  const yaml = createRequire(require.resolve("eslint/package.json"))("js-yaml");
  const local = yaml.load(source("docker-compose.yml"));
  assert.equal(
    local.services.gateway.environment.MEDIA_RENDER_HTTP_URL,
    "http://media-service:3007",
    "container routing must not interpolate a native-host loopback origin",
  );
  for (const example of [".env.example", "apps/gateway/.env.example"]) {
    assert.equal(
      envValues(source(example)).get("MEDIA_RENDER_HTTP_URL"),
      "http://127.0.0.1:3007",
    );
  }
});

test("rendered Compose boundary permits only the selected release data plane", () => {
  assert.doesNotThrow(() =>
    validateRenderedComposeBoundary("local", renderedBoundaryFixture("local")),
  );
  assert.doesNotThrow(() =>
    validateRenderedComposeBoundary(
      "release",
      renderedBoundaryFixture("release"),
    ),
  );

  const leakedBackend = renderedBoundaryFixture("release");
  leakedBackend.services["product-service"].ports = [{ target: 3003 }];
  assert.throws(
    () => validateRenderedComposeBoundary("release", leakedBackend),
    /compose_boundary_release_product-service_ports_forbidden/,
  );

  for (const label of ["local", "release"]) {
    const wrongAuthorityName = renderedBoundaryFixture(label);
    const environment = wrongAuthorityName.services.gateway.environment;
    delete environment.TENANT_AUTHORITY_GRPC_URL;
    environment["TENANT-AUTHORITY_GRPC_URL"] = "tenant-authority-service:50059";
    assert.throws(
      () => validateRenderedComposeBoundary(label, wrongAuthorityName),
      new RegExp(
        `compose_boundary_${label}_gateway_TENANT_AUTHORITY_GRPC_URL_invalid`,
      ),
    );
    for (const [owner, dependency] of [
      ["auth-service", "media-scanner"],
      ["media-service", "postgres"],
    ]) {
      const wrongStartup = renderedBoundaryFixture(label);
      wrongStartup.services[owner].depends_on = {
        [dependency]: { condition: "service_started" },
      };
      assert.throws(
        () => validateRenderedComposeBoundary(label, wrongStartup),
        new RegExp(`compose_boundary_${label}_service_started_forbidden`),
      );
    }
  }

  const closedMedia = renderedBoundaryFixture("release");
  closedMedia.services["media-service"].environment.PUBLIC_MODE =
    "GATEWAY_ONLY";
  assert.throws(
    () => validateRenderedComposeBoundary("release", closedMedia),
    /compose_boundary_release_media-service_public_mode_invalid/,
  );
});

test("failure evidence keeps bounded Compose diagnostics and redacts secrets", () => {
  const temporary = mkdtempSync(
    path.join(tmpdir(), "nebula-failure-evidence-"),
  );
  const env = {
    ...process.env,
    SERVICE_TOKEN: "failure-secret-value",
  };
  const calls = [];

  try {
    captureComposeFailureEvidence({
      env,
      execute(command, args) {
        calls.push({ command, args });
        return {
          status: args.includes("logs") ? 7 : 0,
          stdout: `service output failure-secret-value\n`,
          stderr: "postgresql://admin:password@db:5432/app\n",
        };
      },
      logger: { log() {} },
      outputDirectory: temporary,
      platform: "linux",
    });

    const logCall = calls.find((call) => call.args.includes("logs"));
    assert.deepEqual(logCall.args.slice(-4), [
      "--no-color",
      "--timestamps",
      "--tail",
      "200",
    ]);
    for (const output of ["compose-state.jsonl", "compose-logs.txt"]) {
      const contents = readFileSync(path.join(temporary, output), "utf8");
      assert.doesNotMatch(contents, /password|failure-secret-value/);
      assert.match(contents, /\[REDACTED\]/);
    }
    assert.match(
      readFileSync(path.join(temporary, "compose-logs.txt"), "utf8"),
      /capture_exit=7/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("backend build selection validates the complete request before invoking Docker", () => {
  assert.deepEqual(parseBackendBuildOptions([]).services, backendServices);
  const selected = parseBackendBuildOptions([
    "order-service",
    "gateway",
    "--plan",
    "--pull",
  ]);
  assert.deepEqual(
    selected.services.map((service) => service.name),
    ["order-service", "gateway"],
  );
  assert.equal(selected.plan, true);
  assert.equal(selected.pull, true);
  assert.equal(selected.clean, false);
  assert.equal(parseBackendBuildOptions(["--clean"]).pull, true);
  for (const args of [
    ["unknown-service"],
    ["order-service", "--unknown"],
    ["order-service", "order-service"],
    ["--plan", "--plan"],
    [""],
  ]) {
    assert.throws(() => parseBackendBuildOptions(args), /backend_build_/);
  }
});

test("backend plan performs no execution and reports only requested targets", () => {
  const logs = [];
  buildBackendImages({
    ...parseBackendBuildOptions(["order-service", "gateway", "--plan"]),
    execute() {
      assert.fail("plan must not start Docker");
    },
    now() {
      assert.fail("plan must not start build timing");
    },
    logger: { log: (message) => logs.push(message) },
  });
  assert.equal(logs.filter((line) => line.includes("plan: docker")).length, 2);
  assert.match(
    logs.join("\n"),
    /order-service.args.BACKEND_BUILD_SERVICE=order-service,gateway/,
  );
  assert.match(
    logs.join("\n"),
    /gateway.args.BACKEND_BUILD_SERVICE=order-service,gateway/,
  );
  assert.doesNotMatch(logs.join("\n"), /bake product-service/);
  assert.match(logs.at(-1), /no build started/);
});

test("full inventory keeps a single shared compilation scope", () => {
  const calls = [];
  buildBackendImages({
    execute(command, args) {
      calls.push(args);
      return { status: 0 };
    },
    logger: { log() {} },
  });
  assert.equal(calls.length, backendServices.length);
  assert.ok(
    calls.every((args) =>
      args.some((arg) => arg.endsWith(".args.BACKEND_BUILD_SERVICE=all")),
    ),
  );
  assert.ok(
    calls.every((args) =>
      args.some((arg) => arg.endsWith(".args.BACKEND_BUILD_PIPELINE=graph")),
    ),
  );
});

test("batch compilation scope is canonical while image export order follows the request", () => {
  const orders = [
    ["product-service", "order-service", "gateway"],
    ["gateway", "order-service", "product-service"],
  ];
  for (const order of orders) {
    const calls = [];
    buildBackendImages({
      ...parseBackendBuildOptions(order),
      execute(command, args) {
        calls.push(args);
        return { status: 0 };
      },
      logger: { log() {} },
    });
    assert.deepEqual(
      calls.map((args) => args[2]),
      order,
    );
    for (const args of calls) {
      assert.ok(
        args.includes(
          `--set=${args[2]}.args.BACKEND_BUILD_SERVICE=product-service,order-service,gateway`,
        ),
      );
      assert.ok(
        args.includes(`--set=${args[2]}.args.BACKEND_BUILD_PIPELINE=graph`),
      );
    }
  }
});

test("operator profile selects Realm Auth without compiling the full backend", () => {
  assert.match(
    serviceBlock(source("docker-compose.yml"), "operator-realm-auth-service"),
    /BACKEND_BUILD_SERVICE: realm-auth-service\s/,
  );
  assert.match(
    serviceBlock(source("docker-compose.yml"), "operator-realm-auth-service"),
    /BACKEND_BUILD_PIPELINE: graph/,
  );
  assert.ok(
    source("docker/backend.Dockerfile").includes(
      'set -- "--filter=@nebula/${BACKEND_BUILD_SERVICE}";',
    ),
    "leaf task selection relies on ^build prerequisites without expanding root package dependencies",
  );
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
  for (const [index, call] of calls.entries()) {
    assert.ok(
      call.args.includes(
        `--set=${services[index].dockerService}.args.BACKEND_BUILD_SERVICE=${services.map((entry) => entry.name).join(",")}`,
      ),
    );
    assert.equal(call.args.includes("--no-cache"), false);
    assert.equal(
      call.args.some((arg) => arg.endsWith("TURBO_FORCE=1")),
      false,
    );
  }

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
  const logs = [];
  let tick = 0;
  buildBackendImages({
    services: services.slice(0, 1),
    execute: () => ({ status: 0 }),
    now: () => (tick++ === 0 ? 1000 : 3500),
    logger: { log: (message) => logs.push(message) },
  });
  assert.ok(logs.some((line) => line.includes("elapsed=2.5s exit=0")));
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

  assert.deepEqual(events.slice(0, 4), [
    "environment",
    "docker:compose up -d --wait --wait-timeout 120 postgres redis realm-auth-default-redis minio",
    "docker:compose run -T --rm --no-deps tenant-authority-db-init",
    "docker:compose run -T --rm --no-deps realm-auth-db-init",
  ]);
  assert.equal(events[4], "databases");
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
    composeServices.map((service) => `health:${service.name}`),
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
          return { status: calls.length === 4 ? 7 : 0 };
        },
        logger: { log: (message) => logs.push(message) },
      }),
    /settings-service_nebula_settings_failed_exit_7/,
  );

  assert.deepEqual(calls, [
    "@nebula/user-service",
    "@nebula/realm-auth-service",
    "@nebula/tenant-authority-service",
    "@nebula/settings-service",
  ]);
  assert.equal(logs.length, 4);
  assert.match(logs[3], /settings-service \(nebula_settings\)/);

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

test("Docker migration commands pin selected Order and Product targets instead of inherited host URLs", () => {
  const env = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://ignored:wrong@localhost:5432/other",
    SHADOW_DATABASE_URL:
      "postgresql://ignored:wrong@localhost:5432/other_shadow",
    KEEP_SETTING: "retained",
  };
  const calls = [];
  for (const scope of ["order", "product"])
    for (const operation of ["migrate-deploy", "migrate-status"])
      runLocalDatabaseMigration(operation, scope, {
        env,
        logger: { log() {} },
        execute(args, options) {
          calls.push({ args, env: options.env, scope });
          return { status: 0 };
        },
      });
  assert.equal(calls.length, 4);
  for (const call of calls) {
    const database =
      call.scope === "order" ? "nebula_order" : "nebula_products";
    assert.equal(call.args[1], `@nebula/${call.scope}-service`);
    assert.equal(
      call.env.DATABASE_URL,
      `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
    );
    assert.equal(
      call.env.SHADOW_DATABASE_URL,
      `postgresql://postgres:postgres@127.0.0.1:15432/postgres?schema=${database}_shadow`,
    );
    assert.equal(call.env.KEEP_SETTING, "retained");
  }
  assert.match(env.DATABASE_URL, /localhost:5432\/other$/);
});

test("Docker migration commands reject unsafe operations, missing/unknown scopes and production before execution", async () => {
  let calls = 0;
  const options = {
    env: {},
    logger: { log() {} },
    execute() {
      calls++;
      return { status: 0 };
    },
  };
  assert.throws(
    () => runLocalDatabaseMigration("push", "order", options),
    /operation_invalid/,
  );
  assert.throws(
    () => runLocalDatabaseMigration("migrate-deploy", undefined, options),
    /scope_required/,
  );
  assert.throws(
    () => runLocalDatabaseMigration("migrate-deploy", "all", options),
    /scope_invalid/,
  );
  assert.throws(
    () =>
      runLocalDatabaseMigration("migrate-deploy", "order", {
        ...options,
        env: { NODE_ENV: "production" },
      }),
    /requires_nonproduction/,
  );
  await assert.rejects(main(["database", "migrate-deploy"]), /scope_required/);
  assert.equal(calls, 0);
});

test("Docker migration commands preserve first execution failure", () => {
  assert.throws(
    () =>
      runLocalDatabaseMigration("migrate-deploy", "order", {
        env: {},
        logger: { log() {} },
        execute() {
          return { status: 7 };
        },
      }),
    /prisma_migrate-deploy_order-service_nebula_order_failed_exit_7/,
  );
});

test("clean migration verification uses disposable databases and always cleans up", () => {
  const dockerCalls = [];
  const prismaCalls = [];
  const services = prismaServices.filter((service) =>
    ["@nebula/user-service", "@nebula/tenant-authority-service"].includes(
      service.packageName,
    ),
  );
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
      args.includes("deploy")
        ? "migrate-deploy"
        : args.includes("db:seed")
          ? "seed"
          : "migrate-status",
    ),
    [
      "migrate-deploy",
      "migrate-status",
      "migrate-deploy",
      "migrate-status",
      "seed",
      "seed",
    ],
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
  const authorityEvidence = dockerCalls.find(
    (call) =>
      call.args.includes("psql") &&
      call.args.some((arg) =>
        String(arg).includes(
          "authority_registration_evidence_requires_empty_database",
        ),
      ),
  );
  assert.notEqual(authorityEvidence, undefined);
  assert.equal(
    authorityEvidence.args[authorityEvidence.args.indexOf("--dbname") + 1],
    expected.find(
      (service) => service.packageName === "@nebula/tenant-authority-service",
    ).database,
  );
  const seedEvidence = dockerCalls.find(
    (call) =>
      call.args.includes("psql") &&
      call.args.some((arg) =>
        String(arg).includes("authority_default_seed_rerun_not_idempotent"),
      ),
  );
  assert.notEqual(seedEvidence, undefined);
});

test("Media migration verification runs SQL and job proofs only in a disposable database", () => {
  assert.deepEqual(
    migrationVerificationServices("media").map(
      (service) => service.packageName,
    ),
    ["@nebula/media-service"],
  );
  const services = prismaServices.filter(
    (service) => service.packageName === "@nebula/media-service",
  );
  const dockerCalls = [];
  const packageCalls = [];
  const databases = verifyCleanMigrations({
    services,
    runId: "media-proof",
    logger: { log() {} },
    executeDocker(command, args, options = {}) {
      dockerCalls.push({ args, input: options.input });
      return { status: 0 };
    },
    executePrisma(args, options) {
      packageCalls.push({ args, env: options.env });
      return { status: 0 };
    },
  });
  const proof = packageCalls.find(({ args }) =>
    args.includes("test:processing:db"),
  );
  assert.notEqual(proof, undefined);
  assert.equal(new URL(proof.env.DATABASE_URL).pathname, `/${databases[0]}`);
  assert.match(databases[0], /^nebula_media_verify_[a-z0-9]{1,12}$/);
  assert.ok(
    dockerCalls.some(({ input }) =>
      input?.includes("duplicate job was accepted"),
    ),
  );
  assert.equal(
    dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    1,
  );
});

test("Media populated upgrade baselines, deploys twice and cleans only its disposable database", () => {
  const dockerCalls = [];
  const prismaCalls = [];
  const database = verifyMediaProcessingUpgrade({
    env: {},
    runId: "media-upgrade",
    logger: { log() {} },
    executeDocker(command, args, options = {}) {
      dockerCalls.push({ args, input: options.input });
      if (
        options.input?.includes(
          "RAISE EXCEPTION 'media_metadata_upgrade_rollback_fixture'",
        )
      )
        return {
          status: 1,
          stderr: "ERROR: media_metadata_upgrade_rollback_fixture\n",
        };
      if (
        options.input?.includes(
          "RAISE EXCEPTION 'media_derivative_upgrade_rollback_fixture'",
        )
      )
        return {
          status: 1,
          stderr: "ERROR: media_derivative_upgrade_rollback_fixture\n",
        };
      if (
        options.input?.includes(
          "RAISE EXCEPTION 'media_metadata_upgrade_rollback_fixture'",
        )
      )
        return {
          status: 1,
          stderr: "ERROR: media_metadata_upgrade_rollback_fixture\n",
        };
      if (
        options.input?.includes(
          "RAISE EXCEPTION 'media_upgrade_rollback_fixture'",
        )
      )
        return { status: 1, stderr: "ERROR: media_upgrade_rollback_fixture\n" };
      return { status: 0 };
    },
    executePrisma(args, options) {
      prismaCalls.push({ args, env: options.env });
      return { status: 0 };
    },
  });
  assert.match(database, /^nebula_media_verify_[a-z0-9]{1,12}$/);
  const injectedSql = dockerCalls.find(({ input }) =>
    input?.includes("RAISE EXCEPTION 'media_upgrade_rollback_fixture'"),
  ).input;
  assert.ok(
    injectedSql.endsWith(
      "DO $$ BEGIN RAISE EXCEPTION 'media_upgrade_rollback_fixture'; END $$;\nCOMMIT;",
    ),
    "rollback injection must preserve PostgreSQL dollar quoting",
  );
  assert.equal(
    prismaCalls.filter(({ args }) => args.includes("resolve")).length,
    6,
  );
  assert.equal(
    prismaCalls.filter(({ args }) => args.includes("deploy")).length,
    2,
  );
  assert.ok(
    prismaCalls.every(
      ({ env }) =>
        new globalThis.URL(env.DATABASE_URL).pathname === `/${database}`,
    ),
  );
  assert.equal(
    dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    1,
  );
  for (const { args } of dockerCalls) {
    if (args.includes("--dbname"))
      assert.equal(args[args.indexOf("--dbname") + 1], database);
  }
  assert.ok(
    dockerCalls.some(({ input }) =>
      input?.includes("media_failed_upgrade_changed_facts"),
    ),
  );
});

test("Media populated upgrade failure still cleans its database and refuses production callers", () => {
  const dockerCalls = [];
  const executeDocker = (command, args, options = {}) => {
    dockerCalls.push(args);
    if (
      options.input?.includes(
        "RAISE EXCEPTION 'media_metadata_upgrade_rollback_fixture'",
      )
    )
      return {
        status: 1,
        stderr: "ERROR: media_metadata_upgrade_rollback_fixture\n",
      };
    if (
      options.input?.includes(
        "RAISE EXCEPTION 'media_derivative_upgrade_rollback_fixture'",
      )
    )
      return {
        status: 1,
        stderr: "ERROR: media_derivative_upgrade_rollback_fixture\n",
      };
    if (
      options.input?.includes(
        "RAISE EXCEPTION 'media_metadata_upgrade_rollback_fixture'",
      )
    )
      return {
        status: 1,
        stderr: "ERROR: media_metadata_upgrade_rollback_fixture\n",
      };
    if (
      options.input?.includes(
        "RAISE EXCEPTION 'media_upgrade_rollback_fixture'",
      )
    )
      return { status: 1, stderr: "ERROR: media_upgrade_rollback_fixture\n" };
    return { status: 0 };
  };
  assert.throws(
    () =>
      verifyMediaProcessingUpgrade({
        env: {},
        runId: "media-abort",
        logger: { log() {} },
        executeDocker,
        executePrisma: (args) => ({ status: args.includes("deploy") ? 1 : 0 }),
      }),
    /failed_exit_1/,
  );
  assert.equal(dockerCalls.filter((args) => args.includes("dropdb")).length, 1);
  const before = dockerCalls.length;
  assert.throws(
    () =>
      verifyMediaProcessingUpgrade({
        env: { NODE_ENV: "production" },
        executeDocker,
      }),
    /requires_nonproduction/,
  );
  assert.equal(dockerCalls.length, before);
});

test("Media job proof failure still drops its disposable database", () => {
  const dockerCalls = [];
  assert.throws(
    () =>
      verifyCleanMigrations({
        services: prismaServices.filter(
          (service) => service.packageName === "@nebula/media-service",
        ),
        runId: "media-failed-proof",
        logger: { log() {} },
        executeDocker(command, args) {
          dockerCalls.push(args);
          return { status: 0 };
        },
        executePrisma(args) {
          return { status: args.includes("test:processing:db") ? 1 : 0 };
        },
      }),
    /test:processing:db_failed_exit_1/,
  );
  assert.equal(dockerCalls.filter((args) => args.includes("dropdb")).length, 1);
});

test("product migration verification executes the inventory and variant database proofs", () => {
  let invocation;

  verifyProductInventoryContract("nebula_product_verify_contract", {
    executeDocker(command, args, options) {
      invocation = { command, args, options };
      return { status: 0 };
    },
  });

  assert.match(invocation.command, /docker/);
  assert.deepEqual(invocation.args.slice(0, 4), [
    "compose",
    "exec",
    "-T",
    "postgres",
  ]);
  assert.equal(
    invocation.args[invocation.args.indexOf("--dbname") + 1],
    "nebula_product_verify_contract",
  );
  assert.match(invocation.options.input, /Product_untracked_stock_zero/);
  assert.match(invocation.options.input, /Product_version_positive/);
  assert.match(
    invocation.options.input,
    /ProductVariant_stockQuantity_nonnegative/,
  );
  assert.match(invocation.options.input, /CatalogSku_pkey/);
  assert.match(invocation.options.input, /ROLLBACK;/);
});

test("migration verification can select one scoped service", () => {
  assert.deepEqual(migrationVerificationServices(), prismaServices);
  assert.deepEqual(
    migrationVerificationServices("product").map(
      (service) => service.packageName,
    ),
    ["@nebula/product-service"],
  );
  assert.deepEqual(
    migrationVerificationServices("tenant-authority").map(
      (service) => service.packageName,
    ),
    ["@nebula/tenant-authority-service"],
  );
  assert.deepEqual(
    migrationVerificationServices("order").map(
      (service) => service.packageName,
    ),
    ["@nebula/order-service"],
  );
  assert.throws(
    () => migrationVerificationServices("unknown"),
    /migration_verification_scope_invalid_unknown/,
  );
});

test("F4 Batch 3 role verification preserves the bounded legacy snapshot across item 3 reruns", () => {
  const dockerCalls = [];
  const pnpmCalls = [];
  let auditRuns = 0;
  const legacyAudit = {
    backfillStatus: "READY",
    totalUsers: 3,
    roleCounts: { user: 1, admin: 1, "root-admin": 1, INVALID: 0 },
  };
  const fixture = {
    version: 1,
    rootAdminUserId: "11111111-1111-4111-8111-111111111111",
    siteAdminUserId: "22222222-2222-4222-8222-222222222222",
    editorUserId: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
  };

  const verified = verifyF4Batch3RoleSeeds({
    runId: "role-seed-success",
    executeDocker(command, args) {
      dockerCalls.push({ command, args });
      return { status: 0 };
    },
    executePnpm(args, options = {}) {
      pnpmCalls.push({ args, input: options.input });
      if (args.includes("audit:f4-legacy-roles")) {
        auditRuns += 1;
        return {
          status: 0,
          stdout: JSON.stringify(
            auditRuns === 1
              ? legacyAudit
              : {
                  ...legacyAudit,
                  totalUsers: 4,
                  roleCounts: { ...legacyAudit.roleCounts, user: 2 },
                },
          ),
        };
      }
      if (args.includes("export:f4-default-role-fixtures")) {
        return { status: 0, stdout: JSON.stringify(fixture) };
      }
      return { status: 0, stdout: "" };
    },
    logger: { log() {} },
  });

  assert.equal(verified.length, 2);
  const scriptCalls = pnpmCalls.filter(({ args }) => args.includes("run"));
  const firstBackfill = scriptCalls.findIndex(({ args }) =>
    args.includes("backfill:f4-legacy-roles"),
  );
  const firstEditorSeed = scriptCalls.findIndex(({ args }) =>
    args.includes("seed:f4-editor-user"),
  );
  assert.ok(firstBackfill >= 0 && firstBackfill < firstEditorSeed);
  const backfills = scriptCalls.filter(({ args }) =>
    args.includes("backfill:f4-legacy-roles"),
  );
  assert.equal(backfills.length, 3);
  const actorRuns = pnpmCalls.flatMap(({ args }, index) =>
    args.includes("backfill:f4-default-actors") ? [index] : [],
  );
  assert.equal(actorRuns.length, 3);
  assert.ok(
    pnpmCalls
      .slice(actorRuns[1] + 1, actorRuns[2])
      .some(
        ({ args }) =>
          args.includes("@nebula/tenant-authority-service") &&
          args.includes("db:seed"),
      ),
  );
  assert.ok(
    backfills.every(({ input }) => input === JSON.stringify(legacyAudit)),
  );
  assert.equal(
    scriptCalls.filter(({ args }) =>
      args.includes("verify:batch3-actor-resolution"),
    ).length,
    1,
  );
  assert.equal(
    dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    2,
  );
  assert.equal(
    dockerCalls.filter(({ args }) =>
      args.some((arg) =>
        String(arg).includes("f4_batch3_site_role_grant_mismatch"),
      ),
    ).length,
    1,
  );
});

test("F4 Batch 3 role verification cleans both disposable databases after a partial failure", () => {
  const dockerCalls = [];

  assert.throws(
    () =>
      verifyF4Batch3RoleSeeds({
        runId: "role-seed-failure",
        executeDocker(command, args) {
          dockerCalls.push({ command, args });
          return { status: 0 };
        },
        executePnpm(args) {
          if (args.includes("audit:f4-legacy-roles")) {
            return { status: 7, stdout: "" };
          }
          return { status: 0, stdout: "" };
        },
        logger: { log() {} },
      }),
    /package_script_@nebula\/user-service_audit:f4-legacy-roles_failed_exit_7/,
  );

  assert.equal(
    dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    2,
  );
});

function r2ToolingFixture({
  unexpectedRollbackStatus,
  failAtDatabase,
  cleanupFailure = false,
} = {}) {
  const dockerCalls = [];
  const packageCalls = [];
  const events = [];
  const executeDocker = (command, args, options = {}) => {
    const call = { command, args, input: options.input };
    dockerCalls.push(call);
    events.push(call);
    const database = args[args.indexOf("--dbname") + 1];
    if (args.includes("dropdb") && cleanupFailure) return { status: 8 };
    if (
      args.includes("createdb") &&
      args.at(-1).includes(failAtDatabase ?? "never-match")
    ) {
      return { status: 7 };
    }
    if (
      database?.includes("_rollback_verify_") &&
      options.input?.includes("-- F4 Batch 3R R2:")
    ) {
      const reason = database.includes("authority")
        ? "authority_default_actor_realm_missing"
        : "product_comment_legacy_user_id_invalid";
      return unexpectedRollbackStatus === undefined
        ? {
            status: 3,
            stderr: `ERROR:  ${reason}\nCONTEXT: disposable fixture`,
          }
        : {
            status: unexpectedRollbackStatus,
            stderr: "ERROR:  unrelated_failure",
          };
    }
    return { status: 0 };
  };
  const executePnpm = (args) => {
    const call = { args };
    packageCalls.push(call);
    events.push(call);
    return { status: 0, stdout: "" };
  };
  return {
    dockerCalls,
    packageCalls,
    events,
    executeDocker,
    executePnpm,
    logger: { log() {} },
  };
}

test("F4 R2 proves six exact old-schema upgrades/rollbacks and cleans every database", () => {
  const fixture = r2ToolingFixture();
  const verified = verifyF4R2DefaultActors({ ...fixture, runId: "r2-success" });
  assert.equal(verified.length, 6);
  const creates = fixture.dockerCalls.filter(({ args }) =>
    args.includes("createdb"),
  );
  const drops = fixture.dockerCalls.filter(({ args }) =>
    args.includes("dropdb"),
  );
  assert.deepEqual(
    creates.map(({ args }) => args.at(-1)),
    verified,
  );
  assert.deepEqual(
    drops.map(({ args }) => args.at(-1)),
    [...verified].reverse(),
  );
  assert.ok(creates.every(({ args }) => args.includes("template0")));
  assert.ok(verified.every((database) => database.includes("_verify_")));
  const sqlCalls = fixture.dockerCalls.filter(({ args }) =>
    args.includes("psql"),
  );
  assert.ok(
    sqlCalls.every(
      ({ args, input }) =>
        args.includes("--file=-") && typeof input === "string",
    ),
  );
  assert.ok(
    sqlCalls.every(({ args }) => args.includes("--set=ON_ERROR_STOP=1")),
  );
  for (const [index, count] of [6, 4, 1, 2, 6, 2].entries()) {
    const calls = sqlCalls.filter(
      ({ args }) => args[args.indexOf("--dbname") + 1] === verified[index],
    );
    // Exact pre-R2 set plus fixture, R2 migration, and verification.
    assert.equal(calls.length, count + 3);
  }
  const evidenceIndices = fixture.events.flatMap(({ args }, index) =>
    args.includes("backfill:f4-default-actors") ? [index] : [],
  );
  const seedIndices = fixture.events.flatMap(({ args }, index) =>
    args.includes("db:seed") ? [index] : [],
  );
  assert.equal(evidenceIndices.length, 3);
  assert.equal(seedIndices.length, 2);
  assert.ok(seedIndices[0] < evidenceIndices[0]);
  assert.ok(
    evidenceIndices[1] < seedIndices[1] && seedIndices[1] < evidenceIndices[2],
  );
  const authorityFixture = fixture.events.findIndex(({ input }) =>
    input?.includes("Real HMAC-SHA256 refs"),
  );
  const authorityMigration = fixture.events.findIndex(({ input }) =>
    input?.includes("-- F4 Batch 3R R2: additive deterministic"),
  );
  assert.ok(
    seedIndices[0] < authorityFixture && authorityFixture < authorityMigration,
  );
  assert.ok(authorityMigration < evidenceIndices[0]);
  const root = JSON.parse(source("package.json"));
  assert.equal(
    root.scripts["db:verify:f4-r2-default-actors"],
    "node ./scripts/backend.mjs database verify-f4-r2-default-actors",
  );
});

for (const status of [0, 3, null]) {
  test(`F4 R2 rejects unexpected rollback result ${status} and still cleans up`, () => {
    const fixture = r2ToolingFixture({ unexpectedRollbackStatus: status });
    assert.throws(
      () => verifyF4R2DefaultActors({ ...fixture, runId: "r2-unexpected" }),
      /f4_r2_expected_failure_missing_authority_default_actor_realm_missing/,
    );
    assert.equal(
      fixture.dockerCalls.filter(({ args }) => args.includes("createdb"))
        .length,
      5,
    );
    assert.equal(
      fixture.dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
      5,
    );
  });
}

test("F4 R2 cleans only successfully created databases after partial creation failure", () => {
  const fixture = r2ToolingFixture({ failAtDatabase: "nebula_order_" });
  assert.throws(
    () => verifyF4R2DefaultActors({ ...fixture, runId: "r2-partial" }),
    /local_postgres_create_.*failed_exit_7/,
  );
  const drops = fixture.dockerCalls.filter(({ args }) =>
    args.includes("dropdb"),
  );
  assert.equal(drops.length, 2);
  assert.ok(drops.every(({ args }) => !args.at(-1).includes("nebula_order_")));
});

test("F4 R2 does not mistake an error prefix or echoed stdout for the expected SQL failure", () => {
  for (const result of [
    {
      status: 3,
      stderr: "ERROR:  authority_default_actor_realm_missing_extra",
    },
    {
      status: 3,
      stdout: "ERROR:  authority_default_actor_realm_missing",
      stderr: "ERROR:  different_failure",
    },
  ]) {
    const fixture = r2ToolingFixture();
    const execute = fixture.executeDocker;
    fixture.executeDocker = (command, args, options) => {
      const actual = execute(command, args, options);
      return actual.status === 3 ? result : actual;
    };
    assert.throws(
      () => verifyF4R2DefaultActors({ ...fixture, runId: "r2-reason" }),
      /f4_r2_expected_failure_missing_authority_default_actor_realm_missing/,
    );
    assert.equal(
      fixture.dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
      5,
    );
  }
});

test("F4 R2 reports cleanup failure alongside the original verification failure", () => {
  const fixture = r2ToolingFixture({
    failAtDatabase: "nebula_order_",
    cleanupFailure: true,
  });
  assert.throws(
    () => verifyF4R2DefaultActors({ ...fixture, runId: "r2-both" }),
    /failed_exit_7; cleanup: .*failed_exit_8/,
  );
  assert.equal(
    fixture.dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    2,
  );
});

test("F4 R2 attempts all cleanup even when one drop fails and never reports success", () => {
  const fixture = r2ToolingFixture({ cleanupFailure: true });
  assert.throws(
    () => verifyF4R2DefaultActors({ ...fixture, runId: "r2-cleanup" }),
    /local_postgres_drop_.*failed_exit_8/,
  );
  assert.equal(
    fixture.dockerCalls.filter(({ args }) => args.includes("dropdb")).length,
    6,
  );
});

test("F4 R3 verifies both isolated shadow foundations and always removes them", () => {
  const dockerCalls = [];
  const pnpmCalls = [];
  const seedRuns = new Map();
  const failureReasons = [
    "realm_auth_wrong_realm",
    "realm_auth_principal_class_mismatch",
    "realm_auth_shadow_generation_change_forbidden",
    "realm_auth_shadow_session_forbidden",
    "realm_auth_legacy_bridge_key_invalid",
    "realm_auth_terminal_record_immutable",
    "realm_auth_audit_key_invalid",
    "realm_auth_destination_key_invalid",
    "realm_auth_wrong_realm",
    "realm_auth_principal_class_mismatch",
    "realm_auth_shadow_generation_change_forbidden",
    "realm_auth_shadow_session_forbidden",
    "realm_auth_legacy_bridge_key_invalid",
    "realm_auth_terminal_record_immutable",
    "realm_auth_audit_key_invalid",
    "realm_auth_destination_key_invalid",
  ];

  const verified = verifyF4R3RealmAuthFoundation({
    runId: "r3-unit",
    executeDocker(command, args, options = {}) {
      dockerCalls.push({ command, args, input: options.input });
      const sql = String(options.input ?? "");
      if (
        args.includes("psql") &&
        sql &&
        !sql.includes("realm_auth_boundary_evidence_mismatch") &&
        !sql.includes("ROLLBACK;")
      ) {
        const reason = failureReasons.shift();
        assert.notEqual(reason, undefined);
        return { status: 3, stderr: `ERROR:  ${reason}\n` };
      }
      return { status: 0, stdout: "", stderr: "" };
    },
    executePnpm(args, options = {}) {
      pnpmCalls.push({ args, env: options.env });
      const runIndex = args.indexOf("run");
      if (runIndex >= 0) {
        const script = args[runIndex + 1];
        const databaseUrl = String(options.env?.DATABASE_URL ?? "");
        const key = `${script}:${databaseUrl}`;
        const count = (seedRuns.get(key) ?? 0) + 1;
        seedRuns.set(key, count);
        return {
          status: 0,
          stdout: count === 1 ? "CREATED\n" : "ALREADY_CURRENT\n",
        };
      }
      return { status: 0, stdout: "" };
    },
    logger: { log() {} },
  });

  assert.equal(failureReasons.length, 0);
  assert.equal(verified.length, 2);
  assert.ok(verified.every((database) => database.includes("_verify_")));
  assert.equal(
    dockerCalls.filter(({ args }) => args.includes("createdb")).length,
    2,
  );
  assert.deepEqual(
    dockerCalls
      .filter(({ args }) => args.includes("dropdb"))
      .map(({ args }) => args.at(-1)),
    [...verified].reverse(),
  );
  assert.equal(
    pnpmCalls.filter(({ args }) => args.includes("deploy")).length,
    2,
  );
  assert.equal(
    pnpmCalls.filter(({ args }) => args.includes("status")).length,
    2,
  );
  assert.equal(seedRuns.size, 2);
  assert.ok([...seedRuns.values()].every((count) => count === 2));
});

test("F4 R3 cleans the first database after second-database creation fails", () => {
  const drops = [];
  let creates = 0;
  let seedRuns = 0;
  const failureReasons = [
    "realm_auth_wrong_realm",
    "realm_auth_principal_class_mismatch",
    "realm_auth_shadow_generation_change_forbidden",
    "realm_auth_shadow_session_forbidden",
    "realm_auth_legacy_bridge_key_invalid",
    "realm_auth_terminal_record_immutable",
    "realm_auth_audit_key_invalid",
    "realm_auth_destination_key_invalid",
  ];
  assert.throws(
    () =>
      verifyF4R3RealmAuthFoundation({
        runId: "r3-partial",
        executeDocker(command, args, options = {}) {
          if (args.includes("createdb")) {
            creates += 1;
            return { status: creates === 2 ? 7 : 0, stderr: "" };
          }
          if (args.includes("dropdb")) drops.push(args.at(-1));
          const sql = String(options.input ?? "");
          if (
            args.includes("psql") &&
            sql &&
            !sql.includes("realm_auth_boundary_evidence_mismatch") &&
            !sql.includes("ROLLBACK;")
          ) {
            const reason = failureReasons.shift();
            return { status: 3, stderr: `ERROR:  ${reason}\n` };
          }
          return { status: 0, stdout: "", stderr: "" };
        },
        executePnpm(args) {
          const runIndex = args.indexOf("run");
          if (runIndex >= 0) seedRuns += 1;
          return {
            status: 0,
            stdout:
              runIndex >= 0
                ? seedRuns === 1
                  ? "CREATED\n"
                  : "ALREADY_CURRENT\n"
                : "",
          };
        },
        logger: { log() {} },
      }),
    /local_postgres_create_.*failed_exit_7/,
  );
  assert.equal(creates, 2);
  assert.equal(drops.length, 1);
  assert.match(drops[0], /nebula_realm_auth_default_verify_/);
});

test("F4 R4 cleans the Authority database after operator database creation fails", () => {
  const drops = [];
  let creates = 0;
  assert.throws(
    () =>
      verifyF4R4AdminSplitStaged({
        runId: "r4-partial",
        executeDocker(command, args) {
          if (args.includes("createdb")) {
            creates += 1;
            return { status: creates === 2 ? 7 : 0, stderr: "" };
          }
          if (args.includes("dropdb")) drops.push(args.at(-1));
          return { status: 0, stdout: "", stderr: "" };
        },
        executePnpm() {
          return { status: 0, stdout: "" };
        },
        logger: { log() {} },
        platform: "linux",
      }),
    /local_postgres_create_.*failed_exit_7/,
  );
  assert.equal(creates, 2);
  assert.equal(drops.length, 1);
  assert.match(drops[0], /^nebula_authority_verify_/);
});

test("disposable cleanup refuses normal or invalid database names before executing", () => {
  let calls = 0;
  for (const database of [
    "nebula_authority",
    "nebula_product",
    "a_verify_bad;drop",
    "--verify--",
  ]) {
    assert.throws(
      () =>
        dropDisposableDatabase(database, {
          execute() {
            calls += 1;
          },
        }),
      /refused_to_drop_non_disposable_database|local_database_name_invalid/,
    );
  }
  assert.equal(calls, 0);
});

test("authority record evidence refuses non-database targets", () => {
  let calls = 0;
  assert.throws(
    () =>
      verifyTenantAuthorityRegistrationRecords("authority;drop database", {
        executeDocker() {
          calls += 1;
          return { status: 0 };
        },
      }),
    /database_name_invalid/,
  );
  assert.equal(calls, 0);
  assert.throws(
    () =>
      verifyTenantAuthorityDefaultSeed("authority;drop database", {
        executeDocker() {
          calls += 1;
          return { status: 0 };
        },
      }),
    /database_name_invalid/,
  );
  assert.equal(calls, 0);
});

test("clean migration verification stops after failure and cleans only created databases", () => {
  const dockerCalls = [];
  let prismaCalls = 0;
  const services = prismaServices.filter((service) =>
    [
      "@nebula/user-service",
      "@nebula/tenant-authority-service",
      "@nebula/settings-service",
    ].includes(service.packageName),
  );
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
    /tenant-authority-service.*failed_exit_9/,
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
        return {
          status: 0,
          stdout: "postgres\noperator-realm-auth-service\n",
        };
      },
      async executeBinary() {
        binaryCalls += 1;
      },
      logger: { log() {} },
    }),
    /backend_services_must_be_stopped_operator-realm-auth-service/,
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
    /backup_nebula_realm_auth_default_failed_exit_5/,
  );
  assert.equal(existsSync(failedTarget), false);
  rmSync(temporary, { recursive: true, force: true });
});

test("backup writes one binary dump per maintenance database and a strict manifest", async () => {
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
  assert.equal(binaryCalls.length, maintenanceDatabaseServices.length);
  assert.equal(
    binaryCalls.every((call) => call.args.includes("--format=custom")),
    true,
  );
  const manifest = validateBackupManifest(
    JSON.parse(readFileSync(path.join(target, BACKUP_MANIFEST), "utf8")),
  );
  assert.deepEqual(
    manifest.databases.map((entry) => entry.database),
    maintenanceDatabaseServices.map((service) => service.database),
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

  assert.equal(restoreCalls.length, maintenanceDatabaseServices.length);
  assert.equal(
    restoreCalls.every((call) => call.args.includes("pg_restore")),
    true,
  );
  assert.equal(
    postgresCalls.filter((args) => args.includes("dropdb")).length,
    maintenanceDatabaseServices.length,
  );
  assert.equal(
    postgresCalls.filter((args) => args.includes("createdb")).length,
    maintenanceDatabaseServices.length,
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
      "@nebula/realm-auth-service",
      "@nebula/realm-auth-service",
      "@nebula/realm-auth-service",
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

function d1UpgradeHarness({
  snapshotFailure = false,
  wrongMarker = false,
  dropFailure = false,
  wrongSqlMarker = false,
  sqlUnexpectedSuccess = false,
  sqlEarlierError = false,
} = {}) {
  const docker = [];
  const prisma = [];
  const schemas = new Set();
  const rejected = [];
  const sqlFaults = [];
  const executeDocker = (_command, args, options = {}) => {
    docker.push(args);
    const marker = options.input?.match(/d1_upgrade_rollback_[a-z0-9_]+/u)?.[0];
    if (marker) {
      sqlFaults.push(options.input);
      assert.ok(
        options.input.indexOf(marker) < options.input.lastIndexOf("COMMIT;"),
      );
      return {
        status: sqlUnexpectedSuccess ? 0 : 1,
        stderr: sqlEarlierError
          ? `ERROR: unrelated migration failure\nERROR: ${marker}`
          : `ERROR: ${wrongSqlMarker ? "current transaction is aborted" : marker}`,
      };
    }
    if (dropFailure && args.includes("dropdb"))
      return { status: 1, stderr: "cleanup failure" };
    if (
      snapshotFailure &&
      options.input?.includes("d1_upgrade_failed_migration_changed_schema")
    )
      return { status: 1, stderr: "changed schema" };
    return { status: 0, stdout: "", stderr: "" };
  };
  const executePrisma = (args, options) => {
    prisma.push(args);
    const schema = args[args.indexOf("--schema") + 1];
    schemas.add(schema);
    const database = new globalThis.URL(
      options.env.DATABASE_URL,
    ).pathname.slice(1);
    assert.match(database, /_verify_/u);
    assert.notEqual(database, "nebula_products");
    assert.notEqual(database, "nebula_order");
    if (args.includes("deploy")) {
      const root = path.join(path.dirname(schema), "migrations");
      for (const name of readdirSync(root)) {
        if (name === "migration_lock.toml") continue;
        const sql = readFileSync(
          path.join(root, name, "migration.sql"),
          "utf8",
        );
        const marker = sql.match(/d1_upgrade_rollback_[a-z0-9_]+/u)?.[0];
        if (marker) {
          rejected.push(name);
          assert.equal(name.includes("descriptive_metadata"), false);
          return {
            status: 1,
            stderr: wrongMarker ? "unrelated failure" : marker,
          };
        }
      }
    }
    return { status: 0, stdout: "", stderr: "" };
  };
  return {
    docker,
    prisma,
    schemas,
    rejected,
    sqlFaults,
    options: {
      env: { NODE_ENV: "development" },
      runId: "d1-upgrade-test",
      executeDocker,
      executePrisma,
      logger: { log() {} },
    },
  };
}

test("D1 upgrade checks seven Prisma failures and explicit metadata SQL rollback, then cleans owned resources", () => {
  const h = d1UpgradeHarness();
  const sources = prismaServices
    .filter((service) =>
      ["@nebula/product-service", "@nebula/order-service"].includes(
        service.packageName,
      ),
    )
    .flatMap((service) => {
      const root = path.join(
        repositoryRoot,
        service.directory,
        "prisma",
        "migrations",
      );
      return readdirSync(root)
        .filter((name) => name !== "migration_lock.toml")
        .map((name) => path.join(root, name, "migration.sql"));
    });
  const before = sources.map((file) => readFileSync(file, "utf8"));
  const result = verifyD1CommerceUpgrade(h.options);
  assert.equal(result.rollbackCases, 8);
  assert.equal(result.databases.length, 2);
  assert.equal(h.rejected.length, 7);
  assert.equal(h.sqlFaults.length, 1);
  assert.match(h.sqlFaults[0], /^BEGIN;/u);
  assert.match(h.sqlFaults[0], /ADD COLUMN "thumbnailTitle"/u);
  assert.equal(
    h.prisma.filter((args) => args.includes("--rolled-back")).length,
    7,
  );
  assert.equal(h.prisma.filter((args) => args.includes("status")).length, 4);
  assert.equal(h.docker.filter((args) => args.includes("dropdb")).length, 2);
  for (const schema of h.schemas)
    assert.equal(existsSync(path.dirname(schema)), false);
  assert.deepEqual(
    sources.map((file) => readFileSync(file, "utf8")),
    before,
  );
});

test("D1 upgrade refuses production before executing tools", () => {
  const h = d1UpgradeHarness();
  assert.throws(
    () =>
      verifyD1CommerceUpgrade({
        ...h.options,
        env: { NODE_ENV: " Production " },
      }),
    /d1_upgrade_requires_nonproduction/u,
  );
  assert.equal(h.docker.length, 0);
  assert.equal(h.prisma.length, 0);
});

test("D1 upgrade stops on unexpected failure or changed rollback schema and still cleans resources", () => {
  for (const flags of [{ wrongMarker: true }, { snapshotFailure: true }]) {
    const h = d1UpgradeHarness(flags);
    assert.throws(() => verifyD1CommerceUpgrade(h.options));
    assert.equal(
      h.prisma.some((args) => args.includes("--rolled-back")),
      false,
    );
    assert.equal(h.docker.filter((args) => args.includes("dropdb")).length, 1);
    for (const schema of h.schemas)
      assert.equal(existsSync(path.dirname(schema)), false);
  }
});

test("D1 upgrade surfaces database cleanup failure without leaving temporary migration copies", () => {
  const h = d1UpgradeHarness({ wrongMarker: true, dropFailure: true });
  assert.throws(
    () => verifyD1CommerceUpgrade(h.options),
    /d1_upgrade_and_cleanup_failed/u,
  );
  for (const schema of h.schemas)
    assert.equal(existsSync(path.dirname(schema)), false);
});

test("D1 metadata rollback requires the exact first SQL error and a failing exit status", () => {
  for (const flags of [
    { wrongSqlMarker: true },
    { sqlUnexpectedSuccess: true },
    { sqlEarlierError: true },
  ]) {
    const h = d1UpgradeHarness(flags);
    assert.throws(
      () => verifyD1CommerceUpgrade(h.options),
      /d1_upgrade_expected_failure_missing_d1_upgrade_rollback_20261010000100_descriptive_metadata/u,
    );
    assert.equal(h.sqlFaults.length, 1);
    assert.equal(
      h.prisma.filter((args) => args.includes("--rolled-back")).length,
      6,
    );
    assert.equal(h.docker.filter((args) => args.includes("dropdb")).length, 1);
    for (const schema of h.schemas)
      assert.equal(existsSync(path.dirname(schema)), false);
  }
});

test("demo seed delegates Product to the proven showcase and preserves Blog creation", async () => {
  const calls = [];
  const logs = [];
  const pnpmCalls = [];
  const fetchImpl = queuedFetch(
    [
      jsonResponse(200, {
        accessToken: "access-token-secret",
        refreshToken: "refresh-token-secret",
      }),
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
    executePnpm: (args, options) => {
      pnpmCalls.push({ args, env: options.env });
      return { status: 0 };
    },
    logger: { log: (message) => logs.push(message) },
  });

  assert.deepEqual(result, { product: "d1-showcase", blog: "created" });
  assert.deepEqual(
    pnpmCalls.map((call) => call.args),
    [["run", "demo:d1:seed"]],
  );
  assert.equal(pnpmCalls[0].env.SEED_ADMIN_EMAIL, "seed-admin@example.com");
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ["POST", "GET", "POST"],
  );
  const loginBody = JSON.parse(calls[0].options.body);
  assert.deepEqual(loginBody, {
    identifier: "seed-admin@example.com",
    password: "seed-admin-password",
  });
  assert.ok(calls.every((call) => !call.url.includes("/products")));
  assert.equal(
    calls[2].options.headers.authorization,
    "Bearer access-token-secret",
  );
  assert.doesNotMatch(
    logs.join("\n"),
    /seed-admin-password|access-token-secret|refresh-token-secret/,
  );
});

test("demo seed reruns showcase and skips a matching Blog record", async () => {
  const calls = [];
  let showcaseCalls = 0;
  const result = await seedBackendDemo({
    env: { NODE_ENV: "development" },
    fetchImpl: queuedFetch(
      [
        jsonResponse(200, { accessToken: "access-token" }),
        jsonResponse(200, { data: { ...DEMO_BLOG_POST } }),
      ],
      calls,
    ),
    executePnpm: () => {
      showcaseCalls += 1;
      return { status: 0 };
    },
    logger: { log() {} },
  });

  assert.deepEqual(result, { product: "d1-showcase", blog: "existing" });
  assert.equal(showcaseCalls, 1);
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ["POST", "GET"],
  );
});

test(
  "boot health sockets cannot poison demo writes after a blocking showcase command",
  { timeout: 20_000 },
  async () => {
    const server = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
    import http from 'node:http';
    let loginCount=0;
    let probeConnection;
    const server=http.createServer((req,res)=>{
      res.setHeader('content-type','application/json');
      if(req.url==='/health/ready') {
        probeConnection=req.headers.connection;
        res.end(JSON.stringify({service:'fixture-service',status:'ok'}));
      } else if(req.url==='/auth/login' && req.method==='POST') {
        loginCount+=1;
        res.end(JSON.stringify({accessToken:'fixture-token'}));
      } else if(req.url==='/fixture/stats') {
        res.end(JSON.stringify({loginCount,probeConnection}));
      } else if(req.url==='/blog/posts/welcome-to-nebulanv' && req.method==='GET') {
        res.end(JSON.stringify({data:{slug:'welcome-to-nebulanv'}}));
      } else { res.statusCode=404; res.end('{}'); }
    });
    server.keepAliveTimeout=5000;
    server.listen(0,'127.0.0.1',()=>process.send(server.address().port));
  `,
      ],
      { stdio: ["ignore", "ignore", "inherit", "ipc"] },
    );
    try {
      const [port] = await once(server, "message", {
        signal: globalThis.AbortSignal.timeout(5_000),
      });
      await checkBackendHealth({
        services: [{ name: "fixture-service", httpPort: port }],
        logger: { log() {} },
      });
      // Real boot probes finish at different times, leaving earlier ones idle.
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = await seedBackendDemo({
        env: {
          AUTH_HTTP_URL: `http://127.0.0.1:${port}`,
          BLOG_HTTP_URL: `http://127.0.0.1:${port}`,
        },
        logger: { log() {} },
        executePnpm() {
          const child = spawnSync(process.execPath, [
            "-e",
            "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,6500)",
          ]);
          assert.equal(child.status, 0);
          return child;
        },
      });
      assert.deepEqual(result, { product: "d1-showcase", blog: "existing" });
      const stats = await globalThis.fetch(
        `http://127.0.0.1:${port}/fixture/stats`,
      );
      assert.deepEqual(await stats.json(), {
        loginCount: 1,
        probeConnection: "close",
      });
    } finally {
      if (server.exitCode === null) {
        const stopped = once(server, "exit");
        server.kill();
        await stopped;
      }
    }
  },
);

test("demo seed stops before Blog work when showcase fails", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    seedBackendDemo({
      env: { NODE_ENV: "development" },
      executePnpm: () => ({ status: 1 }),
      fetchImpl: async () => {
        fetchCalls += 1;
      },
      logger: { log() {} },
    }),
    /d1_demo_seed_failed_exit_1/u,
  );
  assert.equal(fetchCalls, 0);
});

test("demo seed refuses production and stops on dependency failure", async () => {
  let productionCalls = 0;
  await assert.rejects(
    seedBackendDemo({
      env: { NODE_ENV: "production" },
      executePnpm: () => {
        productionCalls += 1;
        return { status: 0 };
      },
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
      executePnpm: () => ({ status: 0 }),
      fetchImpl: queuedFetch(
        [
          jsonResponse(200, { accessToken: "access-token" }),
          jsonResponse(503, { status: "error" }),
        ],
        calls,
      ),
      logger: { log() {} },
    }),
    /demo_seed_blog_lookup_http_503/,
  );
  assert.equal(calls.length, 2);
});

test("development and release commands derive all backend services", () => {
  assert.deepEqual(buildDevCommands(), [
    "pnpm run dev:user",
    "pnpm run dev:auth",
    "pnpm run dev:realm-auth",
    "pnpm run dev:tenant-authority",
    "pnpm run dev:settings",
    "pnpm run dev:media",
    "pnpm run dev:taxonomy",
    "pnpm run dev:product",
    "pnpm run dev:blog",
    "pnpm run dev:order",
    "pnpm run dev:gateway",
  ]);
  assert.deepEqual(
    releaseImages("example/nebula", "test"),
    backendServices.map(
      (service) => `example/nebula-${service.dockerService}:test`,
    ),
  );
});

test("release archive covers both Compose image sets including scanner and custom overrides", () => {
  const require = createRequire(import.meta.url);
  const yaml = createRequire(require.resolve("eslint/package.json"))("js-yaml");
  const local = yaml.load(source("docker-compose.yml")).services;
  const release = yaml.load(source("docker-compose.release.yml")).services;
  const expressions = (services) =>
    Object.fromEntries(
      Object.entries(services).map(([name, config]) => [name, config.image]),
    );
  assert.deepEqual(expressions(local), expressions(release));
  const saveSource = source("scripts/docker/save-release-images.ps1");
  const loadSource = source("scripts/docker/load-release-images.ps1");
  assert.match(saveSource, /\[string\[\]\]\$images\s*=.*ConvertFrom-Json/);
  assert.match(loadSource, /\[Alias\("Input"\)\]/);
  assert.match(loadSource, /\[string\]\$ArchivePath/);
  assert.doesNotMatch(loadSource, /\$Input\b/i);
  const scanner = local["media-scanner"].image.match(
    /^\$\{MEDIA_SCANNER_IMAGE:-(.+)\}$/,
  )?.[1];
  assert.match(scanner, /^clamav\/clamav:.+@sha256:[a-f0-9]{64}$/);
  for (const custom of [false, true]) {
    const prefix = custom ? "example/nebula" : "nebulanv-main";
    const tag = custom ? "archive-proof" : "latest";
    const scanImage = custom ? "example/scanner:custom" : scanner;
    const expected = [
      ...releaseImages(prefix, tag),
      "postgres:17",
      "redis:7-alpine",
      "minio/minio:latest",
      "minio/mc:latest",
      scanImage,
    ];
    const images = releaseArchiveImages({
      prefix,
      tag,
      envFile: "deploy/.env.production.example",
      env: { MEDIA_SCANNER_IMAGE: scanImage },
      execute(args, options) {
        assert.deepEqual(args.slice(0, 3), [
          "compose",
          "--file",
          "docker-compose.yml",
        ]);
        assert.deepEqual(args.slice(-4), [
          "--profile",
          "*",
          "config",
          "--images",
        ]);
        assert.ok(
          args.includes(
            path.join(repositoryRoot, "deploy/.env.production.example"),
          ),
        );
        assert.equal(options.cwd, repositoryRoot);
        assert.equal(options.env.NEBULA_IMAGE_PREFIX, prefix);
        assert.equal(options.env.NEBULA_IMAGE_TAG, tag);
        assert.equal(options.env.MEDIA_SCANNER_IMAGE, scanImage);
        return [...expected, "postgres:17", expected[0]].join("\r\n");
      },
    });
    assert.deepEqual(images, [...expected].sort());
    assert.equal(images.length, 16);
  }
  assert.throws(
    () => releaseArchiveImages({ execute: () => "postgres:17\n" }),
    /missing backend image/,
  );
  assert.throws(
    () =>
      releaseArchiveImages({
        execute: () => {
          throw new Error("compose_render_failed");
        },
      }),
    /compose_render_failed/,
  );
  assert.throws(
    () =>
      releaseArchiveImages({
        prefix: "invalid prefix",
        execute: () => assert.fail("invalid prefix must not execute Docker"),
      }),
    /release_image_name_invalid/,
  );
});

test("Product metadata populated proof injects rollback, reruns deploy and cleans its disposable database", () => {
  const calls = [];
  const prisma = [];
  const database = verifyProductMetadataUpgrade({
    env: {},
    runId: "metadataproof",
    logger: { log() {} },
    executeDocker(command, args, options = {}) {
      calls.push({ args, input: options.input });
      if (
        options.input?.includes(
          "RAISE EXCEPTION 'product_metadata_rollback_fixture'",
        )
      )
        return {
          status: 1,
          stderr: "ERROR: product_metadata_rollback_fixture\n",
        };
      return { status: 0, stdout: "" };
    },
    executePrisma(args, options) {
      prisma.push({ args, options });
      return { status: 0, stdout: "" };
    },
  });
  assert.match(database, /^nebula_products_verify_[a-z0-9]{1,12}$/);
  const resolved = prisma
    .filter((call) => call.args.includes("--applied"))
    .map((call) => call.args[call.args.indexOf("--applied") + 1]);
  assert.equal(resolved.length, 9);
  assert.ok(
    resolved.every((name) => name < "20261010000100_descriptive_metadata"),
  );
  assert.equal(
    resolved.includes("20261014000100_checkout_stock_intents"),
    false,
  );
  assert.equal(
    resolved.includes("20261019000100_finalized_stock_restoration"),
    false,
  );
  assert.equal(prisma.filter((call) => call.args.includes("deploy")).length, 2);
  assert.equal(calls.filter((call) => call.args.includes("dropdb")).length, 1);
  assert.ok(
    calls.some((call) =>
      call.input?.includes("product_metadata_rollback_retained_columns"),
    ),
  );
  assert.ok(
    calls.some((call) =>
      call.input?.includes("product_metadata_upgrade_changed_gallery"),
    ),
  );
  assert.ok(
    prisma.every(
      (call) =>
        new URL(call.options.env.DATABASE_URL).pathname === `/${database}`,
    ),
  );
});
test("Product metadata proof refuses production and cleans up after failed deployment", () => {
  assert.throws(
    () => verifyProductMetadataUpgrade({ env: { NODE_ENV: "production" } }),
    /requires_nonproduction/,
  );
  const calls = [];
  assert.throws(
    () =>
      verifyProductMetadataUpgrade({
        env: {},
        runId: "metadatafail",
        logger: { log() {} },
        executeDocker(command, args, options = {}) {
          calls.push(args);
          if (
            options.input?.includes(
              "RAISE EXCEPTION 'product_metadata_rollback_fixture'",
            )
          )
            return {
              status: 1,
              stderr: "ERROR: product_metadata_rollback_fixture\n",
            };
          return { status: 0, stdout: "" };
        },
        executePrisma(args) {
          return args.includes("deploy")
            ? { status: 1, stderr: "failed" }
            : { status: 0, stdout: "" };
        },
      }),
    /failed/,
  );
  assert.equal(calls.filter((args) => args.includes("dropdb")).length, 1);
});
