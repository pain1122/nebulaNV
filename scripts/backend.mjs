import {
  copyFileSync,
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { tmpdir } from "node:os";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
export const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");

const REQUIRED_STRING_FIELDS = [
  "name",
  "packageName",
  "directory",
  "dockerService",
  "defaultImage",
  "moduleFile",
];

export const PRISMA_OPERATIONS = Object.freeze({
  generate: [
    "exec",
    "prisma",
    "generate",
    "--schema",
    "./prisma/schema.prisma",
  ],
  "migrate-dev": [
    "exec",
    "prisma",
    "migrate",
    "dev",
    "--schema",
    "./prisma/schema.prisma",
  ],
  "migrate-deploy": [
    "exec",
    "prisma",
    "migrate",
    "deploy",
    "--schema",
    "./prisma/schema.prisma",
  ],
  "migrate-status": [
    "exec",
    "prisma",
    "migrate",
    "status",
    "--schema",
    "./prisma/schema.prisma",
  ],
  push: ["exec", "prisma", "db", "push", "--schema", "./prisma/schema.prisma"],
  seed: ["run", "db:seed"],
});

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadBackendServices(root = repositoryRoot) {
  const manifestPath = path.join(root, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const configured = manifest?.nebula?.backendServices;

  if (!Array.isArray(configured) || configured.length === 0) {
    throw new Error("backend_inventory_missing");
  }

  const names = new Set();
  const packages = new Set();
  const ports = new Set();

  return Object.freeze(
    configured.map((service, index) => {
      if (!isRecord(service)) {
        throw new Error(`backend_inventory_entry_${index}_invalid`);
      }

      for (const field of REQUIRED_STRING_FIELDS) {
        if (typeof service[field] !== "string" || !service[field].trim()) {
          throw new Error(`backend_inventory_${index}_${field}_invalid`);
        }
      }

      if (service.database !== null && typeof service.database !== "string") {
        throw new Error(`backend_inventory_${index}_database_invalid`);
      }
      if (
        !Number.isInteger(service.httpPort) ||
        !Number.isInteger(service.grpcPort)
      ) {
        throw new Error(`backend_inventory_${index}_ports_invalid`);
      }
      if (names.has(service.name) || packages.has(service.packageName)) {
        throw new Error(`backend_inventory_${index}_identity_duplicate`);
      }
      if (ports.has(service.httpPort) || ports.has(service.grpcPort)) {
        throw new Error(`backend_inventory_${index}_port_duplicate`);
      }

      names.add(service.name);
      packages.add(service.packageName);
      ports.add(service.httpPort);
      ports.add(service.grpcPort);

      return Object.freeze({ ...service });
    }),
  );
}

export const backendServices = loadBackendServices();
export const prismaServices = Object.freeze(
  backendServices.filter((service) => service.database !== null),
);

export const DEMO_PRODUCT = Object.freeze({
  slug: "nebula-demo-product",
  sku: "NEBULA-DEMO-001",
  title: "Nebula Demo Product",
});

export const DEMO_BLOG_POST = Object.freeze({
  slug: "welcome-to-nebulanv",
  title: "Welcome to NebulaNV",
});

function pnpmInvocation(env = process.env) {
  const pnpmCli = env.npm_execpath;
  if (!pnpmCli) {
    throw new Error("pnpm_cli_unavailable_run_through_pnpm");
  }
  return { command: process.execPath, prefixArgs: [pnpmCli] };
}

export function sanitizeOutput(value, env = process.env) {
  let output = String(value ?? "");
  output = output.replace(
    /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/gi,
    "postgresql://[REDACTED]@",
  );

  for (const [name, secret] of Object.entries(env)) {
    if (
      !/(?:PASS(?:WORD)?|SECRET|TOKEN|DATABASE_URL|SHADOW_DATABASE_URL)$/i.test(
        name,
      ) ||
      typeof secret !== "string" ||
      secret.length < 4
    ) {
      continue;
    }
    output = output.split(secret).join("[REDACTED]");
  }

  return output;
}

function demoServiceUrl(serviceName, variableName, env) {
  const service = backendServices.find((entry) => entry.name === serviceName);
  if (!service) throw new Error(`demo_seed_${serviceName}_inventory_missing`);

  const configured = env[variableName];
  const value =
    typeof configured === "string" && configured.trim()
      ? configured.trim()
      : `http://127.0.0.1:${service.httpPort}`;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`demo_seed_${serviceName}_url_invalid`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`demo_seed_${serviceName}_url_invalid`);
  }

  return value.replace(/\/+$/, "");
}

async function requestDemoJson(
  label,
  url,
  { method = "GET", body, accessToken, acceptedStatuses, fetchImpl },
) {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(`demo_seed_${label}_request_failed`);
  }

  const allowed = acceptedStatuses ?? [200, 201];
  if (!allowed.includes(response.status)) {
    throw new Error(`demo_seed_${label}_http_${response.status}`);
  }
  if (response.status === 404 || response.status === 204) {
    return { status: response.status, data: null };
  }

  try {
    return { status: response.status, data: await response.json() };
  } catch {
    throw new Error(`demo_seed_${label}_invalid_json`);
  }
}

function isRecordWithData(value) {
  return isRecord(value) && Array.isArray(value.data);
}

export async function seedBackendDemo({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  if (
    String(env.NODE_ENV ?? "development")
      .trim()
      .toLowerCase() === "production"
  ) {
    throw new Error("development_demo_seed_refused_in_production");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("demo_seed_fetch_unavailable");
  }

  const authUrl = demoServiceUrl("auth-service", "AUTH_HTTP_URL", env);
  const productUrl = demoServiceUrl("product-service", "PRODUCT_HTTP_URL", env);
  const blogUrl = demoServiceUrl("blog-service", "BLOG_HTTP_URL", env);
  const identifier = env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = env.SEED_ADMIN_PASS ?? "Admin123!";

  const login = await requestDemoJson("auth_login", `${authUrl}/auth/login`, {
    method: "POST",
    body: { identifier, password },
    acceptedStatuses: [200],
    fetchImpl,
  });
  const accessToken = isRecord(login.data) ? login.data.accessToken : undefined;
  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("demo_seed_auth_login_invalid_response");
  }

  const productQuery = new URL(`${productUrl}/products`);
  productQuery.searchParams.set("q", DEMO_PRODUCT.sku);
  productQuery.searchParams.set("limit", "100");
  const productList = await requestDemoJson(
    "product_lookup",
    productQuery.toString(),
    { acceptedStatuses: [200], fetchImpl },
  );
  if (!isRecordWithData(productList.data)) {
    throw new Error("demo_seed_product_lookup_invalid_response");
  }
  const existingProduct = productList.data.data.some(
    (entry) =>
      isRecord(entry) &&
      (entry.sku === DEMO_PRODUCT.sku || entry.slug === DEMO_PRODUCT.slug),
  );

  if (!existingProduct) {
    await requestDemoJson("product_create", `${productUrl}/products`, {
      method: "POST",
      accessToken,
      body: {
        data: {
          slug: DEMO_PRODUCT.slug,
          sku: DEMO_PRODUCT.sku,
          title: DEMO_PRODUCT.title,
          description: "Development product created through product-service.",
          excerpt: "Stable local development product.",
          price: 99,
          status: "ACTIVE",
          tags: ["demo"],
        },
      },
      acceptedStatuses: [201],
      fetchImpl,
    });
  }
  logger.log(
    `[backend] demo seed: product=${existingProduct ? "existing" : "created"}`,
  );

  const blogLookup = await requestDemoJson(
    "blog_lookup",
    `${blogUrl}/blog/posts/${encodeURIComponent(DEMO_BLOG_POST.slug)}`,
    { acceptedStatuses: [200, 404], fetchImpl },
  );
  const existingBlogPost = blogLookup.status === 200;

  if (!existingBlogPost) {
    await requestDemoJson("blog_create", `${blogUrl}/blog/posts`, {
      method: "POST",
      accessToken,
      body: {
        data: {
          slug: DEMO_BLOG_POST.slug,
          title: DEMO_BLOG_POST.title,
          body: "NebulaNV local development content created through blog-service.",
          excerpt: "Stable local development blog post.",
          status: "PUBLISHED",
          tags: ["demo"],
          categories: ["general"],
        },
      },
      acceptedStatuses: [201],
      fetchImpl,
    });
  }
  logger.log(
    `[backend] demo seed: blog=${existingBlogPost ? "existing" : "created"}`,
  );

  return {
    product: existingProduct ? "existing" : "created",
    blog: existingBlogPost ? "existing" : "created",
  };
}

function writeCaptured(stream, value, env) {
  const sanitized = sanitizeOutput(value, env);
  if (sanitized) stream.write(sanitized);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env ?? process.env,
    encoding: options.capture ? "utf8" : undefined,
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (options.capture && options.emitCaptured !== false) {
    writeCaptured(process.stdout, result.stdout, options.env ?? process.env);
    writeCaptured(process.stderr, result.stderr, options.env ?? process.env);
  }
  if (result.error) throw result.error;
  return result;
}

function runPnpm(args, options = {}) {
  const invocation = pnpmInvocation(options.env);
  return run(invocation.command, [...invocation.prefixArgs, ...args], options);
}

async function runBinary(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env ?? process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 16_384) stderr += chunk;
  });

  const close = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (status, signal) => resolve({ status, signal }));
  });
  const streams = [];

  if (options.inputPath) {
    streams.push(pipeline(createReadStream(options.inputPath), child.stdin));
  } else {
    child.stdin.end();
  }
  if (options.outputPath) {
    streams.push(
      pipeline(
        child.stdout,
        createWriteStream(options.outputPath, { flags: "wx" }),
      ),
    );
  } else {
    child.stdout.resume();
  }

  let result;
  try {
    [result] = await Promise.all([close, ...streams]);
  } catch (error) {
    child.kill();
    throw error;
  }

  return { ...result, stderr: sanitizeOutput(stderr, options.env) };
}

export function buildPrismaArgs(operation, service) {
  const operationArgs = PRISMA_OPERATIONS[operation];
  if (!operationArgs) throw new Error(`unknown_prisma_operation_${operation}`);
  if (!service?.packageName || service.database === null) {
    throw new Error("prisma_service_invalid");
  }
  return ["--filter", service.packageName, ...operationArgs];
}

export function runPrismaOperation(
  operation,
  {
    services = prismaServices,
    env = process.env,
    environmentFor = () => env,
    execute = runPnpm,
    logger = console,
  } = {},
) {
  if (!PRISMA_OPERATIONS[operation]) {
    throw new Error(`unknown_prisma_operation_${operation}`);
  }

  for (const service of services) {
    const serviceEnv = environmentFor(service);
    logger.log(
      `[backend] prisma ${operation}: ${service.name} (${service.database})`,
    );
    let result;
    try {
      result = execute(buildPrismaArgs(operation, service), {
        env: serviceEnv,
        capture: operation !== "migrate-dev",
      });
    } catch {
      throw new Error(
        `prisma_${operation}_${service.name}_${service.database}_failed_to_start`,
      );
    }

    if (result.status !== 0) {
      throw new Error(
        `prisma_${operation}_${service.name}_${service.database}_failed_exit_${result.status ?? "unknown"}`,
      );
    }
  }
}

function ensureExample(target, example) {
  const targetPath = path.resolve(repositoryRoot, target);
  const examplePath = path.resolve(repositoryRoot, example);
  if (existsSync(targetPath)) return;
  if (!existsSync(examplePath)) {
    throw new Error(`missing_environment_example_${example}`);
  }
  copyFileSync(examplePath, targetPath);
}

function databaseEnv(database, env = process.env) {
  return {
    ...env,
    DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:15432/${database}?schema=public`,
    SHADOW_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:15432/postgres?schema=${database}_shadow`,
  };
}

const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

function assertDatabaseName(database) {
  if (!DATABASE_NAME_PATTERN.test(database)) {
    throw new Error("local_database_name_invalid");
  }
  return database;
}

function dockerExecutable(platform = process.platform) {
  return platform === "win32" ? "docker.exe" : "docker";
}

function runCompose(
  args,
  {
    label,
    env = process.env,
    execute = run,
    platform = process.platform,
    ...options
  } = {},
) {
  const result = execute(dockerExecutable(platform), ["compose", ...args], {
    env,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `docker_compose_${label ?? "command"}_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  return result;
}

function runPostgresTool(
  args,
  {
    label,
    env = process.env,
    execute = run,
    emitCaptured = true,
    platform = process.platform,
  } = {},
) {
  const result = execute(
    dockerExecutable(platform),
    ["compose", "exec", "-T", "postgres", ...args],
    { env, capture: true, emitCaptured },
  );
  if (result.status !== 0) {
    throw new Error(
      `local_postgres_${label ?? "command"}_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  return result;
}

function disposableDatabaseName(database, runId) {
  const safeId = String(runId)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  if (!safeId) throw new Error("migration_verification_run_id_invalid");
  return assertDatabaseName(`${database}_verify_${safeId}`);
}

function dropDisposableDatabase(database, options) {
  if (!database.includes("_verify_")) {
    throw new Error("refused_to_drop_non_disposable_database");
  }
  runPostgresTool(
    ["dropdb", "--username", "postgres", "--if-exists", "--force", database],
    { ...options, label: `drop_${database}` },
  );
}

export function disposableMigrationServices(
  services = prismaServices,
  runId = randomUUID(),
) {
  return services.map((service) =>
    Object.freeze({
      ...service,
      database: disposableDatabaseName(service.database, runId),
    }),
  );
}

export function verifyCleanMigrations({
  services = prismaServices,
  env = process.env,
  executeDocker = run,
  executePrisma = runPnpm,
  logger = console,
  runId = randomUUID(),
} = {}) {
  const disposable = disposableMigrationServices(services, runId);
  const created = [];
  let failure;

  try {
    runPostgresTool(
      ["pg_isready", "--username", "postgres", "--dbname", "postgres"],
      {
        label: "readiness",
        env,
        execute: executeDocker,
      },
    );

    for (const service of disposable) {
      runPostgresTool(
        [
          "createdb",
          "--username",
          "postgres",
          "--template",
          "template0",
          service.database,
        ],
        {
          label: `create_${service.database}`,
          env,
          execute: executeDocker,
        },
      );
      created.push(service.database);

      const serviceEnv = databaseEnv(service.database, env);
      runPrismaOperation("migrate-deploy", {
        services: [service],
        env: serviceEnv,
        execute: executePrisma,
        logger,
      });
      runPrismaOperation("migrate-status", {
        services: [service],
        env: serviceEnv,
        execute: executePrisma,
        logger,
      });
    }
  } catch (error) {
    failure = error;
  }

  let cleanupFailure;
  for (const database of created.reverse()) {
    try {
      dropDisposableDatabase(database, {
        env,
        execute: executeDocker,
      });
    } catch (error) {
      cleanupFailure ??= error;
    }
  }

  if (failure) throw failure;
  if (cleanupFailure) throw cleanupFailure;
  return disposable.map((service) => service.database);
}

export const RESTORE_CONFIRMATION = "RESTORE_LOCAL_DATABASES";
export const BACKUP_MANIFEST = "manifest.json";

function resolveBackupDirectory(input, { mustExist = false } = {}) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("backup_directory_required");
  }
  const resolved = path.resolve(repositoryRoot, input.trim());
  if (resolved === repositoryRoot || resolved === path.parse(resolved).root) {
    throw new Error("backup_directory_unsafe");
  }
  if (
    mustExist &&
    (!existsSync(resolved) || !statSync(resolved).isDirectory())
  ) {
    throw new Error("backup_directory_missing");
  }
  return resolved;
}

function backupManifest() {
  return {
    version: 1,
    format: "postgres-custom",
    createdAt: new Date().toISOString(),
    databases: prismaServices.map((service) => ({
      service: service.name,
      database: service.database,
      file: `${service.database}.dump`,
    })),
  };
}

export function validateBackupManifest(value) {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.format !== "postgres-custom" ||
    !Array.isArray(value.databases)
  ) {
    throw new Error("backup_manifest_invalid");
  }

  const expected = backupManifest().databases;
  if (value.databases.length !== expected.length) {
    throw new Error("backup_manifest_database_inventory_mismatch");
  }

  for (let index = 0; index < expected.length; index += 1) {
    const actual = value.databases[index];
    const wanted = expected[index];
    if (
      !isRecord(actual) ||
      actual.service !== wanted.service ||
      actual.database !== wanted.database ||
      actual.file !== wanted.file
    ) {
      throw new Error("backup_manifest_database_inventory_mismatch");
    }
  }

  return value;
}

function runningBackendServices({
  env = process.env,
  execute = run,
  platform = process.platform,
} = {}) {
  const result = execute(
    dockerExecutable(platform),
    ["compose", "ps", "--services", "--status", "running"],
    { env, capture: true, emitCaptured: false },
  );
  if (result.status !== 0) {
    throw new Error(
      `docker_compose_running_services_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  const running = new Set(
    String(result.stdout ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return backendServices
    .map((service) => service.dockerService)
    .filter((service) => running.has(service));
}

function assertDatabaseMaintenance(options) {
  const running = runningBackendServices(options);
  if (running.length > 0) {
    throw new Error(`backend_services_must_be_stopped_${running.join("_")}`);
  }
  runPostgresTool(
    ["pg_isready", "--username", "postgres", "--dbname", "postgres"],
    {
      label: "readiness",
      env: options?.env,
      execute: options?.execute,
      platform: options?.platform,
    },
  );
}

function dockerPostgresBinaryArgs(tool, args) {
  return ["compose", "exec", "-T", "postgres", tool, ...args];
}

export async function backupLocalDatabases(
  directory,
  {
    env = process.env,
    execute = run,
    executeBinary = runBinary,
    logger = console,
    platform = process.platform,
  } = {},
) {
  const target = resolveBackupDirectory(directory);
  if (existsSync(target)) throw new Error("backup_directory_already_exists");

  assertDatabaseMaintenance({ env, execute, platform });
  mkdirSync(path.dirname(target), { recursive: true });
  mkdirSync(target);
  let completed = false;

  try {
    const manifest = backupManifest();
    for (const entry of manifest.databases) {
      const outputPath = path.join(target, entry.file);
      logger.log(`[backend] backup: ${entry.service} (${entry.database})`);
      let result;
      try {
        result = await executeBinary(
          dockerExecutable(platform),
          dockerPostgresBinaryArgs("pg_dump", [
            "--username",
            "postgres",
            "--format=custom",
            "--no-owner",
            "--no-privileges",
            "--dbname",
            entry.database,
          ]),
          { env, outputPath },
        );
      } catch {
        throw new Error(`backup_${entry.database}_failed_to_start`);
      }
      if (result.status !== 0) {
        throw new Error(
          `backup_${entry.database}_failed_exit_${result.status ?? "unknown"}`,
        );
      }
    }

    writeFileSync(
      path.join(target, BACKUP_MANIFEST),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    completed = true;
    return target;
  } finally {
    if (!completed) rmSync(target, { recursive: true, force: true });
  }
}

export async function restoreLocalDatabases(
  directory,
  confirmation,
  {
    env = process.env,
    execute = run,
    executeBinary = runBinary,
    logger = console,
    platform = process.platform,
  } = {},
) {
  if (confirmation !== RESTORE_CONFIRMATION) {
    throw new Error("restore_confirmation_required");
  }

  const source = resolveBackupDirectory(directory, { mustExist: true });
  const manifestPath = path.join(source, BACKUP_MANIFEST);
  if (!existsSync(manifestPath)) throw new Error("backup_manifest_missing");

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error("backup_manifest_invalid");
  }
  const manifest = validateBackupManifest(parsed);
  for (const entry of manifest.databases) {
    const dumpPath = path.join(source, entry.file);
    if (!existsSync(dumpPath) || !statSync(dumpPath).isFile()) {
      throw new Error(`backup_${entry.database}_dump_missing`);
    }
  }

  assertDatabaseMaintenance({ env, execute, platform });

  for (const entry of manifest.databases) {
    const database = assertDatabaseName(entry.database);
    logger.log(`[backend] restore: ${entry.service} (${database})`);
    runPostgresTool(
      ["dropdb", "--username", "postgres", "--if-exists", "--force", database],
      { label: `drop_${database}`, env, execute, platform },
    );
    runPostgresTool(
      [
        "createdb",
        "--username",
        "postgres",
        "--template",
        "template0",
        database,
      ],
      { label: `create_${database}`, env, execute, platform },
    );

    let result;
    try {
      result = await executeBinary(
        dockerExecutable(platform),
        dockerPostgresBinaryArgs("pg_restore", [
          "--username",
          "postgres",
          "--dbname",
          database,
          "--no-owner",
          "--no-privileges",
          "--exit-on-error",
        ]),
        { env, inputPath: path.join(source, entry.file) },
      );
    } catch {
      throw new Error(`restore_${database}_failed_to_start`);
    }
    if (result.status !== 0) {
      throw new Error(
        `restore_${database}_failed_exit_${result.status ?? "unknown"}`,
      );
    }
  }
}

const RECOVERY_PROBE_HEX = "0001027f80feff";

function createLocalDatabase(database, options) {
  runPostgresTool(
    [
      "createdb",
      "--username",
      "postgres",
      "--template",
      "template0",
      assertDatabaseName(database),
    ],
    { ...options, label: `create_${database}` },
  );
}

function queryLocalDatabase(database, sql, options) {
  return runPostgresTool(
    [
      "psql",
      "--username",
      "postgres",
      "--dbname",
      assertDatabaseName(database),
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command",
      sql,
    ],
    { ...options, label: `query_${database}`, emitCaptured: false },
  );
}

async function verifyBinaryRecoveryRoundTrip({
  env,
  executeDocker,
  executeBinary,
  platform,
  temporary,
  runId,
}) {
  const safeRunId = String(runId)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  if (!safeRunId) throw new Error("recovery_verification_run_id_invalid");
  const database = assertDatabaseName(`nebula_recovery_verify_${safeRunId}`);
  const dumpPath = path.join(temporary, `${database}.dump`);
  let created = false;

  try {
    createLocalDatabase(database, {
      env,
      execute: executeDocker,
      platform,
    });
    created = true;
    queryLocalDatabase(
      database,
      `CREATE TABLE recovery_probe (id integer PRIMARY KEY, payload bytea NOT NULL); INSERT INTO recovery_probe (id, payload) VALUES (1, decode('${RECOVERY_PROBE_HEX}', 'hex'));`,
      { env, execute: executeDocker, platform },
    );

    const dump = await executeBinary(
      dockerExecutable(platform),
      dockerPostgresBinaryArgs("pg_dump", [
        "--username",
        "postgres",
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        database,
      ]),
      { env, outputPath: dumpPath },
    );
    if (dump.status !== 0) {
      throw new Error(
        `recovery_probe_backup_failed_exit_${dump.status ?? "unknown"}`,
      );
    }

    dropDisposableDatabase(database, {
      env,
      execute: executeDocker,
      platform,
    });
    created = false;
    createLocalDatabase(database, {
      env,
      execute: executeDocker,
      platform,
    });
    created = true;

    const restore = await executeBinary(
      dockerExecutable(platform),
      dockerPostgresBinaryArgs("pg_restore", [
        "--username",
        "postgres",
        "--dbname",
        database,
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
      ]),
      { env, inputPath: dumpPath },
    );
    if (restore.status !== 0) {
      throw new Error(
        `recovery_probe_restore_failed_exit_${restore.status ?? "unknown"}`,
      );
    }

    const probe = queryLocalDatabase(
      database,
      "SELECT encode(payload, 'hex') FROM recovery_probe WHERE id = 1;",
      { env, execute: executeDocker, platform },
    );
    if (String(probe.stdout ?? "").trim() !== RECOVERY_PROBE_HEX) {
      throw new Error("recovery_probe_binary_mismatch");
    }
  } finally {
    if (created) {
      dropDisposableDatabase(database, {
        env,
        execute: executeDocker,
        platform,
      });
    }
  }
}

function copyPrismaWithIntentionalFailure(service, temporary) {
  const source = path.join(repositoryRoot, service.directory, "prisma");
  const target = path.join(temporary, `${service.name}-prisma`);
  cpSync(source, target, {
    recursive: true,
    filter: (entry) => !entry.includes(`${path.sep}generated`),
  });
  const migration = path.join(
    target,
    "migrations",
    "99999999999999_intentional_recovery_failure",
  );
  mkdirSync(migration, { recursive: true });
  writeFileSync(
    path.join(migration, "migration.sql"),
    "THIS IS INTENTIONALLY INVALID SQL;\n",
    { encoding: "utf8", flag: "wx" },
  );
  return path.join(target, "schema.prisma");
}

function replacePrismaSchemaArg(args, schemaPath) {
  const next = [...args];
  const schemaIndex = next.indexOf("./prisma/schema.prisma");
  if (schemaIndex === -1) throw new Error("prisma_schema_argument_missing");
  next[schemaIndex] = schemaPath;
  return next;
}

async function verifyMigrationFailureRecovery({
  env,
  executeDocker,
  executePrisma,
  logger,
  platform,
  temporary,
  runId,
}) {
  const services = disposableMigrationServices(
    prismaServices.slice(0, 3),
    `${runId}failure`,
  );
  const failingService = services[1];
  const laterService = services[2];
  const failingSchema = copyPrismaWithIntentionalFailure(
    failingService,
    temporary,
  );
  const created = [];
  let failure;

  try {
    for (const service of services) {
      createLocalDatabase(service.database, {
        env,
        execute: executeDocker,
        platform,
      });
      created.push(service.database);
    }

    const executeWithFailure = (args, options) => {
      const isFailingDeploy =
        args[1] === failingService.packageName && args.includes("deploy");
      return executePrisma(
        isFailingDeploy ? replacePrismaSchemaArg(args, failingSchema) : args,
        isFailingDeploy ? { ...options, emitCaptured: false } : options,
      );
    };

    try {
      runPrismaOperation("migrate-deploy", {
        services,
        env,
        environmentFor: (service) => databaseEnv(service.database, env),
        execute: executeWithFailure,
        logger,
      });
      throw new Error("intentional_migration_failure_did_not_fail");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes(failingService.name)
      ) {
        throw error;
      }
    }

    const laterState = queryLocalDatabase(
      laterService.database,
      "SELECT to_regclass('public._prisma_migrations') IS NULL;",
      { env, execute: executeDocker, platform },
    );
    if (String(laterState.stdout ?? "").trim() !== "t") {
      throw new Error("migration_failure_did_not_stop_later_service");
    }

    dropDisposableDatabase(failingService.database, {
      env,
      execute: executeDocker,
      platform,
    });
    const failedIndex = created.indexOf(failingService.database);
    if (failedIndex === -1)
      throw new Error("recovery_database_tracking_failed");
    created.splice(failedIndex, 1);
    createLocalDatabase(failingService.database, {
      env,
      execute: executeDocker,
      platform,
    });
    created.push(failingService.database);

    const recoveredEnv = databaseEnv(failingService.database, env);
    runPrismaOperation("migrate-deploy", {
      services: [failingService],
      env: recoveredEnv,
      execute: executePrisma,
      logger,
    });
    runPrismaOperation("migrate-status", {
      services: [failingService],
      env: recoveredEnv,
      execute: executePrisma,
      logger,
    });
  } catch (error) {
    failure = error;
  }

  let cleanupFailure;
  for (const database of created.reverse()) {
    try {
      dropDisposableDatabase(database, {
        env,
        execute: executeDocker,
        platform,
      });
    } catch (error) {
      cleanupFailure ??= error;
    }
  }
  if (failure) throw failure;
  if (cleanupFailure) throw cleanupFailure;
}

export async function verifyDatabaseRecovery({
  env = process.env,
  executeDocker = run,
  executeBinary = runBinary,
  executePrisma = runPnpm,
  logger = console,
  platform = process.platform,
  runId = randomUUID(),
} = {}) {
  const temporary = mkdtempSync(
    path.join(tmpdir(), "nebula-database-recovery-"),
  );
  try {
    runPostgresTool(
      ["pg_isready", "--username", "postgres", "--dbname", "postgres"],
      { label: "readiness", env, execute: executeDocker, platform },
    );
    await verifyBinaryRecoveryRoundTrip({
      env,
      executeDocker,
      executeBinary,
      platform,
      temporary,
      runId,
    });
    await verifyMigrationFailureRecovery({
      env,
      executeDocker,
      executePrisma,
      logger,
      platform,
      temporary,
      runId,
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function expectedDatabaseNames(services = prismaServices) {
  return services.map((service) => service.database);
}

export function missingExpectedDatabases(output, services = prismaServices) {
  const existing = new Set(
    String(output ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return expectedDatabaseNames(services).filter(
    (database) => !existing.has(database),
  );
}

export async function waitForExpectedDatabases({
  env = process.env,
  execute = run,
  logger = console,
  now = Date.now,
  platform = process.platform,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = 120_000,
} = {}) {
  const deadline = now() + timeoutMs;
  let missing = expectedDatabaseNames();

  while (now() < deadline) {
    const result = execute(
      dockerExecutable(platform),
      [
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "--username",
        "postgres",
        "--dbname",
        "postgres",
        "--tuples-only",
        "--no-align",
        "--command",
        "SELECT datname FROM pg_database;",
      ],
      { env, capture: true, emitCaptured: false },
    );
    if (result.status === 0) {
      missing = missingExpectedDatabases(result.stdout);
      if (missing.length === 0) {
        logger.log("[backend] database inventory is ready");
        return;
      }
    }
    await sleep(2_000);
  }

  throw new Error(`expected_databases_wait_timed_out_${missing.join("_")}`);
}

async function requestBackendHealth(service, fetchImpl) {
  const url = `http://127.0.0.1:${service.httpPort}/health/ready`;
  const response = await fetchImpl(url, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || body?.status !== "ok" || body?.service !== service.name) {
    throw new Error(`backend_health_invalid_${service.name}`);
  }
  return { service: service.name, url, body };
}

async function waitForHealth(
  service,
  deadline,
  {
    fetchImpl = fetch,
    now = Date.now,
    sleep = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  while (now() < deadline) {
    try {
      return await requestBackendHealth(service, fetchImpl);
    } catch {
      // The service may still be starting. Retry until the shared deadline.
    }
    await sleep(2_000);
  }
  throw new Error(`health_wait_timed_out_${service.name}`);
}

export async function checkBackendHealth({
  fetchImpl = fetch,
  logger = console,
  services = backendServices,
} = {}) {
  const results = [];
  for (const service of services) {
    let result;
    try {
      result = await requestBackendHealth(service, fetchImpl);
    } catch {
      throw new Error(`backend_health_failed_${service.name}`);
    }
    logger.log(`[backend] health: ${service.name}=ok`);
    results.push(result);
  }
  return results;
}

export function downBackend({
  env = process.env,
  execute = run,
  logger = console,
  platform = process.platform,
} = {}) {
  runCompose(["down"], {
    label: "down",
    env,
    execute,
    platform,
  });
  logger.log("[backend] stack stopped; named volumes were preserved");
}

export function ensureBackendEnvironment() {
  ensureExample(".env", ".env.example");
  for (const service of backendServices) {
    ensureExample(
      `${service.directory}/.env`,
      `${service.directory}/.env.example`,
    );
  }
}

export async function provisionBackend({
  ensureEnvironment = ensureBackendEnvironment,
  env = process.env,
  executeDocker = run,
  executePnpm = runPnpm,
  fetchImpl = fetch,
  logger = console,
  now = Date.now,
  platform = process.platform,
  seedDemo = seedBackendDemo,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  ensureEnvironment();

  runCompose(
    [
      "up",
      "-d",
      "--wait",
      "--wait-timeout",
      "120",
      "postgres",
      "redis",
      "minio",
    ],
    {
      label: "infrastructure",
      env,
      execute: executeDocker,
      platform,
    },
  );

  await waitForExpectedDatabases({
    env,
    execute: executeDocker,
    logger,
    now,
    platform,
    sleep,
  });

  runPrismaOperation("migrate-deploy", {
    env,
    environmentFor: (service) => databaseEnv(service.database, env),
    execute: executePnpm,
    logger,
  });
  runPrismaOperation("migrate-status", {
    env,
    environmentFor: (service) => databaseEnv(service.database, env),
    execute: executePnpm,
    logger,
  });
  runPrismaOperation("seed", {
    env,
    environmentFor: (service) => databaseEnv(service.database, env),
    execute: executePnpm,
    logger,
  });

  const build = executePnpm(["run", "docker:build:backend"], { env });
  if (build.status !== 0) {
    throw new Error(
      `backend_image_build_failed_exit_${build.status ?? "unknown"}`,
    );
  }

  runCompose(["up", "-d", "--no-build"], {
    label: "services",
    env,
    execute: executeDocker,
    platform,
  });

  const deadline = now() + 240_000;
  await Promise.all(
    backendServices.map((service) =>
      waitForHealth(service, deadline, { fetchImpl, now, sleep }),
    ),
  );
  await seedDemo({ env, fetchImpl, logger });
  logger.log("[backend] boot complete; all backend services are ready");
}

export function buildDevCommands(services = backendServices) {
  return services.map(
    (service) => `pnpm run dev:${service.name.replace(/-service$/, "")}`,
  );
}

const BACKEND_QUALITY_TASKS = new Set(["lint", "check-types", "build"]);

export function buildBackendQualityArgs(task, services = backendServices) {
  if (!BACKEND_QUALITY_TASKS.has(task)) {
    throw new Error(`unknown_backend_quality_task_${task}`);
  }

  return [
    "exec",
    "turbo",
    "run",
    task,
    ...services.map((service) => `--filter=${service.packageName}...`),
  ];
}

export function runBackendQualityTask(
  task,
  {
    env = process.env,
    execute = runPnpm,
    logger = console,
    services = backendServices,
  } = {},
) {
  const result = execute(buildBackendQualityArgs(task, services), { env });
  if (result.status !== 0) {
    throw new Error(
      `backend_${task}_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  logger.log(`[backend] ${task} complete for ${services.length} services`);
}

function runBackendDev() {
  const result = runPnpm([
    "exec",
    "concurrently",
    "-k",
    "-s",
    "first",
    ...buildDevCommands(),
  ]);
  if (result.status !== 0) {
    throw new Error(`backend_dev_failed_exit_${result.status ?? "unknown"}`);
  }
}

export function releaseImages(prefix = "nebulanv-main", tag = "latest") {
  const safeImagePart = /^[A-Za-z0-9][A-Za-z0-9._/:=-]*$/;
  if (!safeImagePart.test(prefix) || !safeImagePart.test(tag)) {
    throw new Error("release_image_name_invalid");
  }
  return backendServices.map(
    (service) => `${prefix}-${service.dockerService}:${tag}`,
  );
}

export function buildBackendImages({
  clean = false,
  env = process.env,
  execute = run,
  logger = console,
  platform = process.platform,
  pull = clean,
  services = backendServices,
} = {}) {
  for (const [index, service] of services.entries()) {
    logger.log(
      `[backend] image build ${index + 1}/${services.length}: ${service.dockerService}`,
    );
    const args = [
      "buildx",
      "bake",
      service.dockerService,
      "--load",
      "--progress=plain",
    ];
    if (pull && index === 0) args.push("--pull");
    if (clean) {
      args.push(`--set=${service.dockerService}.args.TURBO_FORCE=1`);
      if (index === 0) args.push("--no-cache");
    }

    const result = execute(dockerExecutable(platform), args, { env });
    if (result.status !== 0) {
      throw new Error(
        `backend_image_${service.dockerService}_failed_exit_${result.status ?? "unknown"}`,
      );
    }
  }
  logger.log("[backend] all backend images built sequentially");
}

function usage() {
  return [
    "Usage:",
    "  node scripts/backend.mjs boot",
    "  node scripts/backend.mjs environment",
    "  node scripts/backend.mjs provision  # compatibility alias",
    "  node scripts/backend.mjs health",
    "  node scripts/backend.mjs down",
    "  node scripts/backend.mjs quality <lint|check-types|build>",
    "  node scripts/backend.mjs build-images [--pull|--clean]",
    "  node scripts/backend.mjs prisma <generate|migrate-dev|migrate-deploy|migrate-status|push|seed>",
    "  node scripts/backend.mjs seed",
    "  node scripts/backend.mjs database verify-migrations",
    "  node scripts/backend.mjs database backup <directory>",
    `  node scripts/backend.mjs database restore <directory> --confirm=${RESTORE_CONFIRMATION}`,
    "  node scripts/backend.mjs database test-recovery",
    "  node scripts/backend.mjs dev",
    "  node scripts/backend.mjs images [prefix] [tag]",
  ].join("\n");
}

export async function main(args = process.argv.slice(2)) {
  const [command, operation, extra, confirmationArg, unexpected] = args;

  if ((command === "boot" || command === "provision") && !operation) {
    await provisionBackend();
    return;
  }
  if (command === "environment" && !operation) {
    ensureBackendEnvironment();
    console.log("[backend] local environment files are ready");
    return;
  }
  if (command === "health" && !operation) {
    await checkBackendHealth();
    return;
  }
  if (command === "down" && !operation) {
    downBackend();
    return;
  }
  if (command === "quality" && operation && !extra) {
    runBackendQualityTask(operation);
    return;
  }
  if (command === "build-images" && !confirmationArg && !unexpected) {
    const flags = [operation, extra].filter(Boolean);
    if (
      flags.every((flag) => flag === "--pull" || flag === "--clean") &&
      new Set(flags).size === flags.length
    ) {
      const clean = flags.includes("--clean");
      buildBackendImages({
        clean,
        pull: clean || flags.includes("--pull"),
      });
      return;
    }
  }
  if (command === "prisma" && operation && !extra) {
    runPrismaOperation(operation);
    return;
  }
  if (command === "seed" && !operation) {
    await seedBackendDemo();
    return;
  }
  if (command === "database" && operation === "verify-migrations" && !extra) {
    verifyCleanMigrations();
    return;
  }
  if (
    command === "database" &&
    operation === "backup" &&
    extra &&
    !confirmationArg
  ) {
    const target = await backupLocalDatabases(extra);
    console.log(`[backend] backup complete: ${target}`);
    return;
  }
  if (
    command === "database" &&
    operation === "restore" &&
    extra &&
    confirmationArg?.startsWith("--confirm=") &&
    !unexpected
  ) {
    await restoreLocalDatabases(
      extra,
      confirmationArg.slice("--confirm=".length),
    );
    console.log("[backend] restore complete");
    return;
  }
  if (command === "database" && operation === "test-recovery" && !extra) {
    await verifyDatabaseRecovery();
    console.log("[backend] database recovery verification complete");
    return;
  }
  if (command === "dev" && !operation) {
    runBackendDev();
    return;
  }
  if (command === "images") {
    process.stdout.write(
      `${JSON.stringify(releaseImages(operation, extra))}\n`,
    );
    return;
  }

  throw new Error(usage());
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "backend_tool_failed";
    console.error(sanitizeOutput(message));
    process.exitCode = 1;
  });
}
