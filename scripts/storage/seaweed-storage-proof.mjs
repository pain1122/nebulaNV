import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import console from "node:console";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import {
  checksum,
  readPreparedSettings,
  repository,
  safeFailure,
  storageDirectory,
  storageSdk,
} from "./seaweed-setup.mjs";

export function assertPreflight(response, origin, requestedHeaders) {
  assert.equal(response.status, 200, "seaweed_preflight_status");
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    origin,
    "seaweed_preflight_origin",
  );
  const split = (key) =>
    (response.headers.get(key) ?? "")
      .toLowerCase()
      .split(",")
      .map((v) => v.trim());
  assert.ok(
    split("access-control-allow-methods").includes("put"),
    "seaweed_preflight_put_missing",
  );
  for (const header of requestedHeaders)
    assert.ok(
      split("access-control-allow-headers").includes(header),
      "seaweed_preflight_header_missing",
    );
}

export function assertDeniedHeaderPreflight(response, requestedHeaders) {
  assert.ok(requestedHeaders.length > 0, "seaweed_denied_header_request_empty");
  if (response.status === 403) return;
  // A successful OPTIONS without the requested header permission still blocks
  // the browser PUT. Availability errors do not prove a correct CORS denial.
  assert.ok(response.ok, "seaweed_denied_header_unexpected_http_status");
  const permitted = (response.headers.get("access-control-allow-headers") ?? "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim());
  assert.ok(
    !permitted.includes("*") &&
      requestedHeaders.some(
        (header) => !permitted.includes(header.toLowerCase()),
      ),
    "seaweed_denied_header_preflight",
  );
}

export function assertDeniedOriginPreflight(response, requestedOrigin) {
  if (response.status === 403) return;
  assert.ok(response.ok, "seaweed_denied_origin_unexpected_http_status");
  const allowed = response.headers.get("access-control-allow-origin");
  assert.ok(
    allowed !== requestedOrigin && allowed !== "*",
    "seaweed_denied_origin_preflight",
  );
}

export function validateWitness(state, settings) {
  assert.equal(state.version, 1);
  assert.match(state.run, /^[a-f0-9]{24}$/u);
  assert.equal(state.bucket, settings.MEDIA_S3_BUCKET);
  assert.equal(state.endpoint, settings.publicEndpoint);
  assert.equal(state.key, `.nebula-verification/${state.run}.txt`);
  assert.equal(state.controlBucket, `nebula-denied-${state.run}`);
  assert.equal(state.creationBucket, `nebula-create-${state.run}`);
  assert.equal(
    state.sha256,
    checksum(Buffer.from(`nebula-storage-${state.run}\n`)),
  );
  assert.match(state.binding, /^[a-f0-9]{32}$/u);
  assert.match(state.containerId, /^[a-f0-9]{64}$/u);
  assert.match(state.imageId, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(
    ["creating", "awaiting-recreation", "complete", "cleaned"].includes(
      state.phase,
    ),
  );
  return state;
}

function containerIdentity() {
  const run = (args) =>
    execFileSync("docker", args, {
      cwd: repository,
      encoding: "utf8",
      timeout: 10000,
    }).trim();
  const containerId = run([
    "compose",
    "--env-file",
    ".env",
    "--env-file",
    ".nebula-storage/seaweedfs/compose.env",
    "-f",
    "docker-compose.yml",
    "-f",
    "docker/seaweedfs/compose.storage.yml",
    "ps",
    "--quiet",
    "seaweed",
  ]);
  assert.match(
    containerId,
    /^[a-f0-9]{64}$/u,
    "seaweed_prepared_container_missing",
  );
  const [imageId, health, service] = run([
    "inspect",
    "--format",
    '{{.Image}}|{{.State.Health.Status}}|{{index .Config.Labels "com.docker.compose.service"}}',
    containerId,
  ]).split("|");
  assert.equal(health, "healthy", "seaweed_prepared_container_unhealthy");
  assert.equal(service, "seaweed");
  const expected = run([
    "image",
    "inspect",
    "nebulanv-vendor-seaweedfs:4.51-gojose4.1.7",
    "--format",
    "{{.Id}}",
  ]);
  assert.equal(imageId, expected, "seaweed_prepared_container_image_drift");
  return { containerId, imageId };
}

export async function cleanupControls(state, request) {
  assert.match(state.run, /^[a-f0-9]{24}$/u);
  assert.equal(state.key, `.nebula-verification/${state.run}.txt`);
  assert.equal(state.controlBucket, `nebula-denied-${state.run}`);
  assert.equal(state.creationBucket, `nebula-create-${state.run}`);
  const errors = [];
  const remove = async (operation, input) => {
    try {
      await request("admin", operation, input);
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) errors.push(error);
    }
  };
  for (const Bucket of [state.controlBucket, state.creationBucket]) {
    await remove("DeleteObject", { Bucket, Key: state.key });
    // Nonempty/foreign contents cause bucket deletion to fail, not a recursive wipe.
    await remove("DeleteBucket", { Bucket });
  }
  if (errors.length)
    throw new AggregateError(errors, "seaweed_control_cleanup_failed");
}

async function requireDenied(action, label) {
  let failure;
  try {
    await action();
  } catch (error) {
    failure = error;
  }
  assert.ok(failure, `${label}_unexpected_success`);
  assert.equal(
    failure.$metadata?.httpStatusCode,
    403,
    `${label}_must_be_forbidden`,
  );
}

export async function verifyStoredWitness(state, settings, request) {
  validateWitness(state, settings);
  const stored = await request("media", "GetObject", {
    Bucket: state.bucket,
    Key: state.key,
  });
  assert.equal(
    checksum(Buffer.from(await stored.Body.transformToByteArray())),
    state.sha256,
    "seaweed_witness_bytes_drift",
  );
  assert.deepEqual(
    stored.Metadata,
    { "nebula-upload-binding": state.binding },
    "seaweed_witness_metadata_drift",
  );
  assert.equal(stored.ContentType, "text/plain");
  assert.equal(stored.CacheControl, "private, max-age=0");
  if (state.etag)
    assert.equal(stored.ETag, state.etag, "seaweed_witness_etag_drift");
}

async function createWitness(settings, sdk, stateFile) {
  assert.ok(
    !existsSync(stateFile),
    "seaweed_storage_proof_already_exists_preserve_session",
  );
  const run = randomBytes(12).toString("hex");
  const body = Buffer.from(`nebula-storage-${run}\n`);
  const state = {
    version: 1,
    run,
    bucket: settings.MEDIA_S3_BUCKET,
    endpoint: settings.publicEndpoint,
    key: `.nebula-verification/${run}.txt`,
    controlBucket: `nebula-denied-${run}`,
    creationBucket: `nebula-create-${run}`,
    sha256: checksum(body),
    binding: randomBytes(16).toString("hex"),
    ...containerIdentity(),
    phase: "creating",
  };
  const save = () =>
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
      mode: 0o600,
    });
  // Journal before mutation; failures preserve the exact owned key for diagnosis.
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  const url = await sdk.signUpload({
    Bucket: state.bucket,
    Key: state.key,
    ContentType: "text/plain",
    CacheControl: "private, max-age=0",
    Metadata: { "nebula-upload-binding": state.binding },
  });
  assert.ok(
    new URL(url).searchParams
      .get("X-Amz-SignedHeaders")
      ?.split(";")
      .includes("x-amz-meta-nebula-upload-binding"),
    "seaweed_binding_header_must_be_signed",
  );
  const uploadHeaders = {
    "content-type": "text/plain",
    "cache-control": "private, max-age=0",
    "x-amz-meta-nebula-upload-binding": state.binding,
  };
  const preflight = (origin, headers = Object.keys(uploadHeaders)) =>
    globalThis.fetch(url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": headers.join(","),
      },
      signal: globalThis.AbortSignal.timeout(10000),
    });
  for (const origin of settings.origins)
    assertPreflight(
      await preflight(origin),
      origin,
      Object.keys(uploadHeaders),
    );
  let deniedOrigin = "https://nebula-denied.invalid";
  while (settings.origins.includes(deniedOrigin))
    deniedOrigin = deniedOrigin.replace("https://", "https://other-");
  const denied = await preflight(deniedOrigin);
  assert.equal(denied.status, 403, "seaweed_denied_origin_preflight");
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assertDeniedHeaderPreflight(
    await preflight(settings.origins[0], ["x-nebula-not-allowed"]),
    ["x-nebula-not-allowed"],
  );
  console.log("[seaweed-storage] allowed-and-denied-browser-preflights=ok");
  const response = await globalThis.fetch(url, {
    method: "PUT",
    headers: { ...uploadHeaders, Origin: settings.origins[0] },
    body,
    signal: globalThis.AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, "seaweed_signed_browser_upload_status");
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    settings.origins[0],
  );
  state.etag = response.headers.get("etag");
  assert.ok(state.etag, "seaweed_upload_etag_missing");
  await verifyStoredWitness(state, settings, sdk.request);
  const anonymous = await globalThis.fetch(
    `${settings.publicEndpoint}/${state.bucket}/${state.key}`,
    { signal: globalThis.AbortSignal.timeout(10000) },
  );
  assert.equal(
    anonymous.status,
    403,
    "seaweed_anonymous_read_must_be_forbidden",
  );
  // The fixture bucket is owned by this journal, never by a guessed shared name.
  const controlBucket = state.controlBucket;
  await sdk.request("admin", "CreateBucket", { Bucket: controlBucket });
  const errors = [];
  try {
    await sdk.request("admin", "PutObject", {
      Bucket: controlBucket,
      Key: state.key,
      Body: body,
    });
    await sdk.request("admin", "HeadObject", {
      Bucket: controlBucket,
      Key: state.key,
    });
    await requireDenied(
      () =>
        sdk.request("media", "GetObject", {
          Bucket: controlBucket,
          Key: state.key,
        }),
      "seaweed_cross_bucket_read",
    );
    await requireDenied(
      () =>
        sdk.request("media", "ListObjectsV2", {
          Bucket: controlBucket,
          MaxKeys: 1,
        }),
      "seaweed_cross_bucket_list",
    );
    await requireDenied(
      () =>
        sdk.request("media", "PutObject", {
          Bucket: controlBucket,
          Key: state.key,
          Body: body,
        }),
      "seaweed_cross_bucket_write",
    );
    await requireDenied(
      () =>
        sdk.request("media", "CreateBucket", { Bucket: state.creationBucket }),
      "seaweed_media_bucket_admin",
    );
  } catch (error) {
    errors.push(error);
  }
  try {
    await cleanupControls(state, sdk.request);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length)
    throw new AggregateError(errors, "seaweed_scope_or_cleanup_failed");
  console.log(
    "[seaweed-storage] signed-upload-bytes-metadata-scoped-access=ok",
  );
  state.phase = "awaiting-recreation";
  save();
  console.log(
    "[seaweed-storage] witness-saved; recreate only seaweed, then verify",
  );
}

async function verifyAfterRecreation(settings, sdk, stateFile) {
  const state = validateWitness(
    JSON.parse(readFileSync(stateFile, "utf8")),
    settings,
  );
  assert.equal(
    state.phase,
    "awaiting-recreation",
    "seaweed_witness_not_awaiting_recreation",
  );
  const current = containerIdentity();
  assert.notEqual(
    current.containerId,
    state.containerId,
    "seaweed_container_was_not_recreated",
  );
  assert.equal(
    current.imageId,
    state.imageId,
    "seaweed_recreation_changed_image",
  );
  await verifyStoredWitness(state, settings, sdk.request);
  await sdk.request("media", "DeleteObject", {
    Bucket: state.bucket,
    Key: state.key,
  });
  let missing;
  try {
    await sdk.request("media", "HeadObject", {
      Bucket: state.bucket,
      Key: state.key,
    });
  } catch (error) {
    missing = error;
  }
  assert.equal(
    missing?.$metadata?.httpStatusCode,
    404,
    "seaweed_witness_cleanup_failed",
  );
  state.phase = "complete";
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(
    "[seaweed-storage] recreated-container-preserves-bytes-metadata-etag=ok",
  );
  console.log("[seaweed-storage] owned-cleanup=ok");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let sdk;
  try {
    assert.equal(
      process.argv.length,
      3,
      "seaweed_storage_proof_requires_witness_verify_or_cleanup",
    );
    assert.ok(
      ["witness", "verify", "cleanup"].includes(process.argv[2]),
      "seaweed_storage_proof_unknown_mode",
    );
    const settings = readPreparedSettings();
    sdk = storageSdk(settings);
    const stateFile = path.join(storageDirectory, "proof.json");
    if (process.argv[2] === "witness")
      await createWitness(settings, sdk, stateFile);
    else if (process.argv[2] === "verify")
      await verifyAfterRecreation(settings, sdk, stateFile);
    else {
      const state = validateWitness(
        JSON.parse(readFileSync(stateFile, "utf8")),
        settings,
      );
      const errors = [];
      try {
        await cleanupControls(state, sdk.request);
      } catch (error) {
        errors.push(error);
      }
      try {
        await sdk.request("media", "DeleteObject", {
          Bucket: state.bucket,
          Key: state.key,
        });
      } catch (error) {
        if (error.$metadata?.httpStatusCode !== 404) errors.push(error);
      }
      if (errors.length)
        throw new AggregateError(errors, "seaweed_owned_cleanup_failed");
      state.phase = "cleaned";
      writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n", {
        mode: 0o600,
      });
      console.log(
        "[seaweed-storage] owned-cleanup=ok; preserve the journal before any fresh proof",
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          error: "seaweed_storage_proof_failed",
          stage: process.argv[2],
          causes: safeFailure(error),
          next: "preserve proof.json and stop",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    sdk?.close();
  }
}
