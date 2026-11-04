import assert from "node:assert/strict";
import console from "node:console";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { parseEnv } from "node:util";
import { fileURLToPath, URL } from "node:url";

export const repository = fileURLToPath(new URL("../../", import.meta.url));
export const storageDirectory = path.join(
  repository,
  ".nebula-storage/seaweedfs",
);
export const checksum = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export function safeFailure(error) {
  const values =
    error instanceof AggregateError ? error.errors.flatMap(safeFailure) : [];
  if (values.length) return values;
  const firstLine = String(error.message ?? "").split("\n")[0];
  return [
    {
      name: error.name,
      code: /^[A-Za-z0-9_:-]{1,80}$/u.test(error.code ?? error.Code ?? "")
        ? (error.code ?? error.Code)
        : undefined,
      check: /^[A-Za-z][A-Za-z0-9_:-]{1,140}$/u.test(firstLine)
        ? firstLine
        : undefined,
      status: error.$metadata?.httpStatusCode,
      location: String(error.stack ?? "")
        .split("\n")
        .find(
          (line) =>
            line.trimStart().startsWith("at ") &&
            line.includes("/scripts/storage/"),
        )
        ?.trim(),
    },
  ];
}

function endpoint(value, label) {
  const url = new URL(value);
  assert.ok(["http:", "https:"].includes(url.protocol), `${label}_protocol`);
  assert.ok(
    !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    `${label}_must_be_origin`,
  );
  return url.origin;
}

export function validateSettings(env) {
  for (const [key, value] of Object.entries(env)) {
    assert.equal(typeof value, "string", `${key}_must_be_string`);
    assert.ok(!/[\r\n\0]/u.test(value), `${key}_control_character`);
  }
  const port = Number(env.SEAWEED_HOST_PORT);
  assert.ok(
    Number.isInteger(port) && port >= 1024 && port <= 65535,
    "seaweed_port_invalid",
  );
  assert.ok(
    ![9000, 9001, 19333].includes(port),
    "seaweed_port_collides_with_existing_store",
  );
  assert.equal(env.MEDIA_STORAGE_DRIVER, "s3");
  assert.equal(env.MEDIA_STORAGE_PROVIDER, "s3");
  assert.equal(env.MEDIA_S3_FORCE_PATH_STYLE, "true");
  assert.match(
    env.MEDIA_S3_BUCKET ?? "",
    /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u,
    "seaweed_bucket_invalid",
  );
  assert.ok(!env.MEDIA_S3_BUCKET.startsWith("xn--"), "seaweed_bucket_reserved");
  assert.equal(env.MEDIA_S3_INTERNAL_ENDPOINT, "http://seaweed:8333");
  const publicEndpoint = endpoint(
    env.MEDIA_S3_PUBLIC_ENDPOINT,
    "seaweed_public_endpoint",
  );
  // This task prepares loopback-only storage. Public release exposure is later.
  assert.equal(publicEndpoint, `http://127.0.0.1:${port}`);
  assert.equal(env.MEDIA_S3_REGION, "us-east-1");
  const origins = (env.SEAWEED_CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim());
  assert.ok(
    origins.length > 0 && origins.length <= 8,
    "seaweed_origins_invalid",
  );
  assert.equal(
    new Set(origins).size,
    origins.length,
    "seaweed_origins_duplicate",
  );
  for (const origin of origins)
    assert.equal(endpoint(origin, "seaweed_cors_origin"), origin);
  for (const key of ["SEAWEED_ADMIN_ACCESS_KEY", "MEDIA_S3_ACCESS_KEY"])
    assert.match(env[key] ?? "", /^[A-Za-z0-9-]{20,80}$/u, `${key}_invalid`);
  for (const key of ["SEAWEED_ADMIN_SECRET_KEY", "MEDIA_S3_SECRET_KEY"])
    assert.match(env[key] ?? "", /^[a-f0-9]{64}$/u, `${key}_invalid`);
  assert.notEqual(
    env.SEAWEED_ADMIN_ACCESS_KEY,
    env.MEDIA_S3_ACCESS_KEY,
    "seaweed_access_keys_must_differ",
  );
  assert.notEqual(
    env.SEAWEED_ADMIN_SECRET_KEY,
    env.MEDIA_S3_SECRET_KEY,
    "seaweed_secrets_must_differ",
  );
  return { ...env, origins, publicEndpoint, port };
}

export function createSettings(env = {}) {
  const port = env.SEAWEED_HOST_PORT ?? "19000";
  return {
    SEAWEED_HOST_PORT: port,
    SEAWEED_CORS_ORIGINS:
      env.SEAWEED_CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173",
    SEAWEED_ADMIN_ACCESS_KEY: `nebula-admin-${randomBytes(12).toString("hex")}`,
    SEAWEED_ADMIN_SECRET_KEY: randomBytes(32).toString("hex"),
    MEDIA_STORAGE_DRIVER: "s3",
    MEDIA_STORAGE_PROVIDER: "s3",
    MEDIA_S3_REGION: "us-east-1",
    MEDIA_S3_BUCKET: env.MEDIA_S3_BUCKET ?? "media",
    MEDIA_S3_INTERNAL_ENDPOINT: "http://seaweed:8333",
    MEDIA_S3_PUBLIC_ENDPOINT: `http://127.0.0.1:${port}`,
    MEDIA_S3_ACCESS_KEY: `nebula-media-${randomBytes(12).toString("hex")}`,
    MEDIA_S3_SECRET_KEY: randomBytes(32).toString("hex"),
    MEDIA_S3_FORCE_PATH_STYLE: "true",
  };
}

export function credentialConfig(settings) {
  return {
    identities: [
      {
        name: "nebula-bootstrap",
        credentials: [
          {
            accessKey: settings.SEAWEED_ADMIN_ACCESS_KEY,
            secretKey: settings.SEAWEED_ADMIN_SECRET_KEY,
          },
        ],
        actions: ["Admin", "Read", "Write", "List"],
      },
      {
        name: "nebula-media",
        credentials: [
          {
            accessKey: settings.MEDIA_S3_ACCESS_KEY,
            secretKey: settings.MEDIA_S3_SECRET_KEY,
          },
        ],
        actions: ["Read", "Write", "List"].map(
          (action) => `${action}:${settings.MEDIA_S3_BUCKET}`,
        ),
      },
    ],
  };
}

export const composeEnvironment = (settings) =>
  `SEAWEED_HOST_PORT=${settings.SEAWEED_HOST_PORT}\nSEAWEED_CORS_ORIGINS=${settings.SEAWEED_CORS_ORIGINS}\n`;

export function scopedMediaEnvironment(settings, { native = false } = {}) {
  return {
    MEDIA_STORAGE_DRIVER: "s3",
    MEDIA_STORAGE_PROVIDER: "s3",
    MEDIA_S3_ENDPOINT: native
      ? settings.publicEndpoint
      : settings.MEDIA_S3_INTERNAL_ENDPOINT,
    MEDIA_S3_INTERNAL_ENDPOINT: native
      ? settings.publicEndpoint
      : settings.MEDIA_S3_INTERNAL_ENDPOINT,
    MEDIA_S3_PUBLIC_ENDPOINT: settings.MEDIA_S3_PUBLIC_ENDPOINT,
    MEDIA_S3_REGION: settings.MEDIA_S3_REGION,
    MEDIA_S3_BUCKET: settings.MEDIA_S3_BUCKET,
    MEDIA_S3_ACCESS_KEY: settings.MEDIA_S3_ACCESS_KEY,
    MEDIA_S3_SECRET_KEY: settings.MEDIA_S3_SECRET_KEY,
    MEDIA_S3_FORCE_PATH_STYLE: "true",
  };
}

function mediaEnvironmentText(settings) {
  return (
    Object.entries(scopedMediaEnvironment(settings))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n"
  );
}

function ensureMediaEnvironment(settings, directory) {
  const file = path.join(directory, "media.env");
  const expected = mediaEnvironmentText(settings);
  if (existsSync(file)) {
    assert.ok(!lstatSync(file).isSymbolicLink(), "seaweed_media_env_symlink");
    assert.equal(
      checksum(readFileSync(file)),
      checksum(expected),
      "seaweed_media_env_drift",
    );
  } else writeFileSync(file, expected, { flag: "wx", mode: 0o600 });
}

export function containerBootstrapSettings(config, env) {
  assert.equal(
    config.identities?.length,
    2,
    "seaweed_bootstrap_identity_count",
  );
  const admin = config.identities.find(
    (identity) => identity.name === "nebula-bootstrap",
  );
  const media = config.identities.find(
    (identity) => identity.name === "nebula-media",
  );
  assert.equal(
    admin?.credentials?.length,
    1,
    "seaweed_bootstrap_admin_credential_count",
  );
  assert.equal(
    media?.credentials?.length,
    1,
    "seaweed_bootstrap_media_credential_count",
  );
  const bucket = media.actions
    ?.find((action) => /^Read:[a-z0-9-]+$/u.test(action))
    ?.slice(5);
  const settings = validateSettings({
    SEAWEED_HOST_PORT: env.SEAWEED_HOST_PORT,
    SEAWEED_CORS_ORIGINS: env.SEAWEED_CORS_ORIGINS,
    SEAWEED_ADMIN_ACCESS_KEY: admin.credentials[0].accessKey,
    SEAWEED_ADMIN_SECRET_KEY: admin.credentials[0].secretKey,
    MEDIA_STORAGE_DRIVER: "s3",
    MEDIA_STORAGE_PROVIDER: "s3",
    MEDIA_S3_REGION: "us-east-1",
    MEDIA_S3_BUCKET: bucket,
    MEDIA_S3_INTERNAL_ENDPOINT: "http://seaweed:8333",
    MEDIA_S3_PUBLIC_ENDPOINT: `http://127.0.0.1:${env.SEAWEED_HOST_PORT}`,
    MEDIA_S3_ACCESS_KEY: media.credentials[0].accessKey,
    MEDIA_S3_SECRET_KEY: media.credentials[0].secretKey,
    MEDIA_S3_FORCE_PATH_STYLE: "true",
  });
  assert.deepEqual(
    config,
    credentialConfig(settings),
    "seaweed_bootstrap_scope_mismatch",
  );
  return settings;
}

function guardDirectory(directory) {
  assert.equal(
    path.resolve(directory),
    directory,
    "seaweed_directory_absolute_required",
  );
  // Refuse symlink/junction redirection, including any already-existing parent.
  for (
    let cursor = directory;
    cursor !== path.dirname(cursor);
    cursor = path.dirname(cursor)
  ) {
    if (existsSync(cursor))
      assert.ok(
        !lstatSync(cursor).isSymbolicLink(),
        "seaweed_directory_symlink",
      );
  }
}

export function readPreparedSettings(directory = storageDirectory) {
  guardDirectory(directory);
  const file = (name) => {
    const filename = path.join(directory, name);
    assert.ok(
      !lstatSync(filename).isSymbolicLink(),
      "seaweed_settings_symlink",
    );
    return readFileSync(filename, "utf8");
  };
  const manifest = JSON.parse(file("manifest.json"));
  assert.equal(manifest.version, 1);
  const envText = file(".env");
  const configText = file("s3.json");
  const composeText = file("compose.env");
  assert.equal(checksum(envText), manifest.envSha256, "seaweed_env_drift");
  assert.equal(
    checksum(configText),
    manifest.configSha256,
    "seaweed_config_drift",
  );
  const settings = validateSettings(parseEnv(envText));
  assert.equal(
    checksum(composeText),
    manifest.composeSha256,
    "seaweed_compose_env_drift",
  );
  assert.equal(
    composeText,
    composeEnvironment(settings),
    "seaweed_compose_settings_drift",
  );
  assert.deepEqual(
    JSON.parse(configText),
    credentialConfig(settings),
    "seaweed_credential_scope_drift",
  );
  // Legacy prepared settings remain valid; prepare adds this derived output.
  if (existsSync(path.join(directory, "media.env")))
    ensureMediaEnvironment(settings, directory);
  return settings;
}

export function prepareSettings({
  directory = storageDirectory,
  env = process.env,
} = {}) {
  guardDirectory(directory);
  if (existsSync(directory)) {
    const settings = readPreparedSettings(directory);
    for (const key of [
      "SEAWEED_HOST_PORT",
      "SEAWEED_CORS_ORIGINS",
      "MEDIA_S3_BUCKET",
    ])
      if (env[key] !== undefined)
        assert.equal(
          env[key],
          settings[key],
          "seaweed_existing_settings_conflict",
        );
    ensureMediaEnvironment(settings, directory);
    return { reused: true, settings };
  }
  const values = createSettings(env);
  const settings = validateSettings(values);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const envText =
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";
  const configText = JSON.stringify(credentialConfig(settings), null, 2) + "\n";
  const composeText = composeEnvironment(settings);
  writeFileSync(path.join(directory, ".env"), envText, {
    flag: "wx",
    mode: 0o600,
  });
  // Parent is private; bind-mounted config must be readable by the image's seaweed UID.
  writeFileSync(path.join(directory, "s3.json"), configText, {
    flag: "wx",
    mode: 0o444,
  });
  writeFileSync(path.join(directory, "compose.env"), composeText, {
    flag: "wx",
    mode: 0o600,
  });
  ensureMediaEnvironment(settings, directory);
  writeFileSync(
    path.join(directory, "manifest.json"),
    JSON.stringify(
      {
        version: 1,
        envSha256: checksum(envText),
        configSha256: checksum(configText),
        composeSha256: checksum(composeText),
      },
      null,
      2,
    ) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { reused: false, settings };
}

export function corsConfiguration(settings) {
  return {
    CORSRules: [
      {
        ID: "nebula-media-v1",
        AllowedOrigins: settings.origins,
        AllowedMethods: ["GET", "HEAD", "PUT"],
        AllowedHeaders: [
          "content-type",
          "cache-control",
          "x-amz-meta-nebula-upload-binding",
        ],
        ExposeHeaders: ["ETag", "x-amz-request-id"],
        MaxAgeSeconds: 300,
      },
    ],
  };
}

export function normalizeCors(value) {
  return value.CORSRules.map((rule) => ({
    ID: rule.ID,
    AllowedOrigins: [...rule.AllowedOrigins].sort(),
    AllowedMethods: [...rule.AllowedMethods].sort(),
    AllowedHeaders: [...rule.AllowedHeaders].map((v) => v.toLowerCase()).sort(),
    ExposeHeaders: [...(rule.ExposeHeaders ?? [])]
      .map((v) => v.toLowerCase())
      .sort(),
    MaxAgeSeconds: rule.MaxAgeSeconds,
  }));
}

export async function initializeBucket(settings, request) {
  const Bucket = settings.MEDIA_S3_BUCKET;
  try {
    await request("admin", "HeadBucket", { Bucket });
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404) throw error;
    await request("admin", "CreateBucket", { Bucket });
  }
  const cors = corsConfiguration(settings);
  await request("admin", "PutBucketCors", { Bucket, CORSConfiguration: cors });
  const stored = await request("admin", "GetBucketCors", { Bucket });
  assert.deepEqual(
    normalizeCors(stored),
    normalizeCors(cors),
    "seaweed_bucket_cors_drift",
  );
  await request("media", "HeadBucket", { Bucket });
  await request("media", "ListObjectsV2", { Bucket, MaxKeys: 1 });
}

export function storageSdk(settings, { internal = false } = {}) {
  const mediaRequire = createRequire(
    path.join(repository, "apps/media-service/package.json"),
  );
  const sdk = mediaRequire("@aws-sdk/client-s3");
  const { getSignedUrl } = mediaRequire("@aws-sdk/s3-request-presigner");
  const clients = {};
  for (const role of ["admin", "media", "signer"]) {
    const admin = role === "admin";
    clients[role] = new sdk.S3Client({
      endpoint: internal
        ? settings.MEDIA_S3_INTERNAL_ENDPOINT
        : settings.publicEndpoint,
      region: settings.MEDIA_S3_REGION,
      forcePathStyle: true,
      maxAttempts: 1,
      credentials: {
        accessKeyId: admin
          ? settings.SEAWEED_ADMIN_ACCESS_KEY
          : settings.MEDIA_S3_ACCESS_KEY,
        secretAccessKey: admin
          ? settings.SEAWEED_ADMIN_SECRET_KEY
          : settings.MEDIA_S3_SECRET_KEY,
      },
      ...(role === "signer"
        ? { requestChecksumCalculation: "WHEN_REQUIRED" }
        : {}),
    });
  }
  return {
    request: (role, operation, input) =>
      clients[role].send(new sdk[`${operation}Command`](input), {
        abortSignal: globalThis.AbortSignal.timeout(10000),
      }),
    signUpload: (input) =>
      getSignedUrl(clients.signer, new sdk.PutObjectCommand(input), {
        expiresIn: 120,
        unhoistableHeaders: new Set(["x-amz-meta-nebula-upload-binding"]),
        signableHeaders: new Set(["cache-control"]),
      }),
    close: () => Object.values(clients).forEach((client) => client.destroy()),
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    assert.equal(
      process.argv.length,
      3,
      "seaweed_setup_requires_prepare_init_or_init_container",
    );
    if (process.argv[2] === "prepare") {
      const result = prepareSettings();
      console.log(
        `[seaweed-setup] private-config-${result.reused ? "reused-without-rotation" : "prepared"}=ok`,
      );
    } else {
      assert.ok(
        ["init", "init-container"].includes(process.argv[2]),
        "seaweed_setup_unknown_mode",
      );
      const internal = process.argv[2] === "init-container";
      const settings = internal
        ? containerBootstrapSettings(
            JSON.parse(readFileSync("/run/secrets/seaweed-s3-config", "utf8")),
            process.env,
          )
        : readPreparedSettings();
      const sdk = storageSdk(settings, { internal });
      try {
        await initializeBucket(settings, sdk.request);
        console.log("[seaweed-setup] bucket-cors-scoped-media-access=ok");
      } finally {
        sdk.close();
      }
    }
  } catch (error) {
    // Do not dump signed URLs, request objects, environment or credential config.
    console.error(
      JSON.stringify(
        {
          error: "seaweed_setup_failed",
          stage: process.argv[2],
          causes: safeFailure(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
