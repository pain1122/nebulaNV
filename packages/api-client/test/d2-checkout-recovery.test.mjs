import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { createGatewayClient } from "../dist/index.js";
import {
  finalizationFaultSql,
  reconnectRead,
  replayCompletedCheckout,
  runCheckoutRecovery,
} from "./d2-checkout-recovery.mjs";

const productId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const orderId = "00000000-0000-4000-8000-000000000003";
const pendingId = "00000000-0000-4000-8000-000000000004";
function harness({
  partialProductStop = false,
  productRestoreFailure = false,
  partialFault = false,
  partialOrderStop = false,
  wrongReadStatus = false,
  duplicateStock = false,
  completionDelayMs = 0,
} = {}) {
  const calls = [],
    logs = [];
  const first = { id: orderId, userId, total: "2.70" };
  const cart = {
    items: [{ id: productId, productId, quantity: 1 }],
    total: "0.10",
  };
  const recovered = {
    id: pendingId,
    userId,
    total: cart.total,
    items: [{ productId, quantity: 1 }],
  };
  let pendingKey,
    committed = false,
    completed = false,
    consumed = false,
    restarted = false,
    waitedMs = 0;
  return {
    calls,
    logs,
    input: {
      first,
      key: "original-checkout-key",
      body: {},
      productId,
      emit: (line) => logs.push(line),
      stock: async () =>
        committed ? (completed && duplicateStock ? 6 : 7) : 8,
      readiness: async () => ({ status: 200 }),
      call: async (operation, input = {}) => {
        calls.push(operation);
        if (operation === "orders_cart_add") return cart;
        if (operation === "orders_cart_get")
          return consumed ? { items: [] } : cart;
        if (operation === "orders_checkout")
          return input.idempotencyKey === "original-checkout-key"
            ? first
            : recovered;
        if (operation === "orders_get") return recovered;
        throw new Error(`unexpected_call_${operation}`);
      },
      request: async (operation, input) => {
        if (operation === "orders_checkout") {
          if (input.idempotencyKey === "original-checkout-key")
            return { status: 201, ok: true, data: { data: first } };
          if (input.idempotencyKey === pendingKey && completed)
            return { status: 201, ok: true, data: { data: recovered } };
          if (input.body.note.includes("recovery")) {
            pendingKey = input.idempotencyKey;
            committed = true;
            consumed = true;
          }
          return { status: 503 };
        }
        if (operation === "orders_get")
          return { status: wrongReadStatus ? 403 : 404 };
        if (operation === "orders_cart_add") return { status: 409 };
        throw new Error(`unexpected_request_${operation}`);
      },
      tools: {
        wait: async (ms) => {
          waitedMs += ms;
          if (restarted && waitedMs >= completionDelayMs) completed = true;
        },
        evict: async (_user, _key, expectedOrder) => (expectedOrder ? 1 : 0),
        compose: async (args) => {
          calls.push(args);
          if (
            args[0] === "stop" &&
            args.at(-1) === "product-service" &&
            partialProductStop
          )
            throw new Error("product_partial_stop");
          if (
            args[0] === "up" &&
            args.at(-1) === "product-service" &&
            productRestoreFailure
          )
            throw new Error("product_restore_failed");
          if (
            args[0] === "stop" &&
            args.at(-1) === "order-service" &&
            partialOrderStop
          )
            throw new Error("order_partial_stop");
          if (args[0] === "up" && args.at(-1) === "order-service") {
            restarted = true;
            completed = completionDelayMs === 0;
          }
        },
        fault: async (_id, install) => {
          calls.push(install ? "install-fault" : "remove-fault");
          if (install && partialFault) throw new Error("partial_fault_install");
          // A running worker may finish once the fault is removed.
          if (!install && wrongReadStatus) completed = true;
        },
        attempt: async (_user, key) =>
          key === "original-checkout-key"
            ? {
                id: orderId,
                orderId,
                state: "COMPLETED",
                orders: 1,
                receipts: 1,
              }
            : key !== pendingKey
              ? null
              : {
                  id: pendingId,
                  orderId: pendingId,
                  state: completed ? "COMPLETED" : "ORDER_COMMITTED",
                  orders: 1,
                  receipts: 1,
                },
        intent: async () => ({
          id: pendingId,
          state: completed ? "FINALIZED" : "HELD",
        }),
      },
    },
  };
}
test("recovery orchestration checks cache loss, outage and committed restart without duplicate stock effects", async () => {
  const h = harness();
  await runCheckoutRecovery(h.input);
  assert.equal(h.logs.length, 4);
  assert.deepEqual(
    h.calls.filter(Array.isArray).map((a) => [a[0], a.at(-1)]),
    [
      ["stop", "product-service"],
      ["up", "product-service"],
      ["stop", "order-service"],
      ["up", "order-service"],
    ],
  );
  assert.ok(
    h.calls.indexOf("remove-fault") <
      h.calls.findIndex(
        (a) =>
          Array.isArray(a) && a[0] === "up" && a.at(-1) === "order-service",
      ),
  );
});
test("a partially failed Product stop still restores Product and retains both failures", async () => {
  const h = harness({ partialProductStop: true, productRestoreFailure: true });
  await assert.rejects(runCheckoutRecovery(h.input), (error) => {
    assert.deepEqual(
      error.errors.map((e) => e.message),
      ["product_partial_stop", "product_restore_failed"],
    );
    return true;
  });
  assert.ok(
    h.calls.some(
      (a) =>
        Array.isArray(a) && a[0] === "up" && a.at(-1) === "product-service",
    ),
  );
});
test("partial SQL fault installation is cleaned up", async () => {
  const h = harness({ partialFault: true });
  await assert.rejects(runCheckoutRecovery(h.input), /restoration_failed/);
  assert.ok(h.calls.includes("remove-fault"));
});
test("partial Order stop removes the fault and restores Order", async () => {
  const h = harness({ partialOrderStop: true });
  await assert.rejects(runCheckoutRecovery(h.input), (error) => {
    assert.equal(error.errors[0].message, "order_partial_stop");
    return true;
  });
  assert.ok(h.calls.includes("remove-fault"));
  assert.ok(
    h.calls.some(
      (a) => Array.isArray(a) && a[0] === "up" && a.at(-1) === "order-service",
    ),
  );
});
test("wrong ownership status is rejected while fault cleanup still runs", async () => {
  const h = harness({ wrongReadStatus: true });
  await assert.rejects(runCheckoutRecovery(h.input), /restoration_failed/);
  assert.ok(h.calls.includes("remove-fault"));
});
test("a second stock decrement is rejected after restart", async () => {
  const h = harness({ duplicateStock: true });
  await assert.rejects(runCheckoutRecovery(h.input), /restoration_failed/);
});
test("restart recovery allows the existing 120-second owner lease to expire", async () => {
  const h = harness({ completionDelayMs: 122_000 });
  await runCheckoutRecovery(h.input);
  assert.equal(h.logs.length, 4);
});
test("reconnect reads tolerate only bounded fetch failures and 503", async () => {
  let probes = 0;
  const result = await reconnectRead(
    async () => {
      probes++;
      if (probes === 1) throw new TypeError("fetch failed");
      return { status: probes === 2 ? 503 : 200 };
    },
    { wait: async () => {} },
  );
  assert.equal(result.status, 200);
  assert.equal(probes, 3);
});
test("read exhaustion retains the final transport cause", async () => {
  const cause = new TypeError("fetch failed");
  let probes = 0;
  await assert.rejects(
    reconnectRead(
      async () => {
        probes++;
        throw cause;
      },
      { attempts: 3, wait: async () => {} },
    ),
    (error) => {
      assert.equal(error.cause, cause);
      return true;
    },
  );
  assert.equal(probes, 3);
});
test("unexpected status and non-transport exceptions are not retried", async () => {
  let probes = 0;
  await assert.rejects(
    reconnectRead(
      async () => {
        probes++;
        return { status: 403 };
      },
      { wait: async () => {} },
    ),
    /unexpected_read_status/,
  );
  assert.equal(probes, 1);
  const cause = new Error("wrong_bytes_or_auth");
  await assert.rejects(
    reconnectRead(async () => {
      throw cause;
    }),
    (error) => error === cause,
  );
});
test("fault fixture rejects untrusted SQL identifiers before producing SQL", () => {
  assert.throws(() => finalizationFaultSql("x'; DROP TABLE Product; --", true));
});

const completed = { id: orderId, orderId, state: "COMPLETED" };
const replayInput = {
  key: "completed-checkout-key",
  body: { note: "original" },
  completed,
  expectedOrderId: orderId,
  wait: async () => {},
};
test("completed replay reconnects after an actual closed HTTP socket with the same SDK key/body", async () => {
  const received = [],
    serverErrors = [];
  const server = createServer((req, res) => {
    void (async () => {
      let text = "";
      for await (const chunk of req) text += chunk.toString();
      received.push({
        key: req.headers["idempotency-key"],
        body: JSON.parse(text),
      });
      if (received.length === 1) {
        req.socket.destroy();
        return;
      }
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: { id: orderId } }));
    })().catch((error) => {
      serverErrors.push(error);
      res.destroy();
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const client = createGatewayClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      publicClientId: "mobile-local",
    });
    const order = await replayCompletedCheckout(
      (operation, input) =>
        client.request(operation, {
          accessToken: "fixture-token",
          signal: globalThis.AbortSignal.timeout(2000),
          ...input,
        }),
      replayInput,
    );
    assert.equal(order.id, orderId);
    assert.deepEqual(received, [
      { key: replayInput.key, body: replayInput.body },
      { key: replayInput.key, body: replayInput.body },
    ]);
    assert.deepEqual(serverErrors, []);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
test("completed replay socket exhaustion is bounded and preserves the last cause", async () => {
  const cause = new TypeError("fetch failed", {
    cause: { code: "UND_ERR_SOCKET" },
  });
  let calls = 0;
  await assert.rejects(
    replayCompletedCheckout(async (_operation, input) => {
      calls++;
      assert.equal(input.idempotencyKey, replayInput.key);
      assert.deepEqual(input.body, replayInput.body);
      throw cause;
    }, replayInput),
    (error) => {
      assert.equal(error.cause, cause);
      return true;
    },
  );
  assert.equal(calls, 3);
});
for (const status of [403, 409, 503])
  test(`completed replay rejects HTTP ${status} without retry`, async () => {
    let calls = 0;
    await assert.rejects(
      replayCompletedCheckout(async () => {
        calls++;
        return { status, ok: false };
      }, replayInput),
      new RegExp(`http_${status}`),
    );
    assert.equal(calls, 1);
  });
test("completed replay rejects wrong successful Order identity without retry", async () => {
  let calls = 0;
  await assert.rejects(
    replayCompletedCheckout(async () => {
      calls++;
      return { status: 201, ok: true, data: { data: { id: pendingId } } };
    }, replayInput),
    /wrong_order/,
  );
  assert.equal(calls, 1);
});
test("completed replay never retries deadline aborts or other transport causes", async () => {
  for (const cause of [
    new globalThis.DOMException("deadline", "TimeoutError"),
    new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } }),
  ]) {
    let calls = 0;
    await assert.rejects(
      replayCompletedCheckout(async () => {
        calls++;
        throw cause;
      }, replayInput),
      (error) => error === cause,
    );
    assert.equal(calls, 1);
  }
});
test("completed replay refuses nonterminal owner evidence before sending a request", async () => {
  let calls = 0;
  await assert.rejects(
    replayCompletedCheckout(
      async () => {
        calls++;
      },
      {
        ...replayInput,
        completed: { ...completed, state: "ORDER_COMMITTED" },
      },
    ),
    /requires_completed_owner_attempt/,
  );
  assert.equal(calls, 0);
});
test("fresh outage checkout socket failure is not retried and still restores Product", async () => {
  const h = harness();
  const originalRequest = h.input.request;
  const cause = new TypeError("fetch failed", {
    cause: { code: "UND_ERR_SOCKET" },
  });
  let freshCalls = 0;
  h.input.request = async (operation, input) => {
    if (
      operation === "orders_checkout" &&
      input.body.note === "D2 unavailable catalogue"
    ) {
      freshCalls++;
      throw cause;
    }
    return originalRequest(operation, input);
  };
  await assert.rejects(runCheckoutRecovery(h.input), (error) => {
    assert.equal(error.errors[0], cause);
    return true;
  });
  assert.equal(freshCalls, 1);
  assert.ok(
    h.calls.some(
      (args) =>
        Array.isArray(args) &&
        args[0] === "up" &&
        args.at(-1) === "product-service",
    ),
  );
});
