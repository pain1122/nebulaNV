import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

// Reuse Media's exact installed S3 dependencies; do not add a second SDK version.
const root = fileURLToPath(new URL("../../", import.meta.url));
const mediaRequire = createRequire(
  path.join(root, "apps/media-service/package.json"),
);
const {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = mediaRequire("@aws-sdk/client-s3");
const { getSignedUrl } = mediaRequire("@aws-sdk/s3-request-presigner");
const directory = path.join(root, ".ci-evidence/seaweed-s3-proof");
const stateFile = path.join(directory, "state.json");
const endpoint = "http://127.0.0.1:19333";
const keys = [
  "public/library/proof folder/source+1.txt",
  "approved/proof/original.txt",
  "derivatives/proof/card.txt",
  "public/library/witness.txt",
  "public/library/denied.txt",
];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const write = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const mark = (text) => console.log(`[seaweed-s3-proof] ${text}=ok`);
const clients = [];
const errors = [];

function loadState() {
  const state = read(stateFile);
  assert.match(state.run, /^[a-f0-9]{24}$/u);
  assert.equal(state.endpoint, endpoint, "proof_endpoint_must_stay_isolated");
  assert.deepEqual(state.buckets, [
    `nebula-proof-${state.run}`,
    `other-proof-${state.run}`,
  ]);
  return state;
}
function client(credentials, signingOnly = false) {
  const value = new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials,
    maxAttempts: 1,
    ...(signingOnly ? { requestChecksumCalculation: "WHEN_REQUIRED" } : {}),
  });
  clients.push(value);
  return value;
}
const send = (value, command) =>
  value.send(command, {
    abortSignal: globalThis.AbortSignal.timeout(15_000),
  });
async function expectStatus(action, expected, label) {
  let failure;
  try {
    await action();
  } catch (error) {
    failure = error;
  }
  assert.ok(failure, `${label}_unexpected_success`);
  assert.equal(
    failure.$metadata?.httpStatusCode,
    expected,
    `${label}_wrong_status`,
  );
}
async function expectHttpStatus(response, expected, label) {
  const body = await response.text();
  const code =
    body.match(/<Code>([A-Za-z0-9]+)<\/Code>/u)?.[1] ?? "unknown_s3_error";
  assert.equal(
    response.status,
    expected,
    `${label}_http_${response.status}_${code}`,
  );
}
async function ready(admin) {
  const deadline = Date.now() + 45_000;
  for (;;) {
    try {
      await admin.send(new ListBucketsCommand({}), {
        abortSignal: globalThis.AbortSignal.timeout(
          Math.max(1, Math.min(5000, deadline - Date.now())),
        ),
      });
      return;
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 403 || Date.now() >= deadline)
        throw error;
      await delay(1000);
    }
  }
}
async function bytes(value, bucket, key, extra = {}) {
  const object = await send(
    value,
    new GetObjectCommand({ Bucket: bucket, Key: key, ...extra }),
  );
  return {
    object,
    body: Buffer.from(await object.Body.transformToByteArray()),
  };
}
async function cleanup(state, admin) {
  const failures = [];
  for (const Bucket of state.buckets) {
    let listing;
    try {
      listing = await send(admin, new ListObjectsV2Command({ Bucket }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) continue;
      failures.push(error);
      continue;
    }
    // Refuse unknown content rather than emptying a bucket based on a name alone.
    const unknown = (listing.Contents ?? []).filter(
      (object) => !keys.includes(object.Key),
    );
    if (unknown.length || listing.IsTruncated) {
      failures.push(new Error("proof_cleanup_unknown_objects"));
      continue;
    }
    for (const object of listing.Contents ?? []) {
      try {
        await send(admin, new DeleteObjectCommand({ Bucket, Key: object.Key }));
        await expectStatus(
          () => send(admin, new HeadObjectCommand({ Bucket, Key: object.Key })),
          404,
          "deleted_object_missing",
        );
      } catch (error) {
        failures.push(error);
      }
    }
    try {
      const remaining = await send(admin, new ListObjectsV2Command({ Bucket }));
      assert.equal(
        remaining.Contents?.length ?? 0,
        0,
        "deleted_bucket_must_be_empty",
      );
      assert.ok(!remaining.IsTruncated, "cleanup_listing_must_be_complete");
      await send(admin, new DeleteBucketCommand({ Bucket }));
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length)
    throw new AggregateError(failures, "proof_cleanup_failed");
  mark("owned-cleanup");
}

async function run(state, admin) {
  assert.equal(state.phase, "prepared", "proof_run_requires_prepared_state");
  const [Bucket, otherBucket] = state.buckets;
  const app = client(state.identities[1]);
  const signing = client(state.identities[1], true);
  const other = client(state.identities[2]);
  for (const name of state.buckets)
    await send(admin, new CreateBucketCommand({ Bucket: name }));
  const body = Buffer.from(`nebula storage proof ${state.run}`);
  const binding = randomBytes(16).toString("hex");
  const signed = await getSignedUrl(
    signing,
    new PutObjectCommand({
      Bucket,
      Key: "public/library/proof folder/source+1.txt",
      ContentType: "text/plain",
      Metadata: { "nebula-upload-binding": binding },
    }),
    {
      expiresIn: 120,
      unhoistableHeaders: new Set(["x-amz-meta-nebula-upload-binding"]),
    },
  );
  const uploadHeaders = {
    "content-type": "text/plain",
    "x-amz-meta-nebula-upload-binding": binding,
  };
  assert.ok(
    new URL(signed).searchParams
      .get("X-Amz-SignedHeaders")
      ?.split(";")
      .includes("x-amz-meta-nebula-upload-binding"),
    "upload_binding_header_must_be_signed",
  );
  const uploaded = await globalThis.fetch(signed, {
    method: "PUT",
    body,
    headers: uploadHeaders,
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  await expectHttpStatus(uploaded, 200, "presigned_upload");
  for (const headers of [
    { "content-type": "text/plain" },
    { ...uploadHeaders, "x-amz-meta-nebula-upload-binding": "tampered" },
  ]) {
    const denied = await globalThis.fetch(signed, {
      method: "PUT",
      body,
      headers,
      signal: globalThis.AbortSignal.timeout(15_000),
    });
    await expectHttpStatus(
      denied,
      403,
      "missing_or_tampered_signed_binding_denied",
    );
  }
  const head = await send(
    app,
    new HeadObjectCommand({
      Bucket,
      Key: "public/library/proof folder/source+1.txt",
    }),
  );
  assert.equal(head.ContentLength, body.length);
  assert.equal(head.ContentType, "text/plain");
  assert.equal(head.Metadata?.["nebula-upload-binding"], binding);
  assert.ok(head.ETag, "upload_etag_required");
  const original = await bytes(
    app,
    Bucket,
    "public/library/proof folder/source+1.txt",
    {
      IfMatch: head.ETag,
    },
  );
  assert.equal(sha(original.body), sha(body));
  await expectStatus(
    () =>
      send(
        app,
        new GetObjectCommand({
          Bucket,
          Key: "public/library/proof folder/source+1.txt",
          IfMatch: '"00000000000000000000000000000000"',
        }),
      ),
    412,
    "wrong_etag",
  );
  mark("presigned-upload-metadata-head-etag-bytes");

  await send(
    app,
    new PutObjectCommand({
      Bucket,
      Key: "approved/proof/original.txt",
      Body: body,
      ContentType: "text/plain",
      CacheControl: "private, no-store",
      IfNoneMatch: "*",
    }),
  );
  await expectStatus(
    () =>
      send(
        app,
        new PutObjectCommand({
          Bucket,
          Key: "approved/proof/original.txt",
          Body: Buffer.from("must not replace approved bytes"),
          IfNoneMatch: "*",
        }),
      ),
    412,
    "immutable_overwrite",
  );
  assert.equal(
    sha((await bytes(app, Bucket, "approved/proof/original.txt")).body),
    sha(body),
  );
  assert.equal(
    (
      await send(
        app,
        new HeadObjectCommand({ Bucket, Key: "approved/proof/original.txt" }),
      )
    ).CacheControl,
    "private, no-store",
  );
  mark("conditional-create-preserves-approved-bytes");

  const contenders = Array.from({ length: 8 }, (_, index) =>
    Buffer.from(`race-${index}-${state.run}`),
  );
  const raced = await Promise.allSettled(
    contenders.map((Body) =>
      send(
        app,
        new PutObjectCommand({
          Bucket,
          Key: "derivatives/proof/card.txt",
          Body,
          IfNoneMatch: "*",
        }),
      ),
    ),
  );
  const winners = raced.flatMap((result, index) =>
    result.status === "fulfilled" ? [index] : [],
  );
  assert.equal(winners.length, 1, "conditional_create_exactly_one_winner");
  for (const result of raced.filter((result) => result.status === "rejected"))
    assert.ok(
      [409, 412].includes(result.reason.$metadata?.httpStatusCode),
      "race_rejected_for_unexpected_reason",
    );
  assert.equal(
    sha((await bytes(app, Bucket, "derivatives/proof/card.txt")).body),
    sha(contenders[winners[0]]),
  );
  mark("competing-conditional-writes-one-winner");

  const range = await bytes(
    app,
    Bucket,
    "public/library/proof folder/source+1.txt",
    { Range: "bytes=0-5" },
  );
  assert.equal(range.object.$metadata.httpStatusCode, 206);
  assert.deepEqual(range.body, body.subarray(0, 6));
  assert.equal(range.object.ContentRange, `bytes 0-5/${body.length}`);
  await expectStatus(
    () =>
      send(
        app,
        new GetObjectCommand({ Bucket, Key: "public/library/denied.txt" }),
      ),
    404,
    "missing_object",
  );
  mark("range-read-and-missing-object-contract");

  const otherBody = Buffer.from(`other application ${state.run}`);
  await send(
    other,
    new PutObjectCommand({
      Bucket: otherBucket,
      Key: "public/library/witness.txt",
      Body: otherBody,
    }),
  );
  for (const [who, target, key] of [
    [app, otherBucket, "public/library/witness.txt"],
    [other, Bucket, "public/library/proof folder/source+1.txt"],
  ]) {
    await expectStatus(
      () => send(who, new GetObjectCommand({ Bucket: target, Key: key })),
      403,
      "cross_app_read",
    );
    await expectStatus(
      () =>
        send(
          who,
          new PutObjectCommand({
            Bucket: target,
            Key: "public/library/denied.txt",
            Body: body,
          }),
        ),
      403,
      "cross_app_write",
    );
    await expectStatus(
      () => send(who, new DeleteObjectCommand({ Bucket: target, Key: key })),
      403,
      "cross_app_delete",
    );
    await expectStatus(
      () => send(who, new ListObjectsV2Command({ Bucket: target })),
      403,
      "cross_app_list",
    );
  }
  assert.equal(
    sha((await bytes(other, otherBucket, "public/library/witness.txt")).body),
    sha(otherBody),
  );
  const unsignedUrl = new URL(signed);
  unsignedUrl.search = "";
  const unsigned = await globalThis.fetch(unsignedUrl, {
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  await expectHttpStatus(unsigned, 403, "anonymous_read_denied");
  const tampered = new URL(signed);
  const signature = tampered.searchParams.get("X-Amz-Signature");
  assert.ok(signature, "presigned_signature_required");
  tampered.searchParams.set(
    "X-Amz-Signature",
    (signature[0] === "0" ? "1" : "0") + signature.slice(1),
  );
  const rejected = await globalThis.fetch(tampered, {
    method: "PUT",
    body,
    headers: uploadHeaders,
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  await expectHttpStatus(rejected, 403, "invalid_signature_denied");
  assert.equal(
    sha(
      (await bytes(app, Bucket, "public/library/proof folder/source+1.txt"))
        .body,
    ),
    sha(body),
  );
  mark("two-application-bucket-isolation-and-signature-denial");
  state.witnesses = [
    {
      bucket: Bucket,
      key: "public/library/proof folder/source+1.txt",
      sha256: sha(body),
      etag: head.ETag,
      metadata: { "nebula-upload-binding": binding },
      contentType: "text/plain",
    },
    {
      bucket: Bucket,
      key: "approved/proof/original.txt",
      sha256: sha(body),
      cacheControl: "private, no-store",
    },
    {
      bucket: Bucket,
      key: "derivatives/proof/card.txt",
      sha256: sha(contenders[winners[0]]),
    },
    {
      bucket: otherBucket,
      key: "public/library/witness.txt",
      sha256: sha(otherBody),
    },
  ];
  state.phase = "awaiting-restart";
  write(stateFile, state);
  console.log(
    "[seaweed-s3-proof] storage proof passed; restart the isolated server, then verify-after-restart",
  );
}

function prepare() {
  mkdirSync(directory, { recursive: true });
  assert.ok(
    !existsSync(stateFile),
    "proof_state_already_exists_use_existing_session",
  );
  const run = randomBytes(12).toString("hex");
  const buckets = [`nebula-proof-${run}`, `other-proof-${run}`];
  const identities = ["admin", "nebula", "other"].map((name) => ({
    accessKeyId: `proof-${name}-${randomBytes(8).toString("hex")}`,
    secretAccessKey: randomBytes(32).toString("hex"),
  }));
  write(path.join(directory, "s3.json"), {
    identities: identities.map((credentials, index) => ({
      name: ["proof-admin", "proof-nebula", "proof-other"][index],
      credentials: [
        {
          accessKey: credentials.accessKeyId,
          secretKey: credentials.secretAccessKey,
        },
      ],
      actions:
        index === 0
          ? ["Admin", "Read", "Write", "List"]
          : ["Read", "Write", "List"].map(
              (action) => `${action}:${buckets[index - 1]}`,
            ),
    })),
  });
  write(stateFile, { run, endpoint, buckets, identities, phase: "prepared" });
  mark("prepared-random-credentials-two-scoped-buckets");
}

const mode = process.argv[2];
assert.ok(
  ["prepare", "run", "verify-after-restart", "cleanup"].includes(mode),
  "expected_proof_mode",
);
if (mode === "prepare") prepare();
else {
  const state = loadState();
  const admin = client(state.identities[0]);
  try {
    await ready(admin);
    if (mode === "run") {
      if (state.phase === "failed") {
        // Reuse this isolated session's credentials only after owned cleanup.
        // Unknown objects still refuse cleanup; an unfinished good run is never reset.
        await cleanup(state, admin);
        state.phase = "prepared";
        state.retries = (state.retries ?? 0) + 1;
        write(stateFile, state);
      }
      await run(state, admin);
    } else if (mode === "verify-after-restart") {
      assert.equal(state.phase, "awaiting-restart");
      assert.equal(state.witnesses.length, 4);
      for (const witness of state.witnesses) {
        assert.ok(
          state.buckets.includes(witness.bucket) && keys.includes(witness.key),
          "invalid_witness_scope",
        );
        const restored = await bytes(admin, witness.bucket, witness.key);
        assert.equal(sha(restored.body), witness.sha256);
        if (witness.etag) assert.equal(restored.object.ETag, witness.etag);
        if (witness.metadata)
          assert.deepEqual(restored.object.Metadata, witness.metadata);
        if (witness.contentType)
          assert.equal(restored.object.ContentType, witness.contentType);
        if (witness.cacheControl)
          assert.equal(restored.object.CacheControl, witness.cacheControl);
      }
      mark("restart-preserves-objects-metadata-index-and-bytes");
      await cleanup(state, admin);
      state.phase = "complete";
      write(stateFile, state);
    } else {
      await cleanup(state, admin);
      state.phase = "cleaned";
      write(stateFile, state);
    }
  } catch (error) {
    errors.push(error);
    if (mode === "run" && state.phase === "prepared") {
      try {
        await cleanup(state, admin);
      } catch (cleanupError) {
        errors.push(cleanupError);
      }
      state.phase = "failed";
      write(stateFile, state);
    }
  } finally {
    for (const value of clients) value.destroy();
  }
}
if (errors.length) {
  const describe = (error) => ({
    name: error.name,
    message: error.message,
    status: error.$metadata?.httpStatusCode,
    causes: error.errors?.map(describe),
  });
  console.error(
    JSON.stringify(
      { error: "seaweed_s3_proof_failed", causes: errors.map(describe) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
