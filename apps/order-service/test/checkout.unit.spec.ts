import { loadSync } from "@grpc/proto-loader";
import { orderv1 } from "@nebula/protos";
import path from "node:path";
import { status as grpcStatus } from "@grpc/grpc-js";
import { Observable, throwError } from "rxjs";
import { Prisma } from "../prisma/generated/client";
import { orderReply } from "../src/order/checkout-contract";
import {
  PRODUCT_ID,
  VARIANT_ID,
  product,
  variantProduct,
} from "./utils/cart.fixture";
import { storedOrder } from "./utils/order.fixture";
import { harness } from "./utils/checkout.fixture";
import { CHECKOUT_RPC_MS } from "../src/order/checkout-attempt-contract";
const REPLAY_KEY = "checkout-unit-replay-key";
describe("checkout current facts and immutable replies", () => {
  it.each(["product", "settings"] as const)(
    "bounds stalled %s quotes, cancels the read and preserves Cart without effects",
    async (dependency) => {
      jest.useFakeTimers();
      try {
        const h = harness();
        const before = JSON.stringify(h.cart());
        let unsubscribed = false;
        const stalled = new Observable<never>(() => () => {
          unsubscribed = true;
        });
        const getString = jest.fn(() => stalled);
        if (dependency === "product") h.getProduct.mockReturnValue(stalled);
        else Object.assign(h.svc, { settingsSvc: { GetString: getString } });
        const pending = h.svc.checkout("owner", REPLAY_KEY);
        const assertion = expect(pending).rejects.toMatchObject({
          status: 503,
          message: `${dependency}_unavailable`,
        });
        await jest.advanceTimersByTimeAsync(CHECKOUT_RPC_MS - 1);
        expect(unsubscribed).toBe(false);
        await jest.advanceTimersByTimeAsync(1);
        await assertion;
        expect(unsubscribed).toBe(true);
        const read = dependency === "product" ? h.getProduct : getString;
        expect(read).toHaveBeenCalledWith(expect.any(Object), undefined, {
          deadline: new Date(Date.now()),
        });
        expect(JSON.stringify(h.cart())).toBe(before);
        expect(h.attempts.rows).toHaveLength(0);
        expect(h.create).not.toHaveBeenCalled();
        expect(h.stock.reserve).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
        expect(h.clear).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    },
  );
  it.each(["product", "settings"] as const)(
    "maps native %s read deadline exhaustion to 503 without committing an attempt",
    async (dependency) => {
      const h = harness();
      const error = { code: grpcStatus.DEADLINE_EXCEEDED, details: "deadline" };
      if (dependency === "product") h.fail(error);
      else
        Object.assign(h.svc, {
          settingsSvc: { GetString: () => throwError(() => error) },
        });
      await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
        status: 503,
        message: `${dependency}_unavailable`,
      });
      expect(h.attempts.rows).toHaveLength(0);
      expect(h.create).not.toHaveBeenCalled();
      expect(h.stock.reserve).not.toHaveBeenCalled();
      expect(h.cart()).not.toBeNull();
    },
  );
  it("normalizes omitted/empty note and rejects corrupted persisted monetary facts", async () => {
    const h = harness();
    const first = await h.svc.checkout("owner", REPLAY_KEY);
    expect(await h.svc.checkout("owner", REPLAY_KEY, "")).toEqual(first);
    expect(await h.svc.checkout("owner", REPLAY_KEY, null)).toEqual(first);
    (h.receipts[0].response as Prisma.JsonObject).total = "0.2";
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toThrow(
      "checkout_receipt_invalid",
    );
    expect(h.create).toHaveBeenCalledTimes(1);
  });
  it("replays the original result after catalogue failure and later status change", async () => {
    const h = harness();
    const first = await h.svc.checkout("owner", REPLAY_KEY, "demo");
    h.order().status = "PAID";
    h.fail({ code: 14 });
    expect(await h.svc.checkout("owner", REPLAY_KEY, "demo")).toEqual(first);
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.getProduct).toHaveBeenCalledTimes(1);
    await expect(
      h.svc.checkout("owner", REPLAY_KEY, "different"),
    ).rejects.toThrow("checkout_idempotency_conflict");
  });
  it.each([
    undefined,
    "short",
    "bad key spaces 123456",
    "a".repeat(129),
    "é".repeat(16),
    ["checkout-key-value"],
  ])("rejects invalid key before dependencies: %j", async (key) => {
    const h = harness();
    await expect(h.svc.checkout("owner", key)).rejects.toMatchObject({
      status: 400,
    });
    expect(h.receiptFind).not.toHaveBeenCalled();
    expect(h.getProduct).not.toHaveBeenCalled();
  });
  it("retains a consumed key after replay expiry and fails closed on corrupted receipts", async () => {
    const h = harness();
    await h.svc.checkout("owner", REPLAY_KEY);
    const row = h.receipts[0];
    row.response = { bad: "payload" };
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toThrow(
      "checkout_receipt_invalid",
    );
    row.replayUntil = new Date(0);
    row.response = null;
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toThrow(
      "checkout_replay_expired",
    );
    expect(h.create).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(
    "preserves complete base/variant snapshots (variant=%s)",
    async (variant) => {
      const h = harness(variant ? variantProduct() : product());
      h.change(
        variant
          ? { ...variantProduct(), title: "Renamed desk" }
          : product({ title: "Renamed desk" }),
      );
      const result = await h.svc.checkout("owner", REPLAY_KEY, "demo note");
      expect(result.data).toMatchObject({
        checkoutMode: "DEMO_NO_PAYMENT",
        status: "PENDING",
        total: variant ? "14.50" : "0.20",
        meta: '{"note":"demo note"}',
        items: [
          {
            productId: PRODUCT_ID,
            variantId: variant ? VARIANT_ID : undefined,
            selectedOptions: variant ? { colour: "Blue" } : {},
            name: "Renamed desk",
            sku: variant ? "DESK-BLUE" : "DESK",
            quantity: 2,
            unitPrice: variant ? "7.25" : "0.10",
          },
        ],
      });
      expect(h.getProduct).toHaveBeenCalledTimes(1);
      expect(h.clear).toHaveBeenCalledTimes(1);
      h.change(
        product({
          title: "Later",
          effectivePriceAmount: "99.00",
          sku: "OTHER",
          currency: "EUR",
        }),
      );
      expect(await h.svc.getOrderForUser("owner", result.data.id)).toEqual(
        result,
      );
      expect(await h.svc.listOrdersForUser("owner")).toEqual({
        data: [result.data],
      });
      expect(h.getProduct).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    { effectivePriceAmount: "0.11" },
    { sku: "NEW" },
    { stockQuantity: 1 },
    { status: "DRAFT" },
    { deletedAt: "deleted" },
    { availability: "OUT_OF_STOCK" },
    { currency: "EUR" },
    { selectionMode: "VARIANT" },
  ])("rejects changed commercial state without writes: %j", async (change) => {
    const h = harness();
    h.change(product(change));
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
      status: 409,
    });
    expect(h.transaction).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.cart()).not.toBeNull();
  });
  it.each([
    { options: { colour: "Red" } },
    { active: false },
    { stockQuantity: 1 },
    { effectivePriceAmount: "0.00" },
  ])("rejects changed variants: %j", async (change) => {
    const h = harness(variantProduct());
    const current = variantProduct();
    Object.assign(current.variants![0], change);
    h.change(current);
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
      status: 409,
    });
    expect(h.create).not.toHaveBeenCalled();
  });
  it("retains dependency and malformed-producer errors and handles deleted catalogue entries", async () => {
    for (const code of [14, 5]) {
      const h = harness();
      h.fail({ code });
      await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
        status: code === 14 ? 503 : 409,
      });
      expect(h.create).not.toHaveBeenCalled();
    }
    const h = harness();
    h.change(product({ effectivePriceAmount: "" }));
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
      status: 503,
    });
    expect(h.create).not.toHaveBeenCalled();
  });
  it("conflicts when current shop currency differs before Product calls", async () => {
    const h = harness();
    h.currency("EUR");
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toMatchObject({
      status: 409,
    });
    expect(h.getProduct).not.toHaveBeenCalled();
  });
  it("rejects Cart edits during quotes after taking the owner lock", async () => {
    const h = harness();
    h.duringQuote(() => {
      h.cart()!.items[0].quantity = 3;
    });
    await expect(h.svc.checkout("owner", REPLAY_KEY)).rejects.toThrow(
      "checkout_cart_changed",
    );
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.clear).not.toHaveBeenCalled();
  });
  it("keeps free prices and exact large-cent amounts through actual codecs", async () => {
    const h = harness(product({ effectivePriceAmount: "0.00" }));
    h.cart()!.items[0].unitPrice = new Prisma.Decimal(0);
    expect((await h.svc.checkout("owner", REPLAY_KEY)).data.total).toBe("0.00");
    const row = storedOrder({
      total: new Prisma.Decimal("90071992547409.91"),
      shippingAddress: { city: "Demo" },
    });
    const response = orderReply(row);
    const decoded = orderv1.Order.decode(
      orderv1.Order.encode(orderv1.Order.create(response)).finish(),
    );
    expect(decoded).toMatchObject({
      checkoutMode: "DEMO_NO_PAYMENT",
      total: "90071992547409.91",
      shippingAddress: '{"city":"Demo"}',
      createdAt: "2026-10-13T12:00:00.000Z",
      items: [{ selectedOptions: {}, unitPrice: "0.10", lineTotal: "0.30" }],
    });
    const definition = loadSync(
      path.resolve(__dirname, "../../../packages/protos/order.proto"),
      { keepCase: true, defaults: true, arrays: true, objects: true },
    );
    const codec = definition["order.Order"] as {
      serialize: (value: unknown) => Buffer;
      deserialize: (value: Buffer) => unknown;
    };
    expect(codec.deserialize(codec.serialize(response))).toMatchObject({
      checkoutMode: "DEMO_NO_PAYMENT",
      items: [{ selectedOptions: {}, unitPrice: "0.10" }],
    });
  });
});
