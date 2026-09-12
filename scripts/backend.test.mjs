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
  TRIVY_DB_REPOSITORIES,
  backendServices,
  backupLocalDatabases,
  buildBackendQualityArgs,
  buildBackendImages,
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
  sanitizeOutput,
  seedBackendDemo,
  summarizeTrivyImageVulnerabilities,
  restoreLocalDatabases,
  validateBackupManifest,
  validateRenderedComposeBoundary,
  verifyCleanMigrations,
  verifyDatabaseRecovery,
  verifyF4Batch3RoleSeeds,
  verifyF4R2DefaultActors,
  verifyF4R3RealmAuthFoundation,
  verifyF4R4AdminSplitStaged,
  verifyTenantAuthorityDefaultSeed,
  verifyTenantAuthorityRegistrationRecords,
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
      ...Object.fromEntries(
        hybridServices.map((service) => [
          `${service.name.replace(/-service$/, "").toUpperCase()}_GRPC_URL`,
          `${service.dockerService}:${service.grpcPort}`,
        ]),
      ),
    },
    healthcheck: {
      test: ["CMD", "http://localhost:3002/health/ready"],
    },
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
    /packages\/protos\/tenant_authority\.proto \/packages\/protos\/tenant_authority\.proto/,
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
    assert.match(localBlock, new RegExp(`-${service.dockerService}:`));
    assert.match(releaseBlock, new RegExp(`-${service.dockerService}:`));
    assert.match(localBlock, new RegExp(`:${service.httpPort}["']`));
    if (service.grpcPort !== undefined) {
      assert.match(localBlock, new RegExp(`:${service.grpcPort}["']`));
      assert.doesNotMatch(releaseBlock, /^    ports:/m);
    } else if (service.name === "gateway") {
      assert.match(releaseBlock, /GATEWAY_HOST_PORT:-3002}:3002/);
    } else {
      assert.doesNotMatch(releaseBlock, /^    ports:/m);
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
    assert.doesNotMatch(compose, /condition:\s*service_started/);
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
    /\$repoRoot\s*=\s*Resolve-Path[\s\S]*Join-Path \$repoRoot "scripts\\backend\.mjs"/,
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
    ...workflow.matchAll(/          path: \|\r?\n((?:            .+\r?\n)+)/g),
  ]
    .flatMap((match) => match[1].trim().split(/\r?\n/))
    .map((entry) => entry.trim());
  assert.deepEqual(retainedPaths, [
    ".security-reports/backend-dependencies.json",
    ".security-reports/backend-source.json",
    ".ci-evidence/compose-local.yaml",
    ".ci-evidence/compose-release.yaml",
    ".security-reports/nebulanv-main-*.json",
    ".ci-evidence/compose-state.jsonl",
    ".ci-evidence/compose-logs.txt",
  ]);
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

test("migration verification can select only tenant authority", () => {
  assert.deepEqual(migrationVerificationServices(), prismaServices);
  assert.deepEqual(
    migrationVerificationServices("tenant-authority").map(
      (service) => service.packageName,
    ),
    ["@nebula/tenant-authority-service"],
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
