import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { URL } from "node:url";
import { parseEnv } from "node:util";
import { createSettings, validateSettings } from "./seaweed-setup.mjs";
import {
  deliveryFacts,
  fingerprint,
  listObjects,
  transferObjects,
  activationEnvText,
  activationValues,
  activeComposeFiles,
  writeActivationFiles,
} from "./seaweed-transfer.mjs";

test("activation env preserves unrelated values and gives Compose/native clients their correct endpoints", () => {
  const settings = validateSettings(createSettings());
  const values = activationValues(settings);
  const text =
    "# keep this comment\r\nDATABASE_URL='owned-fixture-database'\r\nexport MEDIA_S3_ENDPOINT='old'\r\n";
  const updated = activationEnvText(text, values.root);
  assert.ok(
    updated.includes(
      "# keep this comment\r\nDATABASE_URL='owned-fixture-database'\r\n",
    ),
  );
  const parsed = parseEnv(updated);
  assert.equal(parsed.COMPOSE_FILE, activeComposeFiles.join("|"));
  assert.equal(parsed.COMPOSE_PATH_SEPARATOR, "|");
  assert.equal(parsed.MEDIA_S3_ENDPOINT, "old");
  assert.equal(parsed.MEDIA_S3_INTERNAL_ENDPOINT, undefined);
  assert.equal(
    parseEnv(activationEnvText(text, values.native)).MEDIA_S3_INTERNAL_ENDPOINT,
    settings.publicEndpoint,
  );
  assert.equal(parsed.MEDIA_S3_ACCESS_KEY, undefined);
  assert.ok(!updated.includes(settings.MEDIA_S3_ACCESS_KEY));
  assert.ok(!updated.includes(settings.SEAWEED_ADMIN_ACCESS_KEY));
  assert.ok(!updated.includes(settings.SEAWEED_ADMIN_SECRET_KEY));
  assert.equal(activationEnvText(updated, values.root), updated);
  assert.throws(
    () =>
      activationEnvText("MEDIA_S3_ENDPOINT=a\nexport MEDIA_S3_ENDPOINT=b\n", {
        MEDIA_S3_ENDPOINT: "new",
      }),
    /transfer_activation_duplicate_env_assignment/u,
  );
  assert.throws(
    () => activationEnvText("", { VALUE: "line1\nline2" }),
    /transfer_activation_env_control_character/u,
  );
});

function activationFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "nebula-transfer-activation-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("nebula-transfer-activation-"));
    rmSync(root, { recursive: true });
  });
  const descriptors = ["root", "native"].map((name) => {
    const file = path.join(root, `${name}.env`);
    writeFileSync(file, "# original\nOTHER=retained\nMEDIA_S3_ENDPOINT=old\n");
    return {
      file,
      backup: path.join(root, `${name}.before`),
      values: { MEDIA_S3_ENDPOINT: `${name}-new` },
    };
  });
  return { descriptors, receiptFile: path.join(root, "activation.json") };
}

test("activation backups, reruns and exact restoration retain original config", (t) => {
  const x = activationFixture(t);
  const originals = x.descriptors.map(({ file }) => readFileSync(file, "utf8"));
  writeActivationFiles(x.descriptors, x.receiptFile);
  writeActivationFiles(x.descriptors, x.receiptFile);
  x.descriptors.forEach(({ file, backup, values }, i) => {
    assert.equal(
      parseEnv(readFileSync(file, "utf8")).MEDIA_S3_ENDPOINT,
      values.MEDIA_S3_ENDPOINT,
    );
    assert.equal(readFileSync(backup, "utf8"), originals[i]);
  });
  writeActivationFiles(x.descriptors, x.receiptFile, { restore: true });
  x.descriptors.forEach(({ file }, i) =>
    assert.equal(readFileSync(file, "utf8"), originals[i]),
  );
  assert.equal(
    JSON.parse(readFileSync(x.receiptFile, "utf8")).phase,
    "restored",
  );
});

test("activation refuses file/backup/settings drift before modifying either config", (t) => {
  const x = activationFixture(t);
  writeActivationFiles(x.descriptors, x.receiptFile);
  const [a, b] = x.descriptors;
  const beforeA = readFileSync(a.file, "utf8");
  writeFileSync(b.file, readFileSync(b.file, "utf8") + "USER_EDIT=keep\n");
  assert.throws(
    () => writeActivationFiles(x.descriptors, x.receiptFile, { restore: true }),
    /transfer_activation_file_drift/u,
  );
  assert.equal(readFileSync(a.file, "utf8"), beforeA);
  writeFileSync(
    b.file,
    activationEnvText(readFileSync(b.backup, "utf8"), b.values),
  );
  const changed = x.descriptors.map((d) => ({
    ...d,
    values: { MEDIA_S3_ENDPOINT: "changed-after-plan" },
  }));
  assert.throws(
    () => writeActivationFiles(changed, x.receiptFile),
    /transfer_activation_settings_drift/u,
  );
  writeFileSync(a.backup, "corrupt backup");
  assert.throws(
    () => writeActivationFiles(x.descriptors, x.receiptFile),
    /transfer_activation_backup_drift/u,
  );
});

test("activation resumes a partially applied config without replacing its backups", (t) => {
  const x = activationFixture(t);
  writeActivationFiles(x.descriptors, x.receiptFile);
  const b = x.descriptors[1];
  const backup = readFileSync(b.backup, "utf8");
  writeFileSync(b.file, backup);
  writeActivationFiles(x.descriptors, x.receiptFile);
  assert.equal(
    parseEnv(readFileSync(b.file, "utf8")).MEDIA_S3_ENDPOINT,
    b.values.MEDIA_S3_ENDPOINT,
  );
  assert.equal(readFileSync(b.backup, "utf8"), backup);
});

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
function store(entries = [], prefix = "source") {
  const objects = new Map(
    entries.map(([key, text, headers = {}]) => [
      key,
      {
        bytes: Buffer.from(text),
        ETag: `"${prefix}-${key}"`,
        ContentType: "image/png",
        CacheControl: "private, no-store",
        Metadata: { "nebula-upload-binding": "bound" },
        ...headers,
      },
    ]),
  );
  const calls = [];
  const request = async (operation, input) => {
    calls.push({ operation, input });
    if (operation === "ListObjectsV2")
      return {
        Contents: [...objects].map(([Key, row]) => ({
          Key,
          Size: row.bytes.length,
          ETag: row.ETag,
        })),
      };
    const row = objects.get(input.Key);
    if (operation === "PutObject") {
      assert.equal(input.IfNoneMatch, "*", "writes must be create-only");
      assert.ok(!row, "must never overwrite");
      objects.set(input.Key, {
        ...Object.fromEntries(
          [
            "ContentType",
            "CacheControl",
            "ContentDisposition",
            "ContentEncoding",
            "ContentLanguage",
            "Expires",
            "WebsiteRedirectLocation",
            "Metadata",
          ]
            .filter((key) => input[key] !== undefined)
            .map((key) => [key, input[key]]),
        ),
        bytes: Buffer.from(input.Body),
        ETag: `"${prefix}-${input.Key}"`,
      });
      return {};
    }
    assert.ok(row, "object must exist");
    if (operation === "HeadObject")
      return { ETag: row.ETag, ContentLength: row.bytes.length };
    assert.equal(operation, "GetObject");
    assert.equal(input.IfMatch, row.ETag, "reads must bind listed version");
    const { bytes, ...headers } = row;
    return {
      ...headers,
      ContentLength: row.bytes.length,
      Body: (async function* () {
        yield bytes;
      })(),
    };
  };
  return { request, objects, calls };
}

function database() {
  return {
    media: [
      {
        id: "media-1",
        storage: "s3",
        bucket: "media",
        status: "READY",
        scanStatus: "CLEAN",
      },
    ],
    sources: [
      {
        mediaId: "media-1",
        bucket: "media",
        path: "source",
        sha256: sha("approved"),
        sizeBytes: 8,
      },
    ],
    derivatives: [
      {
        mediaId: "media-1",
        generationId: "active",
        bucket: "media",
        path: "card",
        sha256: sha("crop"),
        sizeBytes: 4,
      },
      {
        mediaId: "media-1",
        generationId: "old",
        bucket: "media",
        path: "retired",
        sha256: sha("old"),
        sizeBytes: 3,
      },
    ],
    states: [{ mediaId: "media-1", approvedGenerationId: "active" }],
    generations: [
      {
        id: "active",
        mediaId: "media-1",
        status: "COMPLETED",
        retiredAt: null,
      },
      { id: "old", mediaId: "media-1", status: "COMPLETED", retiredAt: "past" },
    ],
    jobs: [{ status: "COMPLETED" }],
    cleanup: [],
  };
}

test("installed Media SDK serializes copied expiry, metadata and create-only headers", async () => {
  const require = createRequire(
    new URL("../../apps/media-service/package.json", import.meta.url),
  );
  const sdk = require("@aws-sdk/client-s3");
  let captured;
  const client = new sdk.S3Client({
    endpoint: "http://127.0.0.1:19000",
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "owned-test-access",
      secretAccessKey: "owned-test-secret",
    },
    maxAttempts: 1,
    requestHandler: {
      handle: async (request) => {
        if (request.method === "GET" && request.query["list-type"])
          return {
            response: {
              statusCode: 200,
              headers: {},
              body: Readable.from([
                "<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>",
              ]),
            },
          };
        if (request.method === "PUT") captured = request;
        return {
          response: {
            statusCode: 200,
            headers: {
              etag: '"independent-target-etag"',
              "content-length": "5",
              "content-type": "image/png",
              "cache-control": "private, no-store",
              expires: "Tue, 01 Jan 2030 00:00:00 GMT",
              "x-amz-meta-nebula-upload-binding": "binding-fixture",
            },
            body:
              request.method === "GET"
                ? Readable.from([Buffer.from("bytes")])
                : Buffer.alloc(0),
          },
        };
      },
    },
  });
  try {
    const source = store([
      [
        "source",
        "bytes",
        {
          Expires: new Date("2030-01-01T00:00:00Z"),
          Metadata: { "nebula-upload-binding": "binding-fixture" },
        },
      ],
    ]);
    await transferObjects({
      source: source.request,
      target: (operation, input) =>
        client.send(new sdk[`${operation}Command`](input)),
      bucket: "media",
      inventory: await listObjects(source.request, "media"),
      references: [],
      copy: true,
    });
    assert.equal(captured.headers["if-none-match"], "*");
    assert.equal(captured.headers["content-type"], "image/png");
    assert.equal(captured.headers["cache-control"], "private, no-store");
    assert.equal(captured.headers.expires, "Tue, 01 Jan 2030 00:00:00 GMT");
    assert.equal(
      captured.headers["x-amz-meta-nebula-upload-binding"],
      "binding-fixture",
    );
  } finally {
    client.destroy();
  }
});

test("transfer preserves independently read bytes and metadata with different provider ETags; rerun never overwrites", async () => {
  const source = store([
    [
      "source",
      "approved",
      {
        Expires: new Date("2030-01-01T00:00:00Z"),
        ContentDisposition: 'inline; filename="demo.png"',
      },
    ],
    ["card", "crop"],
    ["unreferenced", "retained"],
  ]);
  const target = store([], "seaweed");
  const inventory = await listObjects(source.request, "media");
  const references = deliveryFacts(database(), "media", inventory);
  assert.equal(
    references.length,
    2,
    "retired outputs are not deliverable requirements",
  );
  const input = {
    source: source.request,
    target: target.request,
    bucket: "media",
    inventory,
    references,
  };
  const receipt = await transferObjects({ ...input, copy: true });
  assert.equal(
    receipt.length,
    3,
    "unreferenced source objects must also be retained",
  );
  assert.notEqual(
    source.objects.get("source").ETag,
    target.objects.get("source").ETag,
  );
  assert.equal(fingerprint(await transferObjects(input)), fingerprint(receipt));
  await transferObjects({ ...input, copy: true });
  assert.equal(
    target.calls.filter((row) => row.operation === "PutObject").length,
    3,
  );
  assert.ok(target.objects.get("source").Expires instanceof Date);
  assert.equal(
    target.objects.get("source").Expires.toISOString(),
    "2030-01-01T00:00:00.000Z",
  );
  assert.equal(
    target.objects.get("source").Metadata["nebula-upload-binding"],
    "bound",
  );
});

test("reverse-copy can preserve new post-cutover objects without deleting retained old objects", async () => {
  const seaweed = store([["new", "new bytes"]], "seaweed");
  const minio = store([["old", "old retained bytes"]], "minio");
  await transferObjects({
    source: seaweed.request,
    target: minio.request,
    bucket: "media",
    inventory: await listObjects(seaweed.request, "media"),
    references: [],
    copy: true,
  });
  assert.equal(minio.objects.get("new").bytes.toString(), "new bytes");
  assert.equal(minio.objects.get("old").bytes.toString(), "old retained bytes");
  assert.ok(!minio.calls.some((row) => row.operation.startsWith("Delete")));
});

for (const [name, headers, contents] of [
  ["different bytes", {}, "changed"],
  [
    "different binding",
    { Metadata: { "nebula-upload-binding": "wrong" } },
    "approved",
  ],
  ["different delivery header", { CacheControl: "public" }, "approved"],
])
  test(`transfer rejects destination conflict: ${name}`, async () => {
    const source = store([["source", "approved"]]);
    const target = store([["source", contents, headers]], "destination");
    await assert.rejects(
      transferObjects({
        source: source.request,
        target: target.request,
        bucket: "media",
        inventory: await listObjects(source.request, "media"),
        references: [],
        copy: true,
      }),
      /transfer_destination_conflict/u,
    );
    assert.ok(!target.calls.some((row) => row.operation === "PutObject"));
  });

test("source checksum drift fails before any destination write", async () => {
  const source = store([["source", "tampered"]]);
  const target = store();
  await assert.rejects(
    transferObjects({
      source: source.request,
      target: target.request,
      bucket: "media",
      inventory: await listObjects(source.request, "media"),
      references: [{ path: "source", sha256: sha("approved") }],
      copy: true,
    }),
    /transfer_source_checksum_mismatch/u,
  );
  assert.ok(!target.calls.some((row) => row.operation === "PutObject"));
});

test("incomplete target verification and source inventory changes fail closed", async () => {
  const source = store([["source", "approved"]]);
  const target = store();
  const inventory = await listObjects(source.request, "media");
  await assert.rejects(
    transferObjects({
      source: source.request,
      target: target.request,
      bucket: "media",
      inventory,
      references: [],
    }),
    /transfer_destination_object_missing/u,
  );
  const changing = async (op, input) => {
    if (op === "PutObject")
      source.objects.set("late-upload", {
        bytes: Buffer.from("late"),
        ETag: '"late"',
      });
    return target.request(op, input);
  };
  await assert.rejects(
    transferObjects({
      source: source.request,
      target: changing,
      bucket: "media",
      inventory,
      references: [],
      copy: true,
    }),
    /transfer_source_inventory_drift/u,
  );
});

test("delivery validation rejects missing approved data, active work, wrong scope and unfinished uploads", () => {
  const inventory = [
    { Key: "source", Size: 8 },
    { Key: "card", Size: 4 },
  ];
  for (const [change, error] of [
    [
      (x) => {
        x.sources = [];
      },
      /transfer_ready_source_missing/u,
    ],
    [
      (x) => {
        x.derivatives = [];
      },
      /transfer_approved_outputs_missing/u,
    ],
    [
      (x) => {
        x.generations[0].retiredAt = "now";
      },
      /transfer_approved_generation_invalid/u,
    ],
    [
      (x) => {
        x.jobs[0].status = "PROCESSING";
      },
      /transfer_jobs_not_drained/u,
    ],
    [
      (x) => {
        x.cleanup = [{}];
      },
      /transfer_cleanup_not_drained/u,
    ],
    [
      (x) => {
        x.media[0].storage = "local";
      },
      /transfer_media_storage_scope/u,
    ],
    [
      (x) => {
        x.media[0].status = "PENDING";
      },
      /transfer_unfinished_uploads/u,
    ],
  ]) {
    const x = database();
    change(x);
    assert.throws(() => deliveryFacts(x, "media", inventory), error);
  }
  assert.throws(
    () => deliveryFacts(database(), "media", inventory.slice(0, 1)),
    /transfer_required_object_missing_or_wrong_size/u,
  );
});

test("listing handles empty pages and rejects token cycles, duplicates and oversized objects", async () => {
  let page = 0;
  assert.equal(
    (
      await listObjects(
        async () =>
          ++page === 1
            ? { IsTruncated: true, NextContinuationToken: "next" }
            : { Contents: [] },
        "media",
      )
    ).length,
    0,
  );
  await assert.rejects(
    listObjects(
      async () => ({ IsTruncated: true, NextContinuationToken: "same" }),
      "media",
    ),
    /transfer_pagination_invalid/u,
  );
  await assert.rejects(
    listObjects(
      async () => ({
        Contents: [
          { Key: "same", Size: 1, ETag: "a" },
          { Key: "same", Size: 1, ETag: "a" },
        ],
      }),
      "media",
    ),
    /transfer_duplicate_key/u,
  );
  await assert.rejects(
    listObjects(
      async () => ({
        Contents: [{ Key: "large", Size: 33 * 1024 * 1024, ETag: "a" }],
      }),
      "media",
    ),
    /transfer_object_size_bound/u,
  );
});
