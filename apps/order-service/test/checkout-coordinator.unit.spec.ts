import { Subject, throwError, of } from "rxjs";
import { harness } from "./utils/checkout.fixture";
import { attemptPayload } from "../src/order/checkout-attempt-contract";
const KEY = "checkout-coordination-key";
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("Order durable stock coordination decisions", () => {
  it("treats publication disappearing after quoting as a checkout conflict and preserves Cart", async () => {
    const h = harness();
    h.stock.reserve.mockImplementationOnce(() =>
      throwError(() => ({ code: 5, details: "product_not_found" })),
    );
    await expect(h.svc.checkout("owner", KEY)).rejects.toMatchObject({
      status: 409,
      message: "checkout_selection_changed",
    });
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
    expect(h.stock.cancel).toHaveBeenCalledTimes(1);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.cart()).not.toBeNull();
  });
  it("stores the quote/identity before stock IO and clears redundant bodies only on completion", async () => {
    const h = harness();
    h.stock.reserve.mockImplementationOnce((identity) => {
      expect(h.attempts.rows).toHaveLength(1);
      const row = h.attempts.rows[0];
      expect(row.state).toBe("PREPARED");
      expect(identity.intentId).toBe(row.id);
      expect(attemptPayload(row).stock.lines[0]).toMatchObject({
        expectedVersion: 1,
        unitPrice: "0.10",
        quantity: 2,
      });
      expect(h.create).not.toHaveBeenCalled();
      return of({ ...identity, state: "HELD" });
    });
    const result = await h.svc.checkout("owner", KEY);
    expect(h.attempts.rows[0]).toMatchObject({
      state: "COMPLETED",
      orderId: result.data.id,
      payload: null,
      leaseToken: null,
      leaseUntil: null,
    });
    expect(h.stock.reserve).toHaveBeenCalledTimes(1);
    expect(h.stock.finalize).toHaveBeenCalledTimes(1);
    expect(h.stock.cancel).not.toHaveBeenCalled();
  });

  it("compensates a pre-commit write failure, preserves Cart and consumes the failed key", async () => {
    const h = harness();
    h.create.mockRejectedValueOnce(new Error("owner_write_failed"));
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "owner_write_failed",
    );
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
    expect(h.stock.cancel).toHaveBeenCalledTimes(1);
    expect(h.stock.finalize).not.toHaveBeenCalled();
    expect(h.clear).not.toHaveBeenCalled();
    expect(h.cart()).not.toBeNull();
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "checkout_attempt_cancelled",
    );
    expect(h.stock.reserve).toHaveBeenCalledTimes(1);
    expect(
      (await h.svc.checkout("owner", "checkout-after-cancel-new-key")).data
        .checkoutMode,
    ).toBe("DEMO_NO_PAYMENT");
  });

  it("recovers a lost reservation response through cancellation, never by assuming no effect", async () => {
    const h = harness();
    h.stock.reserve.mockImplementationOnce(() =>
      throwError(() => ({ code: 14, details: "response_lost" })),
    );
    await expect(h.svc.checkout("owner", KEY)).rejects.toMatchObject({
      status: 503,
    });
    expect(h.stock.cancel).toHaveBeenCalledTimes(1);
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("persists cancellation for retry if compensation is unavailable", async () => {
    const h = harness();
    h.create.mockRejectedValueOnce(new Error("owner_write_failed"));
    h.stock.cancel.mockImplementationOnce(() =>
      throwError(() => ({ code: 14 })),
    );
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "checkout_recovery_pending",
    );
    expect(h.attempts.rows[0]).toMatchObject({
      state: "CANCELLING",
      leaseToken: null,
      failures: 1,
    });
    h.attempts.rows[0].nextRetryAt = new Date(0);
    await h.svc.recoverCheckouts();
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
    expect(h.stock.cancel).toHaveBeenCalledTimes(2);
    expect(h.cart()).not.toBeNull();
  });

  it("keeps committed checkout pending until recovery finalizes, then replays without another reserve", async () => {
    const h = harness();
    h.stock.finalize.mockImplementationOnce(() =>
      throwError(() => ({ code: 14 })),
    );
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "checkout_recovery_pending",
    );
    expect(h.attempts.rows[0]).toMatchObject({
      state: "ORDER_COMMITTED",
      leaseToken: null,
      failures: 1,
    });
    expect(h.receipts).toHaveLength(1);
    expect(h.stock.cancel).not.toHaveBeenCalled();
    h.attempts.rows[0].nextRetryAt = new Date(0);
    await h.svc.recoverCheckouts();
    const result = await h.svc.checkout("owner", KEY);
    expect(result.data.id).toBe(h.attempts.rows[0].id);
    expect(h.attempts.rows[0].state).toBe("COMPLETED");
    expect(h.stock.reserve).toHaveBeenCalledTimes(1);
    expect(h.stock.finalize).toHaveBeenCalledTimes(2);
    expect(h.stock.cancel).not.toHaveBeenCalled();
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("reads the durable commit after an ambiguous transaction response and finalizes instead of refunding", async () => {
    const h = harness();
    h.transaction
      .mockImplementationOnce(async (work) => work(h.tx))
      .mockImplementationOnce(async (work) => {
        await work(h.tx);
        throw new Error("commit_response_lost");
      });
    const result = await h.svc.checkout("owner", KEY);
    expect(result.data.id).toBe(h.attempts.rows[0].id);
    expect(h.stock.finalize).toHaveBeenCalledTimes(1);
    expect(h.stock.cancel).not.toHaveBeenCalled();
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("does not compensate when the commit decision cannot be read", async () => {
    const h = harness();
    h.transaction
      .mockImplementationOnce(async (work) => work(h.tx))
      .mockRejectedValueOnce(new Error("commit_outcome_unknown"))
      .mockRejectedValueOnce(new Error("database_offline"));
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "checkout_recovery_pending",
    );
    expect(h.stock.cancel).not.toHaveBeenCalled();
    expect(h.attempts.rows[0].state).toBe("PREPARED");
    h.attempts.rows[0].leaseUntil = new Date(0);
    await h.svc.recoverCheckouts();
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
  });

  it("fences an expired executor and freezes Cart changes until recovery cancels", async () => {
    const h = harness();
    const response = new Subject<{
      intentId: string;
      payloadHash: string;
      state: string;
    }>();
    h.stock.reserve.mockReturnValueOnce(response.asObservable());
    const work = h.svc.checkout("owner", KEY);
    const failure = expect(work).rejects.toThrow("checkout_recovery_pending");
    await settle();
    expect(h.attempts.rows).toHaveLength(1);
    const row = h.attempts.rows[0];
    await expect(
      h.svc.removeCartItem("owner", h.cart()!.items[0].id),
    ).rejects.toThrow("checkout_in_progress");
    row.leaseUntil = new Date(0);
    await h.svc.recoverCheckouts();
    response.next({
      intentId: row.id,
      payloadHash: row.stockHash,
      state: "HELD",
    });
    response.complete();
    await failure;
    expect(h.attempts.rows[0].state).toBe("CANCELLED");
    expect(h.create).not.toHaveBeenCalled();
    expect(h.stock.cancel).toHaveBeenCalledTimes(1);
  });

  it("rejects a corrupt durable quote and changed intent without additional stock effects", async () => {
    const h = harness();
    h.stock.finalize.mockImplementationOnce(() =>
      throwError(() => ({ code: 14 })),
    );
    await expect(h.svc.checkout("owner", KEY)).rejects.toThrow(
      "checkout_recovery_pending",
    );
    await expect(h.svc.checkout("owner", KEY, "changed")).rejects.toThrow(
      "checkout_idempotency_conflict",
    );
    const row = h.attempts.rows[0];
    expect(() => attemptPayload({ ...row, stockHash: "b".repeat(64) })).toThrow(
      "checkout_attempt_invalid",
    );
    expect(h.stock.reserve).toHaveBeenCalledTimes(1);
  });
});
