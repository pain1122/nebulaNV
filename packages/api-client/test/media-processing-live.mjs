import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createGatewayClient } from "../dist/index.js";
import { demoPng } from "../../../scripts/demo/png.mjs";
import {
  readAfterMediaRestart,
  runMediaRecovery,
} from "./media-processing-recovery.mjs";
import { runImageDerivatives } from "./media-derivatives-live.mjs";
import { runMediaMetadata } from "./media-metadata-live.mjs";

const baseUrl =
  process.env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002";
const target = new URL(baseUrl);
const recoveryMode = process.argv.includes("--recovery");
const derivativesMode = process.argv.includes("--derivatives");
const metadataMode = process.argv.includes("--metadata");
if (
  process.env.NODE_ENV === "production" ||
  !["localhost", "127.0.0.1"].includes(target.hostname)
)
  throw new Error(
    "media_processing_proof_requires_local_nonproduction_gateway",
  );
if (
  recoveryMode &&
  (target.port !== "3002" || !["", "/"].includes(target.pathname))
)
  throw new Error(
    "media_recovery_requires_local_development_gateway_port_3002",
  );
const admin = createGatewayClient({
  baseUrl,
  publicClientId: "admin-web-local",
  applicationOrigin: "http://localhost:3000",
});
const storefront = createGatewayClient({
  baseUrl,
  publicClientId: "storefront-web-local",
  applicationOrigin: "http://localhost:3008",
});
function success(label, result) {
  if (!result.ok)
    throw new Error(
      `${label}_http_${result.status}_${JSON.stringify(result.error).slice(0, 300)}`,
    );
  return result.data.data;
}
const loginResult = await admin.request("auth_login", {
  body: {
    identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
  },
});
const { accessToken } = success("processing_login", loginResult);
const cookie = loginResult.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("processing_browser_cookie_missing");
const ids = [];
const cleanupFailures = [];
let proofError;

async function upload(bytes, suffix, mimeType = "image/png") {
  const filename = `media-processing-${randomUUID()}-${suffix}`;
  const presign = success(
    "processing_presign",
    await admin.request("admin_media_public_presign", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        filename,
        mimeType,
        folderPath: "/media-processing-proof",
        displayName: filename,
        scope: "panel",
      },
    }),
  );
  const result = await globalThis.fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "content-type": mimeType },
    body: bytes,
    signal: globalThis.AbortSignal.timeout(20_000),
  });
  assert.ok([200, 204].includes(result.status), "processing_put_failed");
  const media = success(
    "processing_finalize",
    await admin.request("admin_media_public_finalize", {
      accessToken,
      idempotencyKey: randomUUID(),
      body: {
        storage: presign.storage,
        bucket: presign.bucket,
        path: presign.path,
        filename: presign.filename,
        mimeType: presign.mimeType,
        folderPath: presign.folderPath,
        displayName: presign.displayName,
        originalFilename: presign.originalFilename,
        scope: presign.scope,
      },
    }),
  );
  ids.push(media.id);
  assert.equal(media.status, "PENDING");
  assert.equal(media.scanStatus, "QUEUED");
  return { media, presign };
}

async function waitTerminal(id, { afterRestart = false } = {}) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const read = (signal) =>
      admin.request("admin_media_get", { accessToken, path: { id }, signal });
    const media = success(
      "processing_get",
      afterRestart
        ? await readAfterMediaRestart(read, { deadline })
        : await read(
            globalThis.AbortSignal.timeout(
              Math.min(10_000, Math.max(1, deadline - Date.now())),
            ),
          ),
    );
    if (["READY", "BLOCKED"].includes(media.status)) return media;
    await delay(500);
  }
  throw new Error("media_processing_timeout_check_scanner_health");
}

try {
  const bytes = demoPng(0);
  const { media, presign } = await upload(bytes, "clean.png");
  const approved = await waitTerminal(media.id);
  assert.deepEqual(
    [approved.status, approved.scanStatus, approved.width, approved.height],
    ["READY", "CLEAN", 64, 64],
  );
  const render = await storefront.request("media_render", {
    path: { id: media.id },
    query: { variant: "web" },
  });
  assert.equal(render.ok, true);
  assert.deepEqual(Buffer.from(render.data), bytes);
  process.stdout.write(
    "[media-processing-live] scan-validate-promote-render=ok\n",
  );
  if (derivativesMode) {
    await runImageDerivatives({
      admin,
      storefront,
      accessToken,
      mediaId: media.id,
      sourceBytes: bytes,
      success,
    });
  }

  if (metadataMode) {
    await runMediaMetadata({
      admin,
      storefront,
      accessToken,
      mediaId: media.id,
      sourceBytes: bytes,
      success,
    });
  }

  if (recoveryMode) {
    await runMediaRecovery({
      approvedId: media.id,
      approvedBytes: bytes,
      upload,
      waitTerminal,
      render: (id, signal) =>
        storefront.request("media_render", {
          path: { id },
          signal,
          query: { variant: "web" },
        }),
      readiness: async (signal) =>
        (
          await globalThis.fetch(`${baseUrl}/health/ready`, {
            signal: signal ?? globalThis.AbortSignal.timeout(10_000),
          })
        ).status,
    });
  } else {
    const changed = await globalThis.fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: demoPng(1),
      signal: globalThis.AbortSignal.timeout(20_000),
    });
    assert.ok([200, 204].includes(changed.status));
    const stable = await storefront.request("media_render", {
      path: { id: media.id },
      query: { variant: "web" },
    });
    assert.equal(stable.ok, true);
    assert.deepEqual(Buffer.from(stable.data), bytes);
    process.stdout.write(
      "[media-processing-live] reused-upload-url-cannot-change-approved-bytes=ok\n",
    );

    const eicar = Buffer.from(
      [
        "X5O!P%@AP[4",
        String.fromCharCode(92),
        "PZX54(P^)7CC)7}",
        "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!",
        "$H+H*",
      ].join(""),
    );
    for (const scenario of [
      {
        name: "infected.png",
        bytes: eicar,
        scanStatus: "INFECTED",
        reason: "scanner_infected",
      },
      {
        name: "corrupt.png",
        bytes: bytes.subarray(0, 40),
        scanStatus: "FAILED",
        reason: "image_decode_failed",
      },
      {
        name: "wrong-type.webp",
        bytes,
        mimeType: "image/webp",
        scanStatus: "FAILED",
        reason: "image_mime_mismatch",
      },
      {
        name: "wrong-extension.jpg",
        bytes,
        scanStatus: "FAILED",
        reason: "image_extension_mismatch",
      },
    ]) {
      const invalid = await upload(
        scenario.bytes,
        scenario.name,
        scenario.mimeType,
      );
      const blocked = await waitTerminal(invalid.media.id);
      assert.deepEqual(
        [blocked.status, blocked.scanStatus, blocked.quarantineReason],
        ["BLOCKED", scenario.scanStatus, scenario.reason],
      );
      const denied = await storefront.request("media_render", {
        path: { id: invalid.media.id },
        query: { variant: "web" },
      });
      assert.equal(denied.status, 403);
      process.stdout.write(
        `[media-processing-live] ${scenario.name}-denied=ok\n`,
      );
    }
  }
} catch (error) {
  proofError = error;
} finally {
  for (const id of ids.reverse()) {
    try {
      const items = [{ type: "file", id }];
      const preview = success(
        "processing_delete_preview",
        await admin.request("admin_media_public_delete_preview", {
          accessToken,
          idempotencyKey: randomUUID(),
          body: { items, recursive: false, scope: "panel" },
        }),
      );
      success(
        "processing_delete_confirm",
        await admin.request("admin_media_public_delete_confirm", {
          accessToken,
          idempotencyKey: randomUUID(),
          body: {
            items,
            recursive: false,
            scope: "panel",
            confirmToken: preview.confirmToken,
          },
        }),
      );
    } catch (error) {
      cleanupFailures.push(error);
    }
  }
  try {
    success(
      "processing_logout",
      await admin.request("auth_logout", {
        accessToken,
        cookie,
        idempotencyKey: randomUUID(),
      }),
    );
  } catch (error) {
    cleanupFailures.push(error);
  }
}
if (proofError || cleanupFailures.length)
  throw new AggregateError(
    [...(proofError ? [proofError] : []), ...cleanupFailures],
    "media_processing_proof_failed",
  );
process.stdout.write("[media-processing-live] cleanup=ok\n");
