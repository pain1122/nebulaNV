import { createRequire } from "node:module";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

const loopback = (host) =>
  ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

// Loaded through Node's awaited --import hook before the unchanged app main.
export async function prepareNativeEnvironment({
  cwd = process.cwd(),
  env = process.env,
  load = createRequire(path.join(cwd, "package.json")),
} = {}) {
  if (env.NODE_ENV !== "development")
    throw new Error("backend_dev_preload_requires_development");
  const { ConfigModule } = load("@nestjs/config");
  const { envSchema } = load("./dist/config/env.validation.js");
  // ConfigModule supplies the same dotenv expansion/process > app > root policy.
  await ConfigModule.forRoot({
    envFilePath: [path.resolve(cwd, ".env"), path.resolve(cwd, "../../.env")],
    expandVariables: true,
  });
  if (env.NEBULA_DEV_DATABASE) {
    const port = Number(env.NEBULA_DEV_POSTGRES_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("backend_dev_postgres_publication_invalid");
    for (const key of ["DATABASE_URL", "SHADOW_DATABASE_URL"]) {
      if (!env[key]) continue;
      let url;
      try {
        url = new URL(env[key]);
      } catch {
        throw new Error(`backend_dev_invalid_env_fields: ${key}`);
      }
      if (
        !["postgresql:", "postgres:"].includes(url.protocol) ||
        !loopback(url.hostname)
      )
        throw new Error(`backend_dev_native_endpoint_required: ${key}`);
      if (
        key === "DATABASE_URL" &&
        decodeURIComponent(url.pathname.slice(1)) !== env.NEBULA_DEV_DATABASE
      )
        throw new Error("backend_dev_database_owner_mismatch");
      url.port = String(port);
      env[key] = url.href;
    }
  }
  const result = envSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (result.error)
    throw new Error(
      `backend_dev_invalid_env_fields: ${result.error.details.map((d) => `${d.path.join(".")}(${d.type})`).join(", ")}`,
    );
  for (const [key, value] of Object.entries(result.value))
    if (
      ["string", "number", "boolean"].includes(typeof value) &&
      env[key] === undefined
    )
      env[key] = String(value);
  const declared = envSchema.describe().keys;
  const endpointKeys = [
    "DATABASE_URL",
    "SHADOW_DATABASE_URL",
    "GATEWAY_REDIS_URL",
    "REALM_AUTH_REDIS_URL",
    "MINIO_ENDPOINT",
    "S3_ENDPOINT",
    "MEDIA_SCANNER_HOST",
    "REDIS_HOST",
  ];
  if (declared.MEDIA_STORAGE_DRIVER && env.MEDIA_STORAGE_DRIVER === "s3") {
    const internalKey = env.MEDIA_S3_INTERNAL_ENDPOINT
      ? "MEDIA_S3_INTERNAL_ENDPOINT"
      : "MEDIA_S3_ENDPOINT";
    endpointKeys.push(
      internalKey,
      env.MEDIA_S3_PUBLIC_ENDPOINT ? "MEDIA_S3_PUBLIC_ENDPOINT" : internalKey,
    );
  }
  for (const key of new Set(endpointKeys)) {
    if (!env[key] || !declared[key]) continue;
    let host;
    try {
      host = env[key].includes("://") ? new URL(env[key]).hostname : env[key];
    } catch {
      throw new Error(`backend_dev_invalid_env_fields: ${key}`);
    }
    if (!loopback(host))
      throw new Error(`backend_dev_native_endpoint_required: ${key}`);
  }
}

if (process.env.NEBULA_DEV_PROFILE === "selected-native") {
  try {
    await prepareNativeEnvironment();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
