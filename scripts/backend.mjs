import {
  copyFileSync,
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
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
  "transport",
];

const BACKEND_TRANSPORTS = new Set(["http", "http-grpc"]);

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
      if (!BACKEND_TRANSPORTS.has(service.transport)) {
        throw new Error(`backend_inventory_${index}_transport_invalid`);
      }
      if (typeof service.compose !== "boolean") {
        throw new Error(`backend_inventory_${index}_compose_invalid`);
      }
      if (!Number.isInteger(service.httpPort)) {
        throw new Error(`backend_inventory_${index}_http_port_invalid`);
      }
      if (
        service.transport === "http-grpc" &&
        !Number.isInteger(service.grpcPort)
      ) {
        throw new Error(`backend_inventory_${index}_grpc_port_invalid`);
      }
      if (service.transport === "http" && service.grpcPort !== undefined) {
        throw new Error(`backend_inventory_${index}_grpc_port_forbidden`);
      }
      if (names.has(service.name) || packages.has(service.packageName)) {
        throw new Error(`backend_inventory_${index}_identity_duplicate`);
      }
      if (
        ports.has(service.httpPort) ||
        (service.grpcPort !== undefined && ports.has(service.grpcPort))
      ) {
        throw new Error(`backend_inventory_${index}_port_duplicate`);
      }

      names.add(service.name);
      packages.add(service.packageName);
      ports.add(service.httpPort);
      if (service.grpcPort !== undefined) ports.add(service.grpcPort);

      return Object.freeze({ ...service });
    }),
  );
}

export const backendServices = loadBackendServices();
export const hybridServices = Object.freeze(
  backendServices.filter((service) => service.transport === "http-grpc"),
);
export const prismaServices = Object.freeze(
  backendServices.filter((service) => service.database !== null),
);
export const composeServices = Object.freeze(
  backendServices.filter((service) => service.compose),
);

export const SECURITY_REPORT_DIRECTORY = path.join(
  repositoryRoot,
  ".security-reports",
);

export const CI_EVIDENCE_DIRECTORY = path.join(repositoryRoot, ".ci-evidence");

export const TRIVY_DB_REPOSITORIES = Object.freeze([
  "aquasec/trivy-db:2",
  "ghcr.io/aquasecurity/trivy-db:2",
]);

export const TRIVY_SOURCE_SKIP_DIRECTORIES = Object.freeze([
  ".git",
  "**/.git",
  ".next",
  "**/.next",
  ".nebula-backups",
  ".security-reports",
  "apps/web",
  "build",
  "**/build",
  "coverage",
  "**/coverage",
  "dist",
  "**/dist",
  "generated",
  "**/generated",
  "node_modules",
  "**/node_modules",
  "vendor",
  "**/vendor",
]);

export const TRIVY_SOURCE_SKIP_FILES = Object.freeze([
  ".env",
  "**/.env",
  ".env.local",
  "**/.env.local",
  "deploy/.env.production",
]);

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

const SENSITIVE_ENV_NAME_PATTERN =
  /(?:PASS(?:WORD)?|SECRET|TOKEN|DATABASE_URL|SHADOW_DATABASE_URL)$/i;

export function sanitizeOutput(value, env = process.env) {
  let output = String(value ?? "");
  output = output.replace(
    /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/gi,
    "postgresql://[REDACTED]@",
  );

  for (const [name, secret] of Object.entries(env)) {
    if (
      !SENSITIVE_ENV_NAME_PATTERN.test(name) ||
      typeof secret !== "string" ||
      secret.length < 4
    ) {
      continue;
    }
    output = output.split(secret).join("[REDACTED]");
  }

  return output;
}

function evidenceRedactionEnvironment(env = process.env) {
  const redactionEnv = { ...env };
  const files = [
    ".env",
    "deploy/.env.production",
    ...backendServices.map((service) => `${service.directory}/.env`),
  ];
  let index = 0;

  for (const file of files) {
    const filePath = path.join(repositoryRoot, file);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match || !SENSITIVE_ENV_NAME_PATTERN.test(match[1])) continue;
      let secret = match[2].trim();
      if (
        secret.length >= 2 &&
        ((secret.startsWith('"') && secret.endsWith('"')) ||
          (secret.startsWith("'") && secret.endsWith("'")))
      ) {
        secret = secret.slice(1, -1);
      }
      if (secret.length < 4 || secret.startsWith("${")) continue;
      redactionEnv[`EVIDENCE_${index}_SECRET`] = secret;
      index += 1;
    }
  }

  return redactionEnv;
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
    input: options.input,
    encoding: options.capture ? "utf8" : undefined,
    maxBuffer: options.capture ? 64 * 1024 * 1024 : undefined,
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
    input,
    platform = process.platform,
  } = {},
) {
  const result = execute(
    dockerExecutable(platform),
    ["compose", "exec", "-T", "postgres", ...args],
    { env, capture: true, emitCaptured, input },
  );
  if (result.status !== 0) {
    // Preserve a closed SQL reason code without echoing SQL, rows, or credentials.
    const reason = String(result.stderr ?? "").match(
      /ERROR:\s+([a-z][a-z0-9_]*)(?=[:\s]|$)/,
    )?.[1];
    throw new Error(
      `local_postgres_${label ?? "command"}_failed_exit_${result.status ?? "unknown"}${reason ? `_${reason}` : ""}`,
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

export function dropDisposableDatabase(database, options) {
  assertDatabaseName(database);
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

export function migrationVerificationServices(scope) {
  if (scope === undefined) return prismaServices;
  if (scope === "tenant-authority") {
    return prismaServices.filter(
      (service) => service.packageName === "@nebula/tenant-authority-service",
    );
  }
  throw new Error(`migration_verification_scope_invalid_${scope}`);
}

export function verifyTenantAuthorityRegistrationRecords(
  database,
  { env = process.env, executeDocker = run, platform = process.platform } = {},
) {
  const evidenceSql = readFileSync(
    path.join(
      repositoryRoot,
      "scripts",
      "db",
      "verify-tenant-authority-records.sql",
    ),
    "utf8",
  );
  runPostgresTool(
    [
      "psql",
      "--username",
      "postgres",
      "--dbname",
      assertDatabaseName(database),
      "--set=ON_ERROR_STOP=1",
      "--command",
      evidenceSql,
    ],
    {
      label: `authority_registration_records_${database}`,
      env,
      execute: executeDocker,
      platform,
    },
  );
}

export function verifyTenantAuthorityDefaultSeed(
  database,
  { env = process.env, executeDocker = run, platform = process.platform } = {},
) {
  const evidenceSql = readFileSync(
    path.join(
      repositoryRoot,
      "scripts",
      "db",
      "verify-tenant-authority-seed.sql",
    ),
    "utf8",
  );
  runPostgresTool(
    [
      "psql",
      "--username",
      "postgres",
      "--dbname",
      assertDatabaseName(database),
      "--set=ON_ERROR_STOP=1",
      "--command",
      evidenceSql,
    ],
    {
      label: `authority_default_seed_${database}`,
      env,
      execute: executeDocker,
      platform,
    },
  );
}

function runPackageScript(
  packageName,
  script,
  { args = [], env = process.env, execute = runPnpm, input } = {},
) {
  const result = execute(
    [
      "--silent",
      "--filter",
      packageName,
      "run",
      script,
      ...(args.length === 0 ? [] : ["--", ...args]),
    ],
    { env, capture: true, emitCaptured: false, input },
  );
  if (result.status !== 0) {
    throw new Error(
      `package_script_${packageName}_${script}_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  return String(result.stdout ?? "").trim();
}

function capturedJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label}_output_invalid_json`);
  }
}

function verifySqlFile(
  database,
  relativePath,
  { env = process.env, execute = run, platform = process.platform } = {},
) {
  const sql = readFileSync(path.join(repositoryRoot, relativePath), "utf8");
  runPostgresTool(
    [
      "psql",
      "--username",
      "postgres",
      "--dbname",
      assertDatabaseName(database),
      "--set=ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    {
      label: `evidence_${database}`,
      env,
      execute,
      platform,
    },
  );
}

const F4_R2_MIGRATION = "20260905000100_default_actor_backfill";
const F4_R2_DEFAULT_ACTOR_SERVICES = Object.freeze([
  Object.freeze({
    packageName: "@nebula/tenant-authority-service",
    fixture: "scripts/db/f4-r2-tenant-authority-fixture.sql",
    verification: "scripts/db/verify-f4-r2-tenant-authority.sql",
    before: [
      "20260824000100_authority_foundation",
      "20260825000100_authority_registration_records",
      "20260825000200_entitlement_scope_reference",
      "20260826000100_authority_registration_audit",
      "20260826000200_membership_authority_foundation",
      "20260901000100_identity_control_plane_unused",
    ],
  }),
  Object.freeze({
    packageName: "@nebula/media-service",
    fixture: "scripts/db/f4-r2-media-fixture.sql",
    verification: "scripts/db/verify-f4-r2-media.sql",
    before: [
      "20251220074224_init_media",
      "20260225135328_add_access_class",
      "20260610000100_add_public_library_metadata",
      "20260629000100_add_media_context_metadata",
    ],
  }),
  Object.freeze({
    packageName: "@nebula/order-service",
    fixture: "scripts/db/f4-r2-order-fixture.sql",
    verification: "scripts/db/verify-f4-r2-order.sql",
    before: ["20251119063447_init_order"],
  }),
  Object.freeze({
    packageName: "@nebula/product-service",
    fixture: "scripts/db/f4-r2-product-fixture.sql",
    verification: "scripts/db/verify-f4-r2-product.sql",
    before: [
      "20251002054925_e_tr",
      "20260720131500_drop_stale_product_category_fk",
    ],
  }),
]);

function f4R2MigrationPaths(service) {
  const migrationsRoot = path.join(
    repositoryRoot,
    service.directory,
    "prisma",
    "migrations",
  );
  const names = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const r2Index = names.indexOf(F4_R2_MIGRATION);
  if (r2Index < 0) {
    throw new Error(`f4_r2_migration_missing_${service.name}`);
  }
  const expected = F4_R2_DEFAULT_ACTOR_SERVICES.find(
    (entry) => entry.packageName === service.packageName,
  ).before;
  if (JSON.stringify(names.slice(0, r2Index)) !== JSON.stringify(expected)) {
    throw new Error(`f4_r2_pre_migration_set_changed_${service.name}`);
  }
  const migrationPath = (name) =>
    path.join(migrationsRoot, name, "migration.sql");
  return Object.freeze({
    before: Object.freeze(names.slice(0, r2Index).map(migrationPath)),
    r2: migrationPath(F4_R2_MIGRATION),
  });
}

function executeSqlText(
  database,
  sql,
  { env = process.env, execute = run, platform = process.platform, label } = {},
) {
  runPostgresTool(
    [
      "psql",
      "--username",
      "postgres",
      "--dbname",
      assertDatabaseName(database),
      "--set=ON_ERROR_STOP=1",
      "--file=-",
    ],
    {
      label: label ?? `sql_${database}`,
      env,
      execute,
      emitCaptured: false,
      input: sql,
      platform,
    },
  );
}

function executeSqlFile(database, relativePath, options) {
  executeSqlText(
    database,
    readFileSync(path.join(repositoryRoot, relativePath), "utf8"),
    options,
  );
}

function expectSqlTextFailure(
  database,
  sql,
  expectedMessage,
  { env = process.env, execute = run, platform = process.platform } = {},
) {
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
      assertDatabaseName(database),
      "--set=ON_ERROR_STOP=1",
      "--file=-",
    ],
    { env, capture: true, emitCaptured: false, input: sql },
  );
  const reportedError = String(result.stderr ?? "")
    .match(/\bERROR:\s+([^\r\n]+)/)?.[1]
    ?.trim();
  if (
    !Number.isInteger(result.status) ||
    result.status === 0 ||
    reportedError !== expectedMessage
  ) {
    throw new Error(`f4_r2_expected_failure_missing_${expectedMessage}`);
  }
}

function applySqlMigrations(database, paths, options) {
  for (const migrationPath of paths) {
    executeSqlText(database, readFileSync(migrationPath, "utf8"), {
      ...options,
      label: `migration_${path.basename(path.dirname(migrationPath))}_${database}`,
    });
  }
}

export function verifyF4R2DefaultActors({
  env = process.env,
  executeDocker = run,
  executePnpm = runPnpm,
  logger = console,
  platform = process.platform,
  runId = randomUUID(),
} = {}) {
  const selected = F4_R2_DEFAULT_ACTOR_SERVICES.map((entry) => {
    const service = prismaServices.find(
      (candidate) => candidate.packageName === entry.packageName,
    );
    if (!service) throw new Error(`f4_r2_service_missing_${entry.packageName}`);
    return Object.freeze({ ...entry, service });
  });
  const successServices = disposableMigrationServices(
    selected.map((entry) => entry.service),
    runId,
  );
  const failureServices = selected
    .filter(({ service }) =>
      ["tenant-authority-service", "product-service"].includes(service.name),
    )
    .map(({ service }) =>
      Object.freeze({
        ...service,
        database: disposableDatabaseName(`${service.database}_rollback`, runId),
      }),
    );
  const created = [];
  let failure;

  const authorityEnv = (database) => ({
    ...databaseEnv(database, env),
    NODE_ENV: "development",
    AUTHORITY_AUDIT_HMAC_KEY_ID: "f4-r2-disposable-audit-v2",
    AUTHORITY_AUDIT_HMAC_KEY: "f4-r2-disposable-audit-integrity-key-only",
    AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID: "f4-r2-membership-v1",
    AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY:
      "f4-r2-membership-integrity-key-only-0001",
  });

  try {
    runPostgresTool(
      ["pg_isready", "--username", "postgres", "--dbname", "postgres"],
      { label: "readiness", env, execute: executeDocker, platform },
    );

    for (const [index, disposable] of successServices.entries()) {
      const entry = selected[index];
      const paths = f4R2MigrationPaths(entry.service);
      createLocalDatabase(disposable.database, {
        env,
        execute: executeDocker,
        platform,
      });
      created.push(disposable.database);
      applySqlMigrations(disposable.database, paths.before, {
        env,
        execute: executeDocker,
        platform,
      });
      const serviceEnv =
        entry.service.name === "tenant-authority-service"
          ? authorityEnv(disposable.database)
          : databaseEnv(disposable.database, env);
      if (entry.service.name === "tenant-authority-service") {
        runPrismaOperation("seed", {
          services: [disposable],
          env: serviceEnv,
          execute: executePnpm,
          logger,
        });
      }
      executeSqlFile(disposable.database, entry.fixture, {
        env,
        execute: executeDocker,
        platform,
      });
      applySqlMigrations(disposable.database, [paths.r2], {
        env,
        execute: executeDocker,
        platform,
      });
      if (entry.service.name === "tenant-authority-service") {
        for (let runIndex = 0; runIndex < 2; runIndex += 1) {
          runPackageScript(
            entry.service.packageName,
            "backfill:f4-default-actors",
            {
              env: serviceEnv,
              execute: executePnpm,
            },
          );
        }
        runPrismaOperation("seed", {
          services: [disposable],
          env: serviceEnv,
          execute: executePnpm,
          logger,
        });
        runPackageScript(
          entry.service.packageName,
          "backfill:f4-default-actors",
          {
            env: serviceEnv,
            execute: executePnpm,
          },
        );
      }
      executeSqlFile(disposable.database, entry.verification, {
        env,
        execute: executeDocker,
        platform,
      });
      logger.log(`[backend] F4 R2 upgrade/rerun verified: ${disposable.name}`);
    }

    for (const disposable of failureServices) {
      const entry = selected.find(
        ({ service }) => service.name === disposable.name,
      );
      const paths = f4R2MigrationPaths(entry.service);
      createLocalDatabase(disposable.database, {
        env,
        execute: executeDocker,
        platform,
      });
      created.push(disposable.database);
      applySqlMigrations(disposable.database, paths.before, {
        env,
        execute: executeDocker,
        platform,
      });
      const kind =
        disposable.name === "tenant-authority-service"
          ? "authority"
          : "product";
      executeSqlFile(
        disposable.database,
        `scripts/db/f4-r2-${kind}-rollback-fixture.sql`,
        { env, execute: executeDocker, platform },
      );
      expectSqlTextFailure(
        disposable.database,
        readFileSync(paths.r2, "utf8"),
        kind === "authority"
          ? "authority_default_actor_realm_missing"
          : "product_comment_legacy_user_id_invalid",
        { env, execute: executeDocker, platform },
      );
      executeSqlFile(
        disposable.database,
        `scripts/db/verify-f4-r2-${kind}-rollback.sql`,
        { env, execute: executeDocker, platform },
      );
      logger.log(
        `[backend] F4 R2 atomic rollback verified: ${disposable.name}`,
      );
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
        platform,
      });
    } catch (error) {
      cleanupFailure ??= error;
    }
  }

  if (failure && cleanupFailure) {
    throw new Error(`${failure.message}; cleanup: ${cleanupFailure.message}`);
  }
  if (failure) throw failure;
  if (cleanupFailure) throw cleanupFailure;
  return [...successServices, ...failureServices].map(
    (service) => service.database,
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
      if (service.packageName === "@nebula/tenant-authority-service") {
        verifyTenantAuthorityRegistrationRecords(service.database, {
          env,
          executeDocker,
        });
        const seedEnv = {
          ...serviceEnv,
          NODE_ENV: "development",
          AUTHORITY_AUDIT_HMAC_KEY_ID: "disposable-verifier-v1",
          AUTHORITY_AUDIT_HMAC_KEY:
            "disposable-tenant-authority-verifier-key-only",
        };
        runPrismaOperation("seed", {
          services: [service],
          env: seedEnv,
          execute: executePrisma,
          logger,
        });
        runPrismaOperation("seed", {
          services: [service],
          env: seedEnv,
          execute: executePrisma,
          logger,
        });
        verifyTenantAuthorityDefaultSeed(service.database, {
          env,
          executeDocker,
        });
      }
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

export function verifyF4Batch3RoleSeeds({
  env = process.env,
  executeDocker = run,
  executePnpm = runPnpm,
  logger = console,
  platform = process.platform,
  runId = randomUUID(),
} = {}) {
  const selected = [
    "@nebula/user-service",
    "@nebula/tenant-authority-service",
  ].map((packageName) => {
    const service = prismaServices.find(
      (candidate) => candidate.packageName === packageName,
    );
    if (!service) throw new Error(`f4_batch3_service_missing_${packageName}`);
    return service;
  });
  const [userService, authorityService] = disposableMigrationServices(
    selected,
    runId,
  );
  const created = [];
  let failure;

  const userEnv = databaseEnv(userService.database, env);
  const authorityEnv = {
    ...databaseEnv(authorityService.database, env),
    NODE_ENV: "development",
    AUTHORITY_AUDIT_HMAC_KEY_ID: "f4-batch3-disposable-audit-v1",
    AUTHORITY_AUDIT_HMAC_KEY: "f4-batch3-disposable-audit-integrity-key",
    AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID:
      "f4-batch3-disposable-membership-v1",
    AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY:
      "f4-batch3-disposable-membership-integrity-key",
  };

  try {
    runPostgresTool(
      ["pg_isready", "--username", "postgres", "--dbname", "postgres"],
      { label: "readiness", env, execute: executeDocker, platform },
    );

    for (const service of [userService, authorityService]) {
      createLocalDatabase(service.database, {
        env,
        execute: executeDocker,
        platform,
      });
      created.push(service.database);
      const serviceEnv =
        service.packageName === userService.packageName
          ? userEnv
          : authorityEnv;
      runPrismaOperation("migrate-deploy", {
        services: [service],
        env: serviceEnv,
        execute: executePnpm,
        logger,
      });
      runPrismaOperation("migrate-status", {
        services: [service],
        env: serviceEnv,
        execute: executePnpm,
        logger,
      });
    }

    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      runPrismaOperation("seed", {
        services: [authorityService],
        env: authorityEnv,
        execute: executePnpm,
        logger,
      });
      runPrismaOperation("seed", {
        services: [userService],
        env: userEnv,
        execute: executePnpm,
        logger,
      });
    }
    verifyTenantAuthorityDefaultSeed(authorityService.database, {
      env,
      executeDocker,
      platform,
    });

    const legacyAudit = capturedJson(
      runPackageScript(userService.packageName, "audit:f4-legacy-roles", {
        args: ["--json"],
        env: userEnv,
        execute: executePnpm,
      }),
      "f4_batch3_legacy_audit",
    );
    const legacySnapshot = JSON.stringify(legacyAudit);
    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      runPackageScript(
        authorityService.packageName,
        "backfill:f4-legacy-roles",
        {
          env: authorityEnv,
          execute: executePnpm,
          input: legacySnapshot,
        },
      );
    }

    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      runPackageScript(userService.packageName, "seed:f4-editor-user", {
        env: userEnv,
        execute: executePnpm,
      });
    }
    const fixture = capturedJson(
      runPackageScript(
        userService.packageName,
        "export:f4-default-role-fixtures",
        { env: userEnv, execute: executePnpm },
      ),
      "f4_batch3_role_fixture",
    );
    const fixtureSnapshot = JSON.stringify(fixture);
    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      runPackageScript(
        authorityService.packageName,
        "seed:f4-default-role-fixtures",
        {
          env: authorityEnv,
          execute: executePnpm,
          input: fixtureSnapshot,
        },
      );
    }

    // Adversarial second pass: rerun earlier stateful steps after item 3. The
    // importer intentionally receives its original bounded snapshot; a newly
    // created editor is not reclassified as pre-migration legacy data.
    runPrismaOperation("seed", {
      services: [userService],
      env: userEnv,
      execute: executePnpm,
      logger,
    });
    runPrismaOperation("seed", {
      services: [authorityService],
      env: authorityEnv,
      execute: executePnpm,
      logger,
    });
    runPackageScript(authorityService.packageName, "backfill:f4-legacy-roles", {
      env: authorityEnv,
      execute: executePnpm,
      input: legacySnapshot,
    });
    runPackageScript(userService.packageName, "seed:f4-editor-user", {
      env: userEnv,
      execute: executePnpm,
    });
    const rerunFixture = capturedJson(
      runPackageScript(
        userService.packageName,
        "export:f4-default-role-fixtures",
        { env: userEnv, execute: executePnpm },
      ),
      "f4_batch3_role_fixture_rerun",
    );
    if (JSON.stringify(rerunFixture) !== fixtureSnapshot) {
      throw new Error("f4_batch3_role_fixture_rerun_mismatch");
    }
    runPackageScript(
      authorityService.packageName,
      "seed:f4-default-role-fixtures",
      {
        env: authorityEnv,
        execute: executePnpm,
        input: fixtureSnapshot,
      },
    );

    // R2 must preserve the final role graph across evidence and earlier-seed reruns.
    executeSqlText(
      authorityService.database,
      `
-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Membership', 'MembershipEpoch', 'TenantRoleGrant', 'SiteRoleGrant', 'PlatformGrant', 'AuthorityAuditEvent', 'AuthorityInvalidationOutbox'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;
    `,
      { env, execute: executeDocker, platform },
    );
    for (let runIndex = 0; runIndex < 2; runIndex += 1) {
      runPackageScript(
        authorityService.packageName,
        "backfill:f4-default-actors",
        {
          env: authorityEnv,
          execute: executePnpm,
        },
      );
    }
    runPrismaOperation("seed", {
      services: [authorityService],
      env: authorityEnv,
      execute: executePnpm,
      logger,
    });
    runPackageScript(
      authorityService.packageName,
      "backfill:f4-default-actors",
      {
        env: authorityEnv,
        execute: executePnpm,
      },
    );

    const postFixtureAudit = capturedJson(
      runPackageScript(userService.packageName, "audit:f4-legacy-roles", {
        args: ["--json"],
        env: userEnv,
        execute: executePnpm,
      }),
      "f4_batch3_post_fixture_audit",
    );
    if (
      postFixtureAudit.backfillStatus !== "READY" ||
      postFixtureAudit.totalUsers !== legacyAudit.totalUsers + 1 ||
      postFixtureAudit.roleCounts?.user !== legacyAudit.roleCounts?.user + 1
    ) {
      throw new Error("f4_batch3_post_fixture_audit_mismatch");
    }

    for (const [service, serviceEnv] of [
      [userService, userEnv],
      [authorityService, authorityEnv],
    ]) {
      runPrismaOperation("migrate-status", {
        services: [service],
        env: serviceEnv,
        execute: executePnpm,
        logger,
      });
    }
    verifySqlFile(
      userService.database,
      "scripts/db/verify-f4-batch3-user-role-seeds.sql",
      { env, execute: executeDocker, platform },
    );
    verifySqlFile(
      authorityService.database,
      "scripts/db/verify-f4-batch3-authority-role-seeds.sql",
      { env, execute: executeDocker, platform },
    );
    runPackageScript(
      authorityService.packageName,
      "verify:batch3-actor-resolution",
      { env: authorityEnv, execute: executePnpm },
    );
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
  return [userService.database, authorityService.database];
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
  return composeServices
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

  runCompose(["run", "-T", "--rm", "--no-deps", "tenant-authority-db-init"], {
    label: "tenant-authority-database",
    env,
    execute: executeDocker,
    platform,
  });

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
    composeServices.map((service) =>
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

function ensureCiEvidenceDirectory(directory = CI_EVIDENCE_DIRECTORY) {
  mkdirSync(directory, { recursive: true });
  return directory;
}

function writeSanitizedEvidence(outputPath, value, env) {
  writeFileSync(
    outputPath,
    sanitizeOutput(value, evidenceRedactionEnvironment(env)),
    "utf8",
  );
}

function renderedComposeDocument(value, label) {
  let document = value;
  if (typeof value === "string") {
    try {
      document = JSON.parse(value);
    } catch {
      throw new Error(`compose_boundary_${label}_invalid_json`);
    }
  }
  if (!isRecord(document) || !isRecord(document.services)) {
    throw new Error(`compose_boundary_${label}_services_missing`);
  }
  return document;
}

function renderedService(document, label, name) {
  const service = document.services[name];
  if (!isRecord(service)) {
    throw new Error(`compose_boundary_${label}_${name}_missing`);
  }
  return service;
}

function renderedPortTargets(service) {
  if (!Array.isArray(service.ports)) return [];
  return service.ports
    .map((port) => (isRecord(port) ? Number(port.target) : Number.NaN))
    .filter(Number.isInteger)
    .toSorted((left, right) => left - right);
}

function requireExactValues(actual, expected, error) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(error);
  }
}

function requireGatewayRuntimeContract(document, label) {
  const gateway = renderedService(document, label, "gateway");
  const environment = isRecord(gateway.environment) ? gateway.environment : {};
  const expectedTargets = Object.fromEntries(
    hybridServices.map((service) => [
      `${service.name.replace(/-service$/, "").toUpperCase()}_GRPC_URL`,
      `${service.dockerService}:${service.grpcPort}`,
    ]),
  );
  for (const [name, expected] of Object.entries(expectedTargets)) {
    if (String(environment[name] ?? "") !== expected) {
      throw new Error(`compose_boundary_${label}_gateway_${name}_invalid`);
    }
  }
  if (
    String(environment.GATEWAY_HTTP_PORT ?? "") !== "3002" ||
    String(environment.GATEWAY_REDIS_URL ?? "").includes("redis:6379") ===
      false ||
    String(environment.MEDIA_RENDER_HTTP_URL ?? "") !==
      "http://media-service:3007" ||
    !String(environment.GATEWAY_OUTBOUND_KEYS ?? "") ||
    !String(environment.GATEWAY_APPLICATION_REGISTRY_JSON ?? "")
  ) {
    throw new Error(`compose_boundary_${label}_gateway_environment_invalid`);
  }
  for (const forbidden of [
    "S2S_INBOUND_KEYS",
    "GATEWAY_INBOUND_KEYS",
    "S2S_REPLAY_STORE",
    "REDIS_HOST",
    "PUBLIC_MODE",
  ]) {
    if (environment[forbidden] !== undefined) {
      throw new Error(
        `compose_boundary_${label}_gateway_${forbidden}_forbidden`,
      );
    }
  }
  const dependencies = isRecord(gateway.depends_on) ? gateway.depends_on : {};
  requireExactValues(
    Object.keys(dependencies).toSorted(),
    ["auth-service", "redis"],
    `compose_boundary_${label}_gateway_dependencies_invalid`,
  );
  for (const dependency of Object.values(dependencies)) {
    if (!isRecord(dependency) || dependency.condition !== "service_healthy") {
      throw new Error(
        `compose_boundary_${label}_gateway_dependency_health_invalid`,
      );
    }
  }
  const healthTest = isRecord(gateway.healthcheck)
    ? gateway.healthcheck.test
    : undefined;
  if (
    !Array.isArray(healthTest) ||
    !healthTest.some((value) =>
      String(value).includes("http://localhost:3002/health/ready"),
    )
  ) {
    throw new Error(`compose_boundary_${label}_gateway_healthcheck_invalid`);
  }
}

export function validateRenderedComposeBoundary(label, value) {
  if (label !== "local" && label !== "release") {
    throw new Error("compose_boundary_label_invalid");
  }
  const document = renderedComposeDocument(value, label);
  requireGatewayRuntimeContract(document, label);

  for (const service of backendServices) {
    const rendered = renderedService(document, label, service.dockerService);
    const actualPorts = renderedPortTargets(rendered);
    if (label === "local") {
      const expectedPorts = [service.httpPort, service.grpcPort]
        .filter(Number.isInteger)
        .toSorted((left, right) => left - right);
      requireExactValues(
        actualPorts,
        expectedPorts,
        `compose_boundary_local_${service.name}_ports_invalid`,
      );
    } else if (service.name === "gateway") {
      requireExactValues(
        actualPorts,
        [3002],
        "compose_boundary_release_gateway_ports_invalid",
      );
      if (rendered.build !== undefined) {
        throw new Error("compose_boundary_release_gateway_build_forbidden");
      }
    } else {
      requireExactValues(
        actualPorts,
        [],
        `compose_boundary_release_${service.name}_ports_forbidden`,
      );
    }
  }

  if (label === "local") {
    const gateway = renderedService(document, label, "gateway");
    if (
      !isRecord(gateway.build) ||
      gateway.build.target !== "gateway-runtime"
    ) {
      throw new Error("compose_boundary_local_gateway_build_invalid");
    }
  } else {
    for (const name of ["postgres", "redis"]) {
      requireExactValues(
        renderedPortTargets(renderedService(document, label, name)),
        [],
        `compose_boundary_release_${name}_ports_forbidden`,
      );
    }
    requireExactValues(
      renderedPortTargets(renderedService(document, label, "minio")),
      [9000],
      "compose_boundary_release_minio_ports_invalid",
    );
    for (const service of hybridServices) {
      const rendered = renderedService(document, label, service.dockerService);
      const environment = isRecord(rendered.environment)
        ? rendered.environment
        : {};
      const expectedMode =
        service.name === "media-service" ? "OPEN" : "GATEWAY_ONLY";
      if (environment.PUBLIC_MODE !== expectedMode) {
        throw new Error(
          `compose_boundary_release_${service.name}_public_mode_invalid`,
        );
      }
    }
  }

  for (const service of Object.values(document.services)) {
    if (!isRecord(service) || !isRecord(service.depends_on)) continue;
    for (const dependency of Object.values(service.depends_on)) {
      if (isRecord(dependency) && dependency.condition === "service_started") {
        throw new Error(`compose_boundary_${label}_service_started_forbidden`);
      }
    }
  }
  return document;
}

export function captureComposeConfigurations({
  env = process.env,
  execute = run,
  outputDirectory = CI_EVIDENCE_DIRECTORY,
  platform = process.platform,
  validateConfiguration = validateRenderedComposeBoundary,
} = {}) {
  const directory = ensureCiEvidenceDirectory(outputDirectory);
  const configurations = [
    {
      label: "local",
      args: ["compose", "config", "--no-interpolate"],
      validationArgs: ["compose", "config", "--format", "json"],
      output: "compose-local.yaml",
    },
    {
      label: "release",
      args: [
        "compose",
        "--env-file",
        "deploy/.env.production.example",
        "-f",
        "docker-compose.release.yml",
        "config",
        "--no-interpolate",
      ],
      validationArgs: [
        "compose",
        "--env-file",
        "deploy/.env.production.example",
        "-f",
        "docker-compose.release.yml",
        "config",
        "--format",
        "json",
      ],
      output: "compose-release.yaml",
    },
  ];

  for (const configuration of configurations) {
    const result = execute(dockerExecutable(platform), configuration.args, {
      capture: true,
      emitCaptured: false,
      env,
    });
    if (result.status !== 0) {
      throw new Error(
        `compose_evidence_${configuration.label}_failed_exit_${result.status ?? "unknown"}`,
      );
    }
    writeSanitizedEvidence(
      path.join(directory, configuration.output),
      result.stdout,
      env,
    );
    const rendered = execute(
      dockerExecutable(platform),
      configuration.validationArgs,
      {
        capture: true,
        emitCaptured: false,
        env,
      },
    );
    if (rendered.status !== 0) {
      throw new Error(
        `compose_boundary_${configuration.label}_render_failed_exit_${rendered.status ?? "unknown"}`,
      );
    }
    validateConfiguration(configuration.label, rendered.stdout);
  }

  return directory;
}

export function captureComposeFailureEvidence({
  env = process.env,
  execute = run,
  logger = console,
  outputDirectory = CI_EVIDENCE_DIRECTORY,
  platform = process.platform,
} = {}) {
  const directory = ensureCiEvidenceDirectory(outputDirectory);
  const captures = [
    {
      args: ["compose", "ps", "-a", "--format", "json"],
      output: "compose-state.jsonl",
    },
    {
      args: ["compose", "logs", "--no-color", "--timestamps", "--tail", "200"],
      output: "compose-logs.txt",
    },
  ];

  for (const capture of captures) {
    let value;
    try {
      const result = execute(dockerExecutable(platform), capture.args, {
        capture: true,
        emitCaptured: false,
        env,
      });
      value = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      if (result.status !== 0) {
        value += `\ncapture_exit=${result.status ?? "unknown"}\n`;
      }
    } catch (error) {
      value = `capture_unavailable=${error instanceof Error ? error.name : "unknown"}\n`;
    }
    writeSanitizedEvidence(path.join(directory, capture.output), value, env);
  }

  logger.log("[backend] bounded Compose failure evidence captured");
  return directory;
}

function packageManifest(directory) {
  try {
    return JSON.parse(
      readFileSync(path.join(directory, "package.json"), "utf8"),
    );
  } catch {
    return {};
  }
}

function addDependencyVersion(versions, name, version) {
  if (
    typeof version !== "string" ||
    version.startsWith("file:") ||
    version.startsWith("link:")
  ) {
    return;
  }
  const values = versions.get(name) ?? new Set();
  values.add(version);
  versions.set(name, values);
}

function collectRuntimeDependencyInventory(
  workspaces,
  { readManifest = packageManifest } = {},
) {
  const versions = new Map();
  const paths = new Map();

  function visit(owner, dependencies, chain) {
    if (!isRecord(dependencies)) return;
    const manifest =
      typeof owner?.path === "string" ? readManifest(owner.path) : {};
    const optionalPeers = new Set(
      Object.entries(manifest.peerDependenciesMeta ?? {})
        .filter(([, metadata]) => metadata?.optional === true)
        .map(([name]) => name),
    );

    for (const [name, dependency] of Object.entries(dependencies)) {
      if (!isRecord(dependency) || optionalPeers.has(name)) continue;
      addDependencyVersion(versions, name, dependency.version);
      const nextChain = [...chain, `${name}@${dependency.version}`];
      const key = `${name}@${dependency.version}`;
      const dependencyPaths = paths.get(key) ?? new Set();
      dependencyPaths.add(nextChain.join(" > "));
      paths.set(key, dependencyPaths);
      visit(dependency, dependency.dependencies, nextChain);
      visit(dependency, dependency.optionalDependencies, nextChain);
    }
  }

  for (const workspace of Array.isArray(workspaces) ? workspaces : []) {
    const root = [workspace.name ?? workspace.path ?? "workspace"];
    visit(workspace, workspace.dependencies, root);
    visit(workspace, workspace.optionalDependencies, root);
  }
  return { paths, versions };
}

export function collectRuntimeDependencyVersions(workspaces, options = {}) {
  return collectRuntimeDependencyInventory(workspaces, options).versions;
}

function dependencyInventoryArgs(services = backendServices) {
  return [
    ...services.map((service) => `--filter=${service.packageName}...`),
    "list",
    "--prod",
    "--depth",
    "Infinity",
    "--json",
  ];
}

function parseCommandJson(result, label, acceptedStatuses = [0]) {
  if (!acceptedStatuses.includes(result.status)) {
    throw new Error(`${label}_failed_exit_${result.status ?? "unknown"}`);
  }
  try {
    return JSON.parse(result.stdout ?? "");
  } catch {
    throw new Error(`${label}_invalid_json`);
  }
}

function dependencyVersionMatches(inventory, name, version) {
  const versions = inventory.versions ?? inventory;
  return versions.get(name)?.has(version) === true;
}

function dependencyPaths(inventory, name, versions) {
  if (!(inventory.paths instanceof Map)) return [];
  return [
    ...new Set(
      versions.flatMap((version) => [
        ...(inventory.paths.get(`${name}@${version}`) ?? []),
      ]),
    ),
  ].sort();
}

export function classifyDependencyAdvisories(
  auditReport,
  backendInventory,
  webInventory,
) {
  const advisories = isRecord(auditReport?.advisories)
    ? Object.values(auditReport.advisories)
    : [];

  return advisories
    .filter((advisory) => ["high", "critical"].includes(advisory.severity))
    .map((advisory) => {
      const versions = [
        ...new Set(
          (Array.isArray(advisory.findings) ? advisory.findings : [])
            .map((finding) => finding?.version)
            .filter((version) => typeof version === "string"),
        ),
      ];
      const classifications = [];
      if (
        versions.some((version) =>
          dependencyVersionMatches(
            backendInventory,
            advisory.module_name,
            version,
          ),
        )
      ) {
        classifications.push("backend-runtime");
      }
      if (
        versions.some((version) =>
          dependencyVersionMatches(webInventory, advisory.module_name, version),
        )
      ) {
        classifications.push("deferred-web");
      }
      if (classifications.length === 0) classifications.push("backend-tooling");

      return {
        id: advisory.id,
        package: advisory.module_name,
        severity: advisory.severity,
        title: advisory.title,
        versions,
        patchedVersions: advisory.patched_versions,
        classifications,
        auditPaths: [
          ...new Set(
            (Array.isArray(advisory.findings) ? advisory.findings : []).flatMap(
              (finding) => (Array.isArray(finding?.paths) ? finding.paths : []),
            ),
          ),
        ].sort(),
        backendPaths: dependencyPaths(
          backendInventory,
          advisory.module_name,
          versions,
        ),
        webPaths: dependencyPaths(webInventory, advisory.module_name, versions),
      };
    })
    .sort((left, right) =>
      `${left.classifications[0]}:${left.package}:${left.id}`.localeCompare(
        `${right.classifications[0]}:${right.package}:${right.id}`,
      ),
    );
}

function ensureSecurityReportDirectory(directory = SECURITY_REPORT_DIRECTORY) {
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function generateBackendDependencyReport({
  env = process.env,
  execute = runPnpm,
  logger = console,
  outputDirectory = SECURITY_REPORT_DIRECTORY,
  services = backendServices,
} = {}) {
  const commandOptions = {
    capture: true,
    emitCaptured: false,
    env,
  };
  const auditReport = parseCommandJson(
    execute(["audit", "--prod", "--json"], commandOptions),
    "backend_dependency_audit",
    [0, 1],
  );
  const gatedPackages = [
    ...new Set(
      Object.values(auditReport.advisories ?? {})
        .filter((advisory) => ["high", "critical"].includes(advisory.severity))
        .map((advisory) => advisory.module_name),
    ),
  ].sort();
  const backendWorkspaces = services.flatMap((service) =>
    parseCommandJson(
      execute(dependencyInventoryArgs([service]), commandOptions),
      `backend_dependency_inventory_${service.name}`,
    ),
  );
  const webWorkspaces = gatedPackages.flatMap((packageName) =>
    parseCommandJson(
      execute(
        [
          "--filter=./apps/web",
          "list",
          packageName,
          "--prod",
          "--depth",
          "Infinity",
          "--json",
        ],
        commandOptions,
      ),
      `web_dependency_inventory_${packageName}`,
    ),
  );
  const findings = classifyDependencyAdvisories(
    auditReport,
    collectRuntimeDependencyInventory(backendWorkspaces),
    collectRuntimeDependencyInventory(webWorkspaces),
  );
  const blockers = findings.filter((finding) =>
    finding.classifications.includes("backend-runtime"),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    policy: {
      scope: "backend-runtime",
      severities: ["HIGH", "CRITICAL"],
      approvedAdvisories: [],
    },
    auditMetadata: auditReport.metadata ?? {},
    summary: {
      highCritical: findings.length,
      backendRuntime: blockers.length,
      backendTooling: findings.filter((finding) =>
        finding.classifications.includes("backend-tooling"),
      ).length,
      deferredWeb: findings.filter((finding) =>
        finding.classifications.includes("deferred-web"),
      ).length,
    },
    findings,
  };
  const directory = ensureSecurityReportDirectory(outputDirectory);
  const outputPath = path.join(directory, "backend-dependencies.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  logger.log(
    `[backend] dependency report: runtime=${report.summary.backendRuntime}, tooling=${report.summary.backendTooling}, deferred-web=${report.summary.deferredWeb}`,
  );
  if (blockers.length > 0) {
    throw new Error(
      `backend_dependency_gate_failed_${blockers.length}_high_or_critical`,
    );
  }
  logger.log("[backend] dependency gate passed");
  return report;
}

export function buildTrivySourceArgs(outputPath) {
  return [
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
    outputPath,
    ...TRIVY_SOURCE_SKIP_DIRECTORIES.flatMap((directory) => [
      "--skip-dirs",
      directory,
    ]),
    ...TRIVY_SOURCE_SKIP_FILES.flatMap((file) => ["--skip-files", file]),
    ".",
  ];
}

export function buildTrivyImageArgs(image, outputPath) {
  return [
    "image",
    ...TRIVY_DB_REPOSITORIES.flatMap((repository) => [
      "--db-repository",
      repository,
    ]),
    "--scanners",
    "vuln",
    "--severity",
    "HIGH,CRITICAL",
    "--exit-code",
    "0",
    "--format",
    "json",
    "--output",
    outputPath,
    image,
  ];
}

export function summarizeTrivyImageVulnerabilities(report) {
  const summary = {
    total: 0,
    blocking: 0,
    deferredUnfixedDebian: 0,
  };

  for (const result of report.results) {
    for (const finding of result.vulnerabilities ?? []) {
      summary.total += 1;
      const hasFix =
        typeof finding.FixedVersion === "string" &&
        finding.FixedVersion.trim().length > 0;
      const isUnfixedDebian =
        result.Class === "os-pkgs" && result.Type === "debian" && !hasFix;
      if (isUnfixedDebian) {
        summary.deferredUnfixedDebian += 1;
      } else {
        summary.blocking += 1;
      }
    }
  }

  return summary;
}

function selectedFields(value, fields) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    fields
      .filter((field) => value[field] !== undefined)
      .map((field) => [field, value[field]]),
  );
}

export function createTrivyEvidenceReport(report) {
  const results = Array.isArray(report?.Results) ? report.Results : [];
  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: report?.SchemaVersion,
    artifactName: report?.ArtifactName,
    artifactType: report?.ArtifactType,
    results: results.map((result) => ({
      ...selectedFields(result, ["Target", "Class", "Type"]),
      vulnerabilities: (Array.isArray(result?.Vulnerabilities)
        ? result.Vulnerabilities
        : []
      ).map((finding) =>
        selectedFields(finding, [
          "VulnerabilityID",
          "PkgName",
          "PkgPath",
          "InstalledVersion",
          "FixedVersion",
          "Status",
          "Severity",
          "Title",
          "PrimaryURL",
          "References",
        ]),
      ),
      misconfigurations: (Array.isArray(result?.Misconfigurations)
        ? result.Misconfigurations
        : []
      ).map((finding) =>
        selectedFields(finding, [
          "Type",
          "ID",
          "AVDID",
          "Title",
          "Resolution",
          "Severity",
          "Status",
          "PrimaryURL",
          "References",
        ]),
      ),
      secrets: (Array.isArray(result?.Secrets) ? result.Secrets : []).map(
        (finding) =>
          selectedFields(finding, [
            "RuleID",
            "Category",
            "Severity",
            "Title",
            "StartLine",
            "EndLine",
          ]),
      ),
    })),
  };
}

function writeTrivyEvidenceReport(rawPath, outputPath) {
  const report = JSON.parse(readFileSync(rawPath, "utf8"));
  const evidence = createTrivyEvidenceReport(report);
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  rmSync(rawPath, { force: true });
  return evidence;
}

function countTrivyFindings(report, field) {
  return report.results.reduce(
    (total, result) => total + (result[field]?.length ?? 0),
    0,
  );
}

function printTrivyReport(outputPath, { env, execute }) {
  const result = execute(
    "trivy",
    ["convert", "--format", "table", "--severity", "HIGH,CRITICAL", outputPath],
    { env },
  );
  if (result.status !== 0) {
    throw new Error(`trivy_report_failed_exit_${result.status ?? "unknown"}`);
  }
}

export function runBackendSourceScan({
  env = process.env,
  execute = run,
  logger = console,
  outputDirectory = SECURITY_REPORT_DIRECTORY,
} = {}) {
  const directory = ensureSecurityReportDirectory(outputDirectory);
  const outputPath = path.join(directory, "backend-source.json");
  const rawPath = path.join(directory, "backend-source.trivy-raw");
  const result = execute("trivy", buildTrivySourceArgs(rawPath), { env });
  const report = writeTrivyEvidenceReport(rawPath, outputPath);
  logger.log(
    `[backend] source report: secrets=${countTrivyFindings(report, "secrets")}, misconfigurations=${countTrivyFindings(report, "misconfigurations")}`,
  );
  if (result.status !== 0) {
    throw new Error(
      `backend_source_scan_failed_exit_${result.status ?? "unknown"}`,
    );
  }
  logger.log("[backend] secret/config gate passed");
}

function safeReportName(image) {
  return image.replace(/[^A-Za-z0-9._-]+/g, "-");
}

export function runBackendImageScans({
  env = process.env,
  execute = run,
  logger = console,
  outputDirectory = SECURITY_REPORT_DIRECTORY,
  services = backendServices,
} = {}) {
  const directory = ensureSecurityReportDirectory(outputDirectory);
  const failed = [];
  let deferredUnfixedDebian = 0;
  for (const service of services) {
    const image = service.defaultImage;
    const outputPath = path.join(directory, `${safeReportName(image)}.json`);
    const rawPath = path.join(directory, `${safeReportName(image)}.trivy-raw`);
    logger.log(`[backend] image scan: ${image}`);
    const result = execute("trivy", buildTrivyImageArgs(image, rawPath), {
      env,
    });
    if (result.status !== 0 || !existsSync(rawPath)) {
      failed.push(service.dockerService);
      rmSync(rawPath, { force: true });
      continue;
    }
    printTrivyReport(rawPath, { env, execute });
    const report = writeTrivyEvidenceReport(rawPath, outputPath);
    const summary = summarizeTrivyImageVulnerabilities(report);
    deferredUnfixedDebian += summary.deferredUnfixedDebian;
    logger.log(
      `[backend] image report: findings=${summary.total}, blocking=${summary.blocking}, deferred-unfixed-debian=${summary.deferredUnfixedDebian}`,
    );
    if (summary.blocking > 0) failed.push(service.dockerService);
  }
  if (failed.length > 0) {
    throw new Error(`backend_image_gate_failed_${failed.join("_")}`);
  }
  if (deferredUnfixedDebian > 0) {
    logger.log(
      `[backend] image gate retained ${deferredUnfixedDebian} unfixed Debian finding(s) for production hardening`,
    );
  }
  logger.log(`[backend] image gate passed for ${services.length} images`);
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
    "  node scripts/backend.mjs security <dependencies|source|images>",
    "  node scripts/backend.mjs evidence <compose|failure>",
    "  node scripts/backend.mjs build-images [--pull|--clean]",
    "  node scripts/backend.mjs prisma <generate|migrate-dev|migrate-deploy|migrate-status|push|seed>",
    "  node scripts/backend.mjs seed",
    "  node scripts/backend.mjs database verify-migrations [tenant-authority]",
    "  node scripts/backend.mjs database verify-f4-batch3-role-seeds",
    "  node scripts/backend.mjs database verify-f4-r2-default-actors",
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
    await checkBackendHealth({ services: composeServices });
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
  if (command === "security" && operation === "dependencies" && !extra) {
    generateBackendDependencyReport();
    return;
  }
  if (command === "security" && operation === "source" && !extra) {
    runBackendSourceScan();
    return;
  }
  if (command === "security" && operation === "images" && !extra) {
    runBackendImageScans();
    return;
  }
  if (command === "evidence" && operation === "compose" && !extra) {
    captureComposeConfigurations();
    return;
  }
  if (command === "evidence" && operation === "failure" && !extra) {
    captureComposeFailureEvidence();
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
  if (
    command === "database" &&
    operation === "verify-migrations" &&
    !confirmationArg &&
    !unexpected
  ) {
    verifyCleanMigrations({ services: migrationVerificationServices(extra) });
    return;
  }
  if (
    command === "database" &&
    operation === "verify-f4-r2-default-actors" &&
    !extra
  ) {
    const databases = verifyF4R2DefaultActors();
    console.log(
      `[backend] F4 R2 verified and removed ${databases.length} disposable databases`,
    );
    return;
  }
  if (
    command === "database" &&
    operation === "verify-f4-batch3-role-seeds" &&
    !extra
  ) {
    verifyF4Batch3RoleSeeds();
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
