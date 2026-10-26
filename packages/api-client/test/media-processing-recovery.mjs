import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const docker = process.platform === "win32" ? "docker.exe" : "docker";
function compose(args, input) {
  return execFileSync(
    docker,
    [
      "compose",
      "--project-directory",
      root,
      "--file",
      path.join(root, "docker-compose.yml"),
      ...args,
    ],
    {
      cwd: root,
      input,
      encoding: "utf8",
      timeout: 240_000,
      maxBuffer: 1024 * 1024,
    },
  );
}
function fixtureId(id) {
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  return id;
}
function sql(input) {
  return compose(
    [
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "nebula_media",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    input,
  ).trim();
}
const runtimeTools = {
  compose,
  config() {
    return JSON.parse(
      compose([
        "exec",
        "-T",
        "media-service",
        "node",
        "-e",
        'console.log(JSON.stringify({enabled:process.env.MEDIA_PROCESSING_ENABLED!=="false",pollMs:Number(process.env.MEDIA_PROCESSING_POLL_MS||2000),maxAttempts:Number(process.env.MEDIA_PROCESSING_MAX_ATTEMPTS||5)}))',
      ]),
    );
  },
  job(id) {
    fixtureId(id);
    return JSON.parse(
      sql(`SELECT json_build_object(
      'status', j."status", 'attempts', j."attempts", 'leaseToken', j."leaseToken",
      'sourceCount', (SELECT count(*) FROM "MediaVerifiedSource" s WHERE s."mediaId" = m."id"))
      FROM "MediaProcessingJob" j JOIN "Media" m ON m."id" = j."mediaId"
      WHERE m."id" = '${id}'::uuid AND m."filename" LIKE 'media-processing-%';`),
    );
  },
  expire(id, token) {
    fixtureId(id);
    fixtureId(token);
    sql(`BEGIN;
      DO $$ BEGIN
        UPDATE "MediaProcessingJob" j SET "status"='PROCESSING', "attempts"=1,
          "leaseToken"='${token}'::uuid, "leaseUntil"=CURRENT_TIMESTAMP-interval '1 second'
        FROM "Media" m WHERE m."id"=j."mediaId" AND m."id"='${id}'::uuid
          AND m."filename" LIKE 'media-processing-%' AND m."status"='PENDING'
          AND j."status"='QUEUED' AND j."attempts"=0;
        IF NOT FOUND THEN RAISE EXCEPTION 'recovery_fixture_not_queued'; END IF;
        UPDATE "Media" SET "scanStatus"='SCANNING' WHERE "id"='${id}'::uuid;
      END $$;
      COMMIT;`);
  },
  removeSource(id) {
    fixtureId(id);
    // The existing Media runtime owns storage credentials; never export them.
    compose([
      "exec",
      "-T",
      "media-service",
      "node",
      "-e",
      `
      const {PrismaClient}=require('./prisma/generated');
      const {S3Client,DeleteObjectCommand}=require('@aws-sdk/client-s3');
      const p=new PrismaClient(); let s;
      (async()=>{try {
        const m=await p.media.findUniqueOrThrow({where:{id:process.argv[1]}});
        if(m.status!=='PENDING'||!m.filename.startsWith('media-processing-'))
          throw new Error('missing_source_fixture_not_pending');
        s=new S3Client({endpoint:process.env.MEDIA_S3_INTERNAL_ENDPOINT||process.env.MEDIA_S3_ENDPOINT,
          region:process.env.MEDIA_S3_REGION||'us-east-1',
          forcePathStyle:process.env.MEDIA_S3_FORCE_PATH_STYLE!=='false',maxAttempts:1,
          credentials:{accessKeyId:process.env.MEDIA_S3_ACCESS_KEY,secretAccessKey:process.env.MEDIA_S3_SECRET_KEY}});
        await s.send(new DeleteObjectCommand({Bucket:m.bucket,Key:m.path}),
          {abortSignal:AbortSignal.timeout(20000)});
      }finally{s?.destroy();await p.$disconnect();}})().catch(()=>{
        console.error('recovery_fixture_source_removal_failed');process.exitCode=1;
      });`,
      id,
    ]);
  },
  wait: delay,
};

export async function runMediaRecovery({
  approvedId,
  approvedBytes,
  upload,
  waitTerminal,
  render,
  readiness,
  tools = runtimeTools,
  emit = (message) => process.stdout.write(`${message}\n`),
}) {
  const config = tools.config();
  assert.equal(config.enabled, true, "recovery_requires_enabled_worker");
  assert.ok(
    config.maxAttempts >= 2,
    "recovery_requires_two_available_attempts",
  );
  assert.ok(
    Number.isInteger(config.pollMs) &&
      config.pollMs >= 100 &&
      config.pollMs <= 60_000,
  );
  let restoreScanner = false;
  let restoreMedia = false;
  let failure;
  const restorationErrors = [];
  const start = (service) =>
    tools.compose([
      "up",
      "-d",
      "--no-build",
      "--wait",
      "--wait-timeout",
      "180",
      "--no-deps",
      service,
    ]);
  async function assertApprovedDelivery() {
    assert.equal(await readiness(), 200, "recovery_gateway_not_ready");
    const response = await render(approvedId);
    assert.equal(response.ok, true);
    assert.deepEqual(Buffer.from(response.data), approvedBytes);
  }
  try {
    // Mark restoration before stopping: even a partially failed stop must heal.
    restoreScanner = true;
    tools.compose(["stop", "media-scanner"]);
    await assertApprovedDelivery();
    const pending = await upload(approvedBytes, "recovery.png");
    const missing = await upload(approvedBytes, "missing.png");
    await tools.wait(config.pollMs * 2 + 500);
    for (const id of [pending.media.id, missing.media.id]) {
      const job = tools.job(id);
      assert.equal(job.status, "QUEUED");
      assert.equal(job.attempts, 0);
      assert.equal(job.sourceCount, 0);
      assert.equal((await render(id)).status, 403);
    }
    emit(
      "[media-recovery-live] scanner-outage-pauses-attempts-keeps-approved-render=ok",
    );
    tools.removeSource(missing.media.id);

    restoreMedia = true;
    tools.compose(["stop", "media-service"]);
    // An explicit abandoned-lease fixture; no claimed in-flight crash is faked.
    tools.expire(pending.media.id, randomUUID());
    start("media-service");
    restoreMedia = false;
    await waitForApprovedDeliveryAfterRestart({
      approvedId,
      approvedBytes,
      readiness,
      render,
      wait: tools.wait,
    });
    const paused = tools.job(pending.media.id);
    assert.equal(paused.status, "PROCESSING");
    assert.equal(paused.attempts, 1);
    start("media-scanner");
    restoreScanner = false;

    const recovered = await waitTerminal(pending.media.id, {
      afterRestart: true,
    });
    assert.deepEqual(
      [recovered.status, recovered.scanStatus],
      ["READY", "CLEAN"],
    );
    const completed = tools.job(pending.media.id);
    assert.equal(completed.status, "COMPLETED");
    assert.equal(completed.attempts, 2);
    assert.equal(completed.leaseToken, null);
    assert.equal(completed.sourceCount, 1);
    const recoveredRender = await readAfterMediaRestart(
      (signal) => render(pending.media.id, signal),
      { wait: tools.wait },
    );
    assert.equal(recoveredRender.ok, true);
    assert.deepEqual(Buffer.from(recoveredRender.data), approvedBytes);
    emit(
      "[media-recovery-live] expired-lease-fixture-recovered-after-worker-restart=ok",
    );

    const blocked = await waitTerminal(missing.media.id, {
      afterRestart: true,
    });
    assert.deepEqual(
      [blocked.status, blocked.scanStatus, blocked.quarantineReason],
      ["BLOCKED", "FAILED", "upload_missing"],
    );
    const blockedRender = await readAfterMediaRestart(
      (signal) => render(missing.media.id, signal),
      { wait: tools.wait },
    );
    assert.equal(blockedRender.status, 403);
    assert.equal(tools.job(missing.media.id).sourceCount, 0);
    emit("[media-recovery-live] missing-source-denied=ok");
  } catch (error) {
    failure = error;
  } finally {
    for (const service of [
      ...(restoreMedia ? ["media-service"] : []),
      ...(restoreScanner ? ["media-scanner"] : []),
    ]) {
      try {
        start(service);
      } catch (error) {
        restorationErrors.push(error);
      }
    }
  }
  if (failure || restorationErrors.length) {
    throw new AggregateError(
      [...(failure ? [failure] : []), ...restorationErrors],
      "media_recovery_or_restoration_failed",
    );
  }
}

export async function waitForApprovedDeliveryAfterRestart({
  approvedId,
  approvedBytes,
  readiness,
  render,
  wait = delay,
}) {
  await readAfterMediaRestart(
    async (signal) => {
      const status = await readiness(signal);
      if (status === 503) return { status };
      assert.equal(status, 200, "recovery_gateway_not_ready");
      const response = await render(approvedId, signal);
      if (response.status !== 503) {
        assert.equal(response.ok, true);
        assert.deepEqual(Buffer.from(response.data), approvedBytes);
      }
      return response;
    },
    { wait },
  );
}

export async function readAfterMediaRestart(
  read,
  { wait = delay, deadline = Date.now() + 60_000 } = {},
) {
  const transportCodes = new Set([
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EPIPE",
  ]);
  let lastFailure;
  for (let attempt = 0; attempt < 6 && Date.now() < deadline; attempt++) {
    const signal = globalThis.AbortSignal.timeout(
      Math.min(10_000, Math.max(1, deadline - Date.now())),
    );
    try {
      const response = await read(signal);
      if (response.status !== 503) return response;
      lastFailure = new Error("recovery_gateway_http_503");
    } catch (error) {
      if (
        error.name !== "TimeoutError" &&
        !(error instanceof TypeError && transportCodes.has(error.cause?.code))
      )
        throw error;
      lastFailure = error;
    }
    if (attempt < 5 && Date.now() < deadline)
      await wait(Math.min(1000, deadline - Date.now()));
  }
  throw new Error("recovery_gateway_reconnect_exhausted", {
    cause: lastFailure,
  });
}
