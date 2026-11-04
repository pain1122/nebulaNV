import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import console from "node:console";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import {
  readPreparedSettings,
  prepareSettings,
  scopedMediaEnvironment,
  repository,
  safeFailure,
  storageDirectory,
  storageSdk,
} from "./seaweed-setup.mjs";
import { readSupplyManifest } from "./seaweed-vendor-evidence.mjs";

const maxObjects = 5000;
const maxObjectBytes = 32 * 1024 * 1024;
const maxTotalBytes = 512 * 1024 * 1024;
const fields = [
  "ContentType",
  "CacheControl",
  "ContentDisposition",
  "ContentEncoding",
  "ContentLanguage",
  "Expires",
  "WebsiteRedirectLocation",
];
const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
export const fingerprint = (value) => digest(canonical(value));

export function objectMetadata(object) {
  return {
    ...Object.fromEntries(
      fields
        .filter((field) => object[field] != null)
        .map((field) => [
          field,
          object[field] instanceof Date
            ? object[field].toISOString()
            : object[field],
        ]),
    ),
    Metadata: object.Metadata ?? {},
  };
}

export async function listObjects(request, bucket) {
  const objects = [];
  let token;
  const seen = new Set();
  const tokens = new Set();
  do {
    const result = await request("ListObjectsV2", {
      Bucket: bucket,
      ContinuationToken: token,
    });
    for (const row of result.Contents ?? []) {
      assert.ok(
        typeof row.Key === "string" && row.Key.length > 0,
        "transfer_key_invalid",
      );
      assert.ok(
        Number.isSafeInteger(row.Size) &&
          row.Size >= 0 &&
          row.Size <= maxObjectBytes,
        "transfer_object_size_bound",
      );
      assert.ok(!seen.has(row.Key), "transfer_duplicate_key");
      assert.ok(
        typeof row.ETag === "string" && row.ETag.length > 0,
        "transfer_etag_missing",
      );
      seen.add(row.Key);
      objects.push({ Key: row.Key, Size: row.Size, ETag: row.ETag });
      assert.ok(objects.length <= maxObjects, "transfer_object_count_bound");
    }
    const next = result.IsTruncated ? result.NextContinuationToken : undefined;
    assert.ok(
      !result.IsTruncated || (next && !tokens.has(next)),
      "transfer_pagination_invalid",
    );
    if (next) tokens.add(next);
    assert.ok(tokens.size <= maxObjects, "transfer_page_count_bound");
    token = next;
  } while (token);
  assert.ok(
    objects.reduce((sum, row) => sum + row.Size, 0) <= maxTotalBytes,
    "transfer_total_size_bound",
  );
  return objects.sort((a, b) => a.Key.localeCompare(b.Key));
}

export function deliveryFacts(database, bucket, inventory) {
  const keys = new Map(inventory.map((row) => [row.Key, row]));
  assert.equal(database.cleanup.length, 0, "transfer_cleanup_not_drained");
  for (const row of [...database.jobs, ...database.generations])
    assert.ok(
      !["QUEUED", "PROCESSING"].includes(row.status),
      "transfer_jobs_not_drained",
    );
  for (const row of database.media) {
    assert.ok(
      row.storage === "s3" && row.bucket === bucket,
      "transfer_media_storage_scope",
    );
    assert.notEqual(row.status, "PENDING", "transfer_unfinished_uploads");
  }
  const ready = database.media.filter((row) => row.status === "READY");
  const facts = [];
  for (const row of ready) {
    assert.equal(row.scanStatus, "CLEAN", "transfer_ready_scan_invalid");
    const source = database.sources.find((item) => item.mediaId === row.id);
    assert.ok(source, "transfer_ready_source_missing");
    facts.push(source);
    const state = database.states.find((item) => item.mediaId === row.id);
    if (state?.approvedGenerationId) {
      const generation = database.generations.find(
        (item) =>
          item.id === state.approvedGenerationId && item.mediaId === row.id,
      );
      assert.ok(
        generation?.status === "COMPLETED" && !generation.retiredAt,
        "transfer_approved_generation_invalid",
      );
      const outputs = database.derivatives.filter(
        (item) =>
          item.mediaId === row.id && item.generationId === generation.id,
      );
      assert.ok(outputs.length > 0, "transfer_approved_outputs_missing");
      facts.push(...outputs);
    }
  }
  for (const row of facts) {
    assert.equal(row.bucket, bucket, "transfer_reference_bucket_mismatch");
    assert.match(
      row.sha256,
      /^[a-f0-9]{64}$/u,
      "transfer_reference_hash_invalid",
    );
    assert.equal(
      keys.get(row.path)?.Size,
      row.sizeBytes,
      "transfer_required_object_missing_or_wrong_size",
    );
  }
  return facts;
}

async function readObject(request, bucket, item) {
  const object = await request("GetObject", {
    Bucket: bucket,
    Key: item.Key,
    IfMatch: item.ETag,
  });
  const body = object.Body;
  const deadline = setTimeout(
    () => body?.destroy?.(new Error("transfer_body_timeout")),
    10000,
  );
  try {
    assert.equal(object.ContentLength, item.Size, "transfer_get_size_mismatch");
    assert.ok(
      body && typeof body[Symbol.asyncIterator] === "function",
      "transfer_body_invalid",
    );
    const chunks = [];
    let size = 0;
    for await (const chunk of body) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      assert.ok(
        size <= item.Size && size <= maxObjectBytes,
        "transfer_read_size_bound",
      );
      chunks.push(bytes);
    }
    assert.equal(size, item.Size, "transfer_read_truncated");
    const bytes = Buffer.concat(chunks, size);
    return { bytes, sha256: digest(bytes), metadata: objectMetadata(object) };
  } finally {
    clearTimeout(deadline);
    body?.destroy?.();
  }
}

export async function transferObjects({
  source,
  target,
  bucket,
  inventory,
  references,
  copy = false,
}) {
  const targetInventory = new Map(
    (await listObjects(target, bucket)).map((item) => [item.Key, item]),
  );
  const expected = new Map(references.map((row) => [row.path, row.sha256]));
  for (const row of references)
    assert.equal(
      row.sha256,
      expected.get(row.path),
      "transfer_reference_hash_conflict",
    );
  const receipts = [];
  for (const item of inventory) {
    const original = await readObject(source, bucket, item);
    if (expected.has(item.Key))
      assert.equal(
        original.sha256,
        expected.get(item.Key),
        "transfer_source_checksum_mismatch",
      );
    let existing = targetInventory.get(item.Key);
    if (!existing) {
      assert.ok(copy, "transfer_destination_object_missing");
      await target("PutObject", {
        Bucket: bucket,
        Key: item.Key,
        Body: original.bytes,
        ContentLength: item.Size,
        IfNoneMatch: "*",
        ...original.metadata,
        ...(original.metadata.Expires
          ? { Expires: new Date(original.metadata.Expires) }
          : {}),
      });
      const head = await target("HeadObject", {
        Bucket: bucket,
        Key: item.Key,
      });
      existing = { ...item, ETag: head.ETag };
    }
    const received = await readObject(target, bucket, existing);
    assert.ok(
      received.sha256 === original.sha256 &&
        fingerprint(received.metadata) === fingerprint(original.metadata),
      "transfer_destination_conflict",
    );
    receipts.push({
      key: item.Key,
      bytes: item.Size,
      sha256: original.sha256,
      metadataSha256: fingerprint(original.metadata),
    });
  }
  assert.equal(
    fingerprint(await listObjects(source, bucket)),
    fingerprint(inventory),
    "transfer_source_inventory_drift",
  );
  return receipts;
}

const docker = (args, input) =>
  execFileSync("docker", args, {
    cwd: repository,
    input,
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
const inspect = (name) => JSON.parse(docker(["inspect", name]))[0];
const envObject = (container) =>
  Object.fromEntries(
    container.Config.Env.map((entry) => {
      const split = entry.indexOf("=");
      return [entry.slice(0, split), entry.slice(split + 1)];
    }),
  );

function snapshot() {
  // This is a Media-owner migration operation, never a runtime cross-service read.
  const tables = {
    media: ["Media", "id"],
    sources: ["MediaVerifiedSource", "mediaId"],
    derivatives: ["MediaDerivative", "id"],
    states: ["MediaDerivativeState", "mediaId"],
    jobs: ["MediaProcessingJob", "id"],
    generations: ["MediaDerivativeGeneration", "id"],
    cleanup: ["MediaObjectCleanup", "id"],
  };
  const entries = Object.entries(tables).map(
    ([key, [table, order]]) =>
      `'${key}', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t."${order}") FROM "${table}" t), '[]'::jsonb)`,
  );
  const sql = `BEGIN READ ONLY; SELECT jsonb_build_object(${entries.join(",")})::text; ROLLBACK;`;
  const output = docker(
    [
      "exec",
      "-i",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "nebula_media",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-f",
      "-",
    ],
    sql,
  );
  const database = JSON.parse(
    output.split(/\r?\n/u).find((line) => line.startsWith("{")),
  );
  const journalDir = path.join(repository, ".nebula-demo");
  const journals = existsSync(journalDir)
    ? Object.fromEntries(
        readdirSync(journalDir)
          .filter((name) => name.endsWith(".json"))
          .sort()
          .map((name) => {
            const raw = readFileSync(path.join(journalDir, name));
            const value = JSON.parse(raw);
            for (const entry of Object.values(value.media ?? {}))
              assert.ok(
                database.media.some((row) => row.id === entry.id),
                "transfer_journal_media_missing",
              );
            return [name, digest(raw)];
          }),
      )
    : {};
  assert.ok(
    !existsSync(journalDir) ||
      !readdirSync(journalDir).some((name) => name.endsWith(".lock")),
    "transfer_demo_run_active",
  );
  return { database, hash: fingerprint(database), journals };
}

function context(reverse) {
  const settings = readPreparedSettings();
  assert.equal(
    settings.MEDIA_S3_BUCKET,
    "media",
    "transfer_only_existing_media_bucket",
  );
  const minio = inspect("minio");
  assert.equal(
    minio.Config.Labels["com.docker.compose.project"],
    "nebulanv-main",
    "transfer_source_project_mismatch",
  );
  assert.equal(
    minio.Config.Labels["com.docker.compose.service"],
    "minio",
    "transfer_source_service_mismatch",
  );
  const env = envObject(minio);
  assert.ok(
    env.MINIO_ROOT_USER && env.MINIO_ROOT_PASSWORD,
    "transfer_source_credentials_missing",
  );
  const vendor = readSupplyManifest();
  const accepted = JSON.parse(
    readFileSync(
      path.join(repository, ".ci-evidence/seaweed-vendor.json"),
      "utf8",
    ),
  );
  assert.equal(
    accepted.canonicalConfigId,
    vendor.imageConfigId,
    "transfer_vendor_receipt_mismatch",
  );
  const seaweedContainer = inspect("nebulanv-main-seaweed-1");
  assert.equal(
    seaweedContainer.Config.Labels["com.docker.compose.project"],
    "nebulanv-main",
    "transfer_destination_project_mismatch",
  );
  assert.equal(
    seaweedContainer.Config.Labels["com.docker.compose.service"],
    "seaweed",
    "transfer_destination_service_mismatch",
  );
  assert.equal(
    seaweedContainer.Image,
    accepted.loadedStoreId,
    "transfer_destination_image_mismatch",
  );
  assert.equal(
    seaweedContainer.State.Health?.Status,
    "healthy",
    "transfer_destination_unhealthy",
  );
  const media = inspect("media-service");
  const mediaEnv = envObject(media);
  assert.equal(
    mediaEnv.MEDIA_S3_INTERNAL_ENDPOINT,
    reverse ? "http://seaweed:8333" : "http://minio:9000",
    "transfer_active_provider_mismatch",
  );
  assert.equal(
    mediaEnv.MEDIA_S3_BUCKET,
    settings.MEDIA_S3_BUCKET,
    "transfer_active_bucket_mismatch",
  );
  const require = createRequire(
    path.join(repository, "apps/media-service/package.json"),
  );
  const sdk = require("@aws-sdk/client-s3");
  const client = new sdk.S3Client({
    endpoint: "http://127.0.0.1:9000",
    region: "us-east-1",
    forcePathStyle: true,
    maxAttempts: 1,
    credentials: {
      accessKeyId: env.MINIO_ROOT_USER,
      secretAccessKey: env.MINIO_ROOT_PASSWORD,
    },
  });
  const oldStore = (operation, input) =>
    client.send(new sdk[`${operation}Command`](input), {
      abortSignal: globalThis.AbortSignal.timeout(10000),
    });
  const seaweed = storageSdk(settings);
  const newStore = (operation, input) =>
    seaweed.request("media", operation, input);
  return {
    bucket: settings.MEDIA_S3_BUCKET,
    topology: {
      minioImage: minio.Image,
      seaweedImage: seaweedContainer.Image,
      settingsSha256: fingerprint(settings),
      sourceCredentialsSha256: fingerprint([
        env.MINIO_ROOT_USER,
        env.MINIO_ROOT_PASSWORD,
      ]),
    },
    source: reverse ? newStore : oldStore,
    target: reverse ? oldStore : newStore,
    close: () => {
      client.destroy();
      seaweed.close();
    },
  };
}

function requireStoppedWriters() {
  for (const name of ["gateway", "media-service"]) {
    const container = inspect(name);
    assert.equal(
      container.Config.Labels["com.docker.compose.project"],
      "nebulanv-main",
      "transfer_writer_project_mismatch",
    );
    assert.equal(
      container.Config.Labels["com.docker.compose.service"],
      name,
      "transfer_writer_service_mismatch",
    );
    assert.equal(
      container.State.Running,
      false,
      "transfer_stop_gateway_and_media_first",
    );
  }
}

function save(file, value) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  renameSync(temporary, file);
}

export const activeComposeFiles = [
  "docker-compose.yml",
  "docker/seaweedfs/compose.storage.yml",
  "docker/seaweedfs/compose.bootstrap.yml",
  ".github/seaweed-runtime.yml",
];

export function activationEnvText(text, values) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/u);
  for (const [key, value] of Object.entries(values)) {
    assert.match(key, /^[A-Z][A-Z0-9_]*$/u);
    assert.equal(typeof value, "string");
    assert.ok(
      !/[\r\n\0]/u.test(value),
      "transfer_activation_env_control_character",
    );
    const matches = lines.flatMap((line, index) =>
      new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line) ? [index] : [],
    );
    assert.ok(
      matches.length <= 1,
      "transfer_activation_duplicate_env_assignment",
    );
    const assignment = `${key}=${JSON.stringify(value)}`;
    if (matches.length) lines[matches[0]] = assignment;
    else lines.push(assignment);
  }
  return lines.join(newline).replace(/(?:\r?\n)*$/u, "") + newline;
}

export function writeActivationFiles(
  descriptors,
  receiptFile,
  { restore = false } = {},
) {
  let receipt;
  if (existsSync(receiptFile))
    receipt = JSON.parse(readFileSync(receiptFile, "utf8"));
  else {
    assert.ok(!restore, "transfer_activation_backup_missing");
    const files = descriptors.map(({ file, backup, values }) => {
      assert.ok(
        !lstatSync(file).isSymbolicLink(),
        "transfer_activation_file_symlink",
      );
      const before = readFileSync(file, "utf8");
      const after = activationEnvText(before, values);
      if (existsSync(backup))
        assert.equal(
          digest(readFileSync(backup)),
          digest(before),
          "transfer_activation_backup_conflict",
        );
      else writeFileSync(backup, before, { flag: "wx", mode: 0o600 });
      return {
        file,
        backup,
        beforeSha256: digest(before),
        afterSha256: digest(after),
      };
    });
    receipt = { schemaVersion: 1, phase: "prepared", files };
    save(receiptFile, receipt);
  }
  assert.equal(receipt.schemaVersion, 1, "transfer_activation_receipt_schema");
  assert.equal(
    receipt.files.length,
    descriptors.length,
    "transfer_activation_file_inventory",
  );
  const updates = descriptors.map(({ file, backup, values }, index) => {
    const recorded = receipt.files[index];
    assert.equal(recorded.file, file, "transfer_activation_file_inventory");
    assert.equal(recorded.backup, backup, "transfer_activation_file_inventory");
    assert.ok(
      !lstatSync(file).isSymbolicLink() && !lstatSync(backup).isSymbolicLink(),
      "transfer_activation_file_symlink",
    );
    const before = readFileSync(backup, "utf8");
    assert.equal(
      digest(before),
      recorded.beforeSha256,
      "transfer_activation_backup_drift",
    );
    const after = activationEnvText(before, values);
    assert.equal(
      digest(after),
      recorded.afterSha256,
      "transfer_activation_settings_drift",
    );
    const current = digest(readFileSync(file));
    assert.ok(
      [recorded.beforeSha256, recorded.afterSha256].includes(current),
      "transfer_activation_file_drift",
    );
    return { file, contents: restore ? before : after };
  });
  for (const { file, contents } of updates) {
    const temporary = path.join(
      path.dirname(receiptFile),
      "activation-env.tmp",
    );
    writeFileSync(temporary, contents, { mode: 0o600 });
    renameSync(temporary, file);
  }
  save(receiptFile, { ...receipt, phase: restore ? "restored" : "configured" });
}

export function activationValues(settings) {
  return {
    root: {
      SEAWEED_HOST_PORT: settings.SEAWEED_HOST_PORT,
      SEAWEED_CORS_ORIGINS: settings.SEAWEED_CORS_ORIGINS,
      COMPOSE_PATH_SEPARATOR: "|",
      COMPOSE_FILE: activeComposeFiles.join("|"),
    },
    native: scopedMediaEnvironment(settings, { native: true }),
  };
}

function configureActivation(restore) {
  requireStoppedWriters();
  for (const key of [
    "COMPOSE_FILE",
    "COMPOSE_PATH_SEPARATOR",
    "COMPOSE_ENV_FILES",
    "COMPOSE_DISABLE_ENV_FILE",
  ])
    assert.ok(
      !process.env[key],
      "transfer_clear_shell_compose_overrides_first",
    );
  const settings = prepareSettings({ env: {} }).settings;
  const receipt = JSON.parse(
    readFileSync(
      path.join(
        storageDirectory,
        restore ? "rollback-transfer.json" : "transfer.json",
      ),
      "utf8",
    ),
  );
  assert.equal(receipt.phase, "verified", "transfer_verified_receipt_required");
  assert.equal(
    receipt.direction,
    restore ? "seaweed-to-minio" : "minio-to-seaweed",
    "transfer_receipt_direction",
  );
  assert.equal(
    receipt.bucket,
    settings.MEDIA_S3_BUCKET,
    "transfer_receipt_bucket",
  );
  assert.equal(
    receipt.objects.length,
    receipt.inventory.length,
    "transfer_receipt_object_count",
  );
  assert.equal(
    fingerprint(settings),
    receipt.topology.settingsSha256,
    "transfer_activation_settings_drift",
  );
  const current = snapshot();
  assert.equal(
    current.hash,
    receipt.databaseSha256,
    "transfer_activation_database_drift",
  );
  assert.equal(
    fingerprint(current.journals),
    fingerprint(receipt.journals),
    "transfer_activation_journal_drift",
  );
  const seaweed = inspect("nebulanv-main-seaweed-1");
  assert.equal(
    seaweed.Image,
    receipt.topology.seaweedImage,
    "transfer_activation_image_drift",
  );
  assert.equal(seaweed.State.Running, true, "transfer_destination_stopped");
  assert.equal(
    seaweed.State.Health?.Status,
    "healthy",
    "transfer_destination_unhealthy",
  );
  const minio = inspect("minio");
  assert.equal(
    minio.Image,
    receipt.topology.minioImage,
    "transfer_activation_source_image_drift",
  );
  if (!restore)
    assert.equal(minio.State.Running, false, "transfer_stop_minio_after_copy");
  const values = activationValues(settings);
  const root = path.join(repository, ".env");
  const original = parseEnv(readFileSync(root, "utf8"));
  assert.ok(
    !original.COMPOSE_ENV_FILES &&
      !["true", "1"].includes(original.COMPOSE_DISABLE_ENV_FILE),
    "transfer_root_compose_env_override",
  );
  assert.ok(
    !original.COMPOSE_FILE ||
      original.COMPOSE_FILE === activeComposeFiles.join("|"),
    "transfer_existing_custom_compose_selection",
  );
  const descriptors = [
    {
      file: root,
      backup: path.join(storageDirectory, "root.env.before-seaweed"),
      values: values.root,
    },
    {
      file: path.join(repository, "apps/media-service/.env"),
      backup: path.join(storageDirectory, "media.env.before-seaweed"),
      values: values.native,
    },
  ];
  writeActivationFiles(
    descriptors,
    path.join(storageDirectory, "activation.json"),
    { restore },
  );
  console.log(
    `[seaweed-transfer] ${restore ? "original" : "seaweed"}-config-prepared-private-backups-retained=ok; containers unchanged`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let io;
  let lock;
  let lockFile;
  try {
    const args = process.argv.slice(2);
    const [command] = args;
    const reverse = args[1] === "--reverse";
    if (["activate-config", "restore-config"].includes(command)) {
      assert.equal(args.length, 1, "transfer_config_unexpected_argument");
      configureActivation(command === "restore-config");
    } else {
      assert.ok(
        ["plan", "copy", "verify"].includes(command) &&
          args.length === (reverse ? 2 : 1),
        "usage_transfer_plan_copy_verify_optional_reverse",
      );
      const file = path.join(
        storageDirectory,
        reverse ? "rollback-transfer.json" : "transfer.json",
      );
      io = context(reverse);
      lockFile = `${file}.lock`;
      lock = openSync(lockFile, "wx", 0o600);
      if (command !== "plan") requireStoppedWriters();
      const current = snapshot();
      const inventory = await listObjects(io.source, io.bucket);
      const references = deliveryFacts(current.database, io.bucket, inventory);
      const identity = {
        schemaVersion: 1,
        direction: reverse ? "seaweed-to-minio" : "minio-to-seaweed",
        bucket: io.bucket,
        topology: io.topology,
        databaseSha256: current.hash,
        journals: current.journals,
        inventory,
      };
      if (command === "plan") {
        if (existsSync(file)) {
          const existing = JSON.parse(readFileSync(file, "utf8"));
          for (const [key, value] of Object.entries(identity))
            assert.equal(
              fingerprint(existing[key]),
              fingerprint(value),
              "transfer_existing_plan_drift_review_before_replanning",
            );
        } else save(file, { ...identity, phase: "planned" });
        console.log(
          `[seaweed-transfer] planned objects=${inventory.length} bytes=${inventory.reduce((sum, item) => sum + item.Size, 0)} required=${references.length}; stop Gateway/Media before copy`,
        );
      } else {
        const plan = JSON.parse(readFileSync(file, "utf8"));
        for (const [key, value] of Object.entries(identity))
          assert.equal(
            fingerprint(plan[key]),
            fingerprint(value),
            "transfer_plan_drift",
          );
        const receipts = await transferObjects({
          ...io,
          inventory,
          references,
          copy: command === "copy",
        });
        // Independently read both providers a second time before admitting cutover.
        const verified = await transferObjects({
          ...io,
          inventory,
          references,
        });
        assert.equal(
          fingerprint(receipts),
          fingerprint(verified),
          "transfer_metadata_or_bytes_changed",
        );
        const after = snapshot();
        assert.equal(after.hash, current.hash, "transfer_database_drift");
        assert.equal(
          fingerprint(after.journals),
          fingerprint(current.journals),
          "transfer_journal_drift",
        );
        requireStoppedWriters();
        save(file, { ...identity, phase: "verified", objects: verified });
        console.log(
          `[seaweed-transfer] ${identity.direction} bytes-metadata-approved-checksums-database-journals=ok objects=${verified.length}; writers remain stopped`,
        );
      }
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "seaweed_transfer_failed",
        causes: safeFailure(error),
        next: "keep both stores and journal; do not activate or overwrite conflicts",
      }),
    );
    process.exitCode = 1;
  } finally {
    io?.close();
    if (lock !== undefined) {
      closeSync(lock);
      unlinkSync(lockFile);
    }
  }
}
