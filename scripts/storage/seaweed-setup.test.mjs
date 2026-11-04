import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { URL } from "node:url";
import { parseEnv } from "node:util";
import {
  checksum,
  composeEnvironment,
  containerBootstrapSettings,
  corsConfiguration,
  createSettings,
  credentialConfig,
  initializeBucket,
  prepareSettings,
  readPreparedSettings,
  repository,
  safeFailure,
  storageSdk,
  validateSettings,
} from "./seaweed-setup.mjs";
import {
  assertDeniedHeaderPreflight,
  assertDeniedOriginPreflight,
  assertPreflight,
  cleanupControls,
  validateWitness,
  verifyStoredWitness,
} from "./seaweed-storage-proof.mjs";

const fixture = () => validateSettings(createSettings({}));

test("denied-origin preflight distinguishes withheld browser access from grants and outages", () => {
  const origin = "https://nebula-denied.invalid";
  for (const status of [200, 204, 403])
    assertDeniedOriginPreflight(
      new globalThis.Response(null, { status }),
      origin,
    );
  for (const allowed of [origin, "*"])
    assert.throws(
      () =>
        assertDeniedOriginPreflight(
          new globalThis.Response(null, {
            status: 200,
            headers: { "access-control-allow-origin": allowed },
          }),
          origin,
        ),
      /seaweed_denied_origin_preflight/u,
    );
  assert.throws(
    () =>
      assertDeniedOriginPreflight(
        new globalThis.Response(null, { status: 503 }),
        origin,
      ),
    /seaweed_denied_origin_unexpected_http_status/u,
  );
});
const failure = (status) =>
  Object.assign(new Error(`http_${status}`), {
    $metadata: { httpStatusCode: status },
  });

test("prepared credentials are separate and Media has only bucket-scoped grants", () => {
  const settings = fixture();
  const config = credentialConfig(settings);
  assert.deepEqual(config.identities[1].actions, [
    "Read:media",
    "Write:media",
    "List:media",
  ]);
  assert.notDeepEqual(
    config.identities[0].credentials,
    config.identities[1].credentials,
  );
  assert.ok(config.identities[0].actions.includes("Admin"));
  assert.ok(!config.identities[1].actions.some((v) => v.startsWith("Admin")));
  assert.equal(settings.publicEndpoint, "http://127.0.0.1:19000");
  assert.equal(settings.MEDIA_S3_INTERNAL_ENDPOINT, "http://seaweed:8333");
  const composeText = composeEnvironment(settings);
  assert.doesNotMatch(composeText, /MEDIA_|SECRET|ACCESS_KEY/);
  assert.match(composeText, /SEAWEED_HOST_PORT=19000/);
});

test("private storage material is excluded from Git and Docker build contexts", () => {
  assert.match(
    readFileSync(path.join(repository, ".gitignore"), "utf8"),
    /^\.nebula-storage\/$/mu,
  );
  assert.match(
    readFileSync(path.join(repository, ".dockerignore"), "utf8"),
    /^\/\.nebula-storage\/$/mu,
  );
});

test("failure summaries preserve primary/cleanup errors without credentials or signed URLs", () => {
  const primary = Object.assign(
    new Error("request https://example.invalid?X-Amz-Signature=secret"),
    {
      name: "NetworkError",
      code: "ECONNRESET",
      config: { secret: "private-value" },
    },
  );
  const cleanup = Object.assign(new Error("seaweed_control_cleanup_failed"), {
    $metadata: { httpStatusCode: 409 },
  });
  const summary = safeFailure(
    new AggregateError([primary, cleanup], "proof_failed"),
  );
  assert.equal(summary.length, 2);
  assert.equal(summary[0].code, "ECONNRESET");
  assert.equal(summary[1].check, "seaweed_control_cleanup_failed");
  assert.equal(summary[1].status, 409);
  assert.doesNotMatch(
    JSON.stringify(summary),
    /Signature|private-value|example\.invalid/,
  );
});

test("container bootstrap reads the exact scoped secret without native files or app credentials in env", async () => {
  const original = fixture();
  const config = credentialConfig(original);
  const settings = containerBootstrapSettings(config, {
    SEAWEED_HOST_PORT: "19000",
    SEAWEED_CORS_ORIGINS: original.SEAWEED_CORS_ORIGINS,
  });
  assert.deepEqual(settings, original);
  for (const change of [
    (value) => value.identities.push(value.identities[1]),
    (value) => value.identities[1].actions.push("Admin"),
    (value) =>
      value.identities[1].credentials.push(value.identities[1].credentials[0]),
    (value) => {
      value.identities[1].actions = ["Read:other", "Write:media", "List:media"];
    },
  ]) {
    const changed = globalThis.structuredClone(config);
    change(changed);
    assert.throws(() =>
      containerBootstrapSettings(changed, {
        SEAWEED_HOST_PORT: "19000",
        SEAWEED_CORS_ORIGINS: original.SEAWEED_CORS_ORIGINS,
      }),
    );
  }
  const sdk = storageSdk(settings, { internal: true });
  try {
    const signed = new URL(
      await sdk.signUpload({ Bucket: "media", Key: "proof.txt" }),
    );
    assert.equal(signed.origin, "http://seaweed:8333");
  } finally {
    sdk.close();
  }
});

test("Media's actual SDK signs explicit binding/cache headers without an empty-body checksum", async () => {
  const sdk = storageSdk(fixture());
  try {
    const url = new URL(
      await sdk.signUpload({
        Bucket: "media",
        Key: "proof/key.txt",
        ContentType: "text/plain",
        CacheControl: "private, max-age=0",
        Metadata: { "nebula-upload-binding": "proof-binding" },
      }),
    );
    const signed = url.searchParams.get("X-Amz-SignedHeaders").split(";");
    assert.ok(signed.includes("x-amz-meta-nebula-upload-binding"));
    assert.ok(signed.includes("cache-control"));
    assert.equal(
      url.searchParams.has("x-amz-meta-nebula-upload-binding"),
      false,
    );
    assert.equal(url.searchParams.has("x-amz-checksum-crc32"), false);
    assert.equal(url.origin, "http://127.0.0.1:19000");
  } finally {
    sdk.close();
  }
});

test("invalid endpoints, origins, bucket names, shared keys and existing-store ports fail before IO", () => {
  const settings = createSettings({});
  for (const [key, value] of [
    ["SEAWEED_HOST_PORT", "9000"],
    ["SEAWEED_HOST_PORT", "19333"],
    ["SEAWEED_HOST_PORT", "0"],
    ["SEAWEED_CORS_ORIGINS", "*"],
    ["SEAWEED_CORS_ORIGINS", "https://admin.example/path"],
    ["SEAWEED_CORS_ORIGINS", "http://localhost:3000,http://localhost:3000"],
    ["MEDIA_S3_BUCKET", "media:*"],
    ["MEDIA_S3_BUCKET", "xn--bucket"],
    ["MEDIA_S3_PUBLIC_ENDPOINT", "http://example.com:19000"],
    ["MEDIA_S3_INTERNAL_ENDPOINT", "http://minio:9000"],
    ["MEDIA_STORAGE_PROVIDER", "seaweedfs"],
    ["MEDIA_S3_ACCESS_KEY", settings.SEAWEED_ADMIN_ACCESS_KEY],
    ["MEDIA_S3_SECRET_KEY", settings.SEAWEED_ADMIN_SECRET_KEY],
  ])
    assert.throws(
      () => validateSettings({ ...settings, [key]: value }),
      { name: /Error/ },
      key,
    );
});

test("preparation reruns retain exact keys/config and refuse conflicts or altered scope", (t) => {
  const owned = mkdtempSync(path.join(os.tmpdir(), "nebula-seaweed-settings-"));
  t.after(() => {
    assert.ok(
      path.resolve(owned).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    assert.ok(path.basename(owned).startsWith("nebula-seaweed-settings-"));
    rmSync(owned, { recursive: true, force: true });
  });
  const directory = path.join(owned, "settings");
  const first = prepareSettings({ directory, env: {} });
  const before = readdirSync(directory).map((file) => [
    file,
    checksum(readFileSync(path.join(directory, file))),
  ]);
  const second = prepareSettings({ directory, env: {} });
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.deepEqual(second.settings, first.settings);
  const mediaFile = path.join(directory, "media.env");
  const mediaText = readFileSync(mediaFile, "utf8");
  assert.equal(
    parseEnv(mediaText).MEDIA_S3_ACCESS_KEY,
    first.settings.MEDIA_S3_ACCESS_KEY,
  );
  assert.equal(
    parseEnv(mediaText).MEDIA_S3_INTERNAL_ENDPOINT,
    "http://seaweed:8333",
  );
  assert.ok(!mediaText.includes(first.settings.SEAWEED_ADMIN_ACCESS_KEY));
  assert.ok(!mediaText.includes(first.settings.SEAWEED_ADMIN_SECRET_KEY));
  // Upgrade the accepted original file set without rotating its settings.
  unlinkSync(mediaFile);
  assert.equal(
    readPreparedSettings(directory).MEDIA_S3_ACCESS_KEY,
    first.settings.MEDIA_S3_ACCESS_KEY,
  );
  prepareSettings({ directory, env: {} });
  assert.equal(readFileSync(mediaFile, "utf8"), mediaText);
  writeFileSync(mediaFile, "MEDIA_S3_ACCESS_KEY=wrong\n");
  assert.throws(
    () => readPreparedSettings(directory),
    /seaweed_media_env_drift/,
  );
  writeFileSync(mediaFile, mediaText);
  assert.deepEqual(
    readdirSync(directory).map((file) => [
      file,
      checksum(readFileSync(path.join(directory, file))),
    ]),
    before,
  );
  assert.throws(
    () => prepareSettings({ directory, env: { MEDIA_S3_BUCKET: "other" } }),
    /seaweed_existing_settings_conflict/,
  );
  // Windows respects the readonly mode; explicitly allow test corruption of this owned fixture.
  chmodSync(path.join(directory, "s3.json"), 0o600);
  writeFileSync(path.join(directory, "s3.json"), "{}");
  assert.throws(() => readPreparedSettings(directory), /seaweed_config_drift/);
});

test("bootstrap handles missing/existing buckets without swallowing auth or create failures", async () => {
  const settings = fixture();
  let created = false;
  const events = [];
  const request = async (role, action) => {
    events.push(`${role}:${action}`);
    if (action === "HeadBucket" && role === "admin" && !created)
      throw failure(404);
    if (action === "CreateBucket") created = true;
    return action === "GetBucketCors" ? corsConfiguration(settings) : {};
  };
  await initializeBucket(settings, request);
  await initializeBucket(settings, request);
  assert.equal(events.filter((v) => v.endsWith(":CreateBucket")).length, 1);
  assert.equal(events.filter((v) => v === "media:HeadBucket").length, 2);
  assert.equal(events.filter((v) => v === "admin:PutBucketCors").length, 2);
  const forbidden = failure(403);
  await assert.rejects(
    initializeBucket(settings, async () => {
      throw forbidden;
    }),
    (e) => e === forbidden,
  );
  const createError = failure(500);
  await assert.rejects(
    initializeBucket(settings, async (_role, action) => {
      throw action === "HeadBucket" ? failure(404) : createError;
    }),
    (e) => e === createError,
  );
});

test("bootstrap rejects stored wildcard CORS drift before announcing success", async () => {
  const settings = fixture();
  await assert.rejects(
    initializeBucket(settings, async (_role, action) => {
      if (action === "GetBucketCors") {
        const cors = corsConfiguration(settings);
        cors.CORSRules[0].AllowedOrigins = ["*"];
        return cors;
      }
      return {};
    }),
    /seaweed_bucket_cors_drift/,
  );
});

test("preflight assertions reject missing signed headers, wildcard origins and missing PUT", () => {
  const origin = "http://localhost:5173";
  const needed = [
    "content-type",
    "cache-control",
    "x-amz-meta-nebula-upload-binding",
  ];
  const headers = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, HEAD, PUT",
    "access-control-allow-headers": needed.join(","),
  };
  assertPreflight(
    new globalThis.Response(null, { status: 200, headers }),
    origin,
    needed,
  );
  for (const changed of [
    { "access-control-allow-origin": "*" },
    { "access-control-allow-methods": "GET" },
    { "access-control-allow-headers": "content-type" },
  ])
    assert.throws(() =>
      assertPreflight(
        new globalThis.Response(null, {
          status: 200,
          headers: { ...headers, ...changed },
        }),
        origin,
        needed,
      ),
    );
  assert.throws(() =>
    assertPreflight(
      new globalThis.Response(null, { status: 403 }),
      origin,
      needed,
    ),
  );
});

test("denied-header preflight accepts withheld permissions but rejects actual grants and outages", () => {
  const needed = ["x-nebula-not-allowed"];
  assertDeniedHeaderPreflight(
    new globalThis.Response(null, { status: 403 }),
    needed,
  );
  // Exact observed pinned-server response: 200 with only Allow-Origin.
  assertDeniedHeaderPreflight(
    new globalThis.Response(null, {
      status: 200,
      headers: { "access-control-allow-origin": "http://localhost:3000" },
    }),
    needed,
  );
  assertDeniedHeaderPreflight(
    new globalThis.Response(null, {
      status: 200,
      headers: { "access-control-allow-headers": "content-type" },
    }),
    needed,
  );
  for (const granted of [
    "x-nebula-not-allowed",
    "X-NEBULA-NOT-ALLOWED",
    "*",
    "content-type, *",
  ])
    assert.throws(
      () =>
        assertDeniedHeaderPreflight(
          new globalThis.Response(null, {
            status: 200,
            headers: { "access-control-allow-headers": granted },
          }),
          needed,
        ),
      /seaweed_denied_header_preflight/,
    );
  assert.throws(
    () =>
      assertDeniedHeaderPreflight(
        new globalThis.Response(null, { status: 503 }),
        needed,
      ),
    /seaweed_denied_header_unexpected_http_status/,
  );
  assert.throws(
    () =>
      assertDeniedHeaderPreflight(
        new globalThis.Response(null, { status: 200 }),
        [],
      ),
    /seaweed_denied_header_request_empty/,
  );
});

function witness(settings) {
  const run = "a".repeat(24);
  return {
    version: 1,
    run,
    bucket: settings.MEDIA_S3_BUCKET,
    endpoint: settings.publicEndpoint,
    key: `.nebula-verification/${run}.txt`,
    controlBucket: `nebula-denied-${run}`,
    creationBucket: `nebula-create-${run}`,
    sha256: checksum(Buffer.from(`nebula-storage-${run}\n`)),
    binding: "b".repeat(32),
    containerId: "c".repeat(64),
    imageId: `sha256:${"d".repeat(64)}`,
    phase: "awaiting-recreation",
    etag: '"witness"',
  };
}

test("witness and cleanup reject unknown ownership; byte, metadata and etag drift fail", async () => {
  const settings = fixture();
  const state = witness(settings);
  validateWitness(state, settings);
  for (const [key, value] of [
    ["key", "foreign.txt"],
    ["bucket", "foreign"],
    ["controlBucket", "foreign"],
    ["creationBucket", "foreign"],
    ["endpoint", "http://minio:9000"],
  ])
    assert.throws(() => validateWitness({ ...state, [key]: value }, settings));
  const result = () => ({
    Body: {
      transformToByteArray: async () =>
        Buffer.from(`nebula-storage-${state.run}\n`),
    },
    Metadata: { "nebula-upload-binding": state.binding },
    ContentType: "text/plain",
    CacheControl: "private, max-age=0",
    ETag: state.etag,
  });
  await verifyStoredWitness(state, settings, async () => result());
  for (const changed of [
    { ETag: '"different"' },
    { Metadata: {} },
    { Body: { transformToByteArray: async () => Buffer.from("wrong") } },
  ])
    await assert.rejects(
      verifyStoredWitness(state, settings, async () => ({
        ...result(),
        ...changed,
      })),
    );
  const calls = [];
  await assert.rejects(
    cleanupControls({ ...state, controlBucket: "foreign" }, async () => {
      calls.push("unexpected");
    }),
  );
  assert.equal(calls.length, 0);
  const cleanupError = failure(409);
  await assert.rejects(
    cleanupControls(state, async (_role, operation, input) => {
      calls.push([operation, input]);
      if (operation === "DeleteBucket") throw cleanupError;
    }),
    (error) =>
      error instanceof AggregateError &&
      error.errors.every((e) => e === cleanupError),
  );
  assert.equal(calls.length, 4);
  assert.ok(
    calls.every(([, input]) =>
      [state.controlBucket, state.creationBucket].includes(input.Bucket),
    ),
  );
  assert.ok(
    calls
      .filter(([op]) => op === "DeleteObject")
      .every(([, input]) => input.Key === state.key),
  );
});
