import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import {
  readAfterMediaRestart,
  runMediaRecovery,
  waitForApprovedDeliveryAfterRestart,
} from "./media-processing-recovery.mjs";

function harness({ stopFailure = false, restoreFailure = false } = {}) {
  const calls = [];
  let uploads = 0;
  const bytes = Buffer.from("approved test bytes");
  const options = {
    approvedId: "approved",
    approvedBytes: bytes,
    upload: async () => ({ media: { id: `fixture-${++uploads}` } }),
    waitTerminal: async () => {
      throw new Error("unexpected terminal wait");
    },
    render: async (id) =>
      id === "approved" ? { ok: true, data: bytes } : { status: 403 },
    readiness: async () => 200,
    emit() {},
    tools: {
      config: () => ({ enabled: true, pollMs: 2000, maxAttempts: 5 }),
      compose(args) {
        calls.push(args);
        if (stopFailure && args[0] === "stop")
          throw new Error("partial_stop_failed");
        if (
          restoreFailure &&
          args[0] === "up" &&
          args.at(-1) === "media-service"
        )
          throw new Error("media_restore_failed");
      },
      wait: async () => {},
      job: () => ({ status: "QUEUED", attempts: 0, sourceCount: 0 }),
      removeSource() {},
      expire() {
        throw new Error("fixture_abort");
      },
    },
  };
  return { options, calls };
}

test("recovery restores Media and scanner if fixture setup fails after stopping them", async () => {
  const { options, calls } = harness();
  await assert.rejects(runMediaRecovery(options), (error) => {
    assert.equal(error.errors[0].message, "fixture_abort");
    return true;
  });
  assert.deepEqual(
    calls.filter((args) => args[0] === "up").map((args) => args.at(-1)),
    ["media-service", "media-scanner"],
  );
  assert.ok(
    calls
      .filter((args) => args[0] === "up")
      .every((args) => args.includes("--no-build")),
  );
});

test("scanner restoration is still attempted when Media restoration fails", async () => {
  const { options, calls } = harness({ restoreFailure: true });
  await assert.rejects(runMediaRecovery(options), (error) => {
    assert.deepEqual(
      error.errors.map((failure) => failure.message),
      ["fixture_abort", "media_restore_failed"],
    );
    return true;
  });
  assert.equal(calls.at(-1).at(-1), "media-scanner");
});

test("even a partially failed scanner stop attempts scanner restoration", async () => {
  const { options, calls } = harness({ stopFailure: true });
  await assert.rejects(runMediaRecovery(options), (error) => {
    assert.equal(error.errors[0].message, "partial_stop_failed");
    return true;
  });
  assert.equal(calls.at(-1)[0], "up");
  assert.equal(calls.at(-1).at(-1), "media-scanner");
});

test("restart reconnects after a closed socket and 503 without losing byte checks", async () => {
  const { options } = harness();
  let probes = 0;
  let renders = 0;
  const waits = [];
  await waitForApprovedDeliveryAfterRestart({
    ...options,
    readiness: async (signal) => {
      assert.ok(signal instanceof globalThis.AbortSignal);
      if (++probes === 1)
        throw new TypeError("fetch failed", {
          cause: { code: "UND_ERR_SOCKET" },
        });
      return probes === 2 ? 503 : 200;
    },
    render: async (id, signal) => {
      assert.equal(id, options.approvedId);
      assert.ok(signal instanceof globalThis.AbortSignal);
      if (++renders === 1) return { ok: false, status: 503 };
      return { ok: true, status: 200, data: options.approvedBytes };
    },
    wait: async (ms) => waits.push(ms),
  });
  assert.equal(probes, 4);
  assert.equal(renders, 2);
  assert.deepEqual(waits, [1000, 1000, 1000]);
});

test("restart reconnect stops after six unavailable probes and retains the cause", async () => {
  const { options } = harness();
  let probes = 0;
  let waits = 0;
  await assert.rejects(
    waitForApprovedDeliveryAfterRestart({
      ...options,
      readiness: async () => {
        probes++;
        return 503;
      },
      wait: async () => waits++,
    }),
    (error) => {
      assert.equal(error.message, "recovery_gateway_reconnect_exhausted");
      assert.equal(error.cause.message, "recovery_gateway_http_503");
      return true;
    },
  );
  assert.equal(probes, 6);
  assert.equal(waits, 5);
});

test("restart rejects forbidden delivery and incorrect bytes without retrying", async () => {
  const { options } = harness();
  for (const response of [
    { ok: false, status: 403 },
    { ok: true, status: 200, data: Buffer.from("changed bytes") },
  ]) {
    let renders = 0;
    await assert.rejects(
      waitForApprovedDeliveryAfterRestart({
        ...options,
        render: async () => {
          renders++;
          return response;
        },
        wait: async () => assert.fail("must not retry a delivery assertion"),
      }),
      { name: "AssertionError" },
    );
    assert.equal(renders, 1);
  }
});

test("restart rejects unexpected readiness errors and statuses without retrying", async () => {
  const { options } = harness();
  for (const readiness of [
    async () => 500,
    async () => {
      throw new TypeError("invalid request");
    },
  ])
    await assert.rejects(
      waitForApprovedDeliveryAfterRestart({
        ...options,
        readiness,
        wait: async () => assert.fail("must not retry an unexpected failure"),
      }),
    );
});

test("post-restart admin reads reconnect but preserve their caller's deadline", async () => {
  let reads = 0;
  const expected = {
    ok: true,
    status: 200,
    data: { data: { status: "READY" } },
  };
  const result = await readAfterMediaRestart(
    async (signal) => {
      assert.ok(signal instanceof globalThis.AbortSignal);
      if (++reads === 1)
        throw new TypeError("fetch failed", {
          cause: { code: "UND_ERR_SOCKET" },
        });
      return expected;
    },
    { wait: async () => {} },
  );
  assert.equal(result, expected);
  assert.equal(reads, 2);
  await assert.rejects(
    readAfterMediaRestart(
      async () => assert.fail("an expired poll must not send another request"),
      { deadline: Date.now() - 1 },
    ),
    /recovery_gateway_reconnect_exhausted/,
  );
});

test("post-restart repeated socket failures stop and preserve the transport cause", async () => {
  let reads = 0;
  const failure = new TypeError("fetch failed", {
    cause: { code: "UND_ERR_SOCKET" },
  });
  await assert.rejects(
    readAfterMediaRestart(
      async () => {
        reads++;
        throw failure;
      },
      { wait: async () => {} },
    ),
    (error) => {
      assert.equal(error.message, "recovery_gateway_reconnect_exhausted");
      assert.equal(error.cause, failure);
      return true;
    },
  );
  assert.equal(reads, 6);
});

test("full recovery uses reconnect reads only after restart and checks approval and missing bytes", async () => {
  const { options, calls } = harness();
  let restarted = false;
  let scannerRunning = false;
  let finalReads = 0;
  const originalCompose = options.tools.compose;
  options.tools.compose = (args) => {
    originalCompose(args);
    if (args[0] === "up" && args.at(-1) === "media-service") restarted = true;
    if (args[0] === "up" && args.at(-1) === "media-scanner")
      scannerRunning = true;
  };
  options.tools.expire = () => {};
  options.tools.job = (id) => {
    if (id === "fixture-1" && scannerRunning)
      return {
        status: "COMPLETED",
        attempts: 2,
        leaseToken: null,
        sourceCount: 1,
      };
    if (id === "fixture-1" && restarted)
      return { status: "PROCESSING", attempts: 1, sourceCount: 0 };
    return { status: "QUEUED", attempts: 0, sourceCount: 0 };
  };
  const polledIds = [];
  options.waitTerminal = async (id, configuration) => {
    assert.equal(configuration.afterRestart, true);
    assert.equal(scannerRunning, true);
    polledIds.push(id);
    return id === "fixture-1"
      ? { status: "READY", scanStatus: "CLEAN" }
      : {
          status: "BLOCKED",
          scanStatus: "FAILED",
          quarantineReason: "upload_missing",
        };
  };
  const originalRender = options.render;
  options.render = async (id, signal) => {
    if (id === "fixture-1" && scannerRunning) {
      assert.ok(signal instanceof globalThis.AbortSignal);
      if (++finalReads === 1)
        throw new TypeError("fetch failed", {
          cause: { code: "UND_ERR_SOCKET" },
        });
      return { ok: true, status: 200, data: options.approvedBytes };
    }
    return originalRender(id);
  };
  await runMediaRecovery(options);
  assert.deepEqual(polledIds, ["fixture-1", "fixture-2"]);
  assert.equal(finalReads, 2);
  assert.deepEqual(
    calls.filter((args) => args[0] === "up").map((args) => args.at(-1)),
    ["media-service", "media-scanner"],
  );
});
