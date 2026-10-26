import { orderv1, productv1 } from "@nebula/protos";
import { of } from "rxjs";
import type { ClientGrpc } from "@nestjs/microservices";
import { Metadata } from "@grpc/grpc-js";
import { OrderService } from "../src/order/order.service";
import {
  OrderCancellationCoordinator,
  type RestoreOrderStock,
} from "../src/order/order-cancellation";
import type { PrismaService } from "../src/prisma.service";
import type {
  OrderCancellation,
  OrderStatusChange,
  Prisma,
} from "../prisma/generated/client";
import { storedOrder } from "./utils/order.fixture";

const ID = "fd230000-0000-4000-8000-000000000001";
const OWNER = "fd230000-0000-4000-8000-000000000090";
const ACTOR = {
  userId: "fd230000-0000-4000-8000-000000000091",
  role: "admin",
  requestId: "cancel-request",
};
const KEY = "order-cancel-unit-command";
function harness() {
  const order = {
    ...storedOrder({ id: ID, userId: OWNER }),
    checkoutAttempt: {
      id: ID,
      orderId: ID,
      userId: OWNER,
      state: "COMPLETED",
      stockHash: "a".repeat(64),
    } as null | {
      id: string;
      orderId: string;
      userId: string;
      state: string;
      stockHash: string;
    },
  };
  let row: OrderCancellation | null = null;
  let receipt: OrderStatusChange | null = null;
  const cancellation = {
    findUnique: jest.fn(() => Promise.resolve(row)),
    create: jest.fn(
      ({ data }: { data: Prisma.OrderCancellationUncheckedCreateInput }) => {
        row = {
          ...data,
          leaseToken: null,
          leaseUntil: null,
          completedAt: null,
          nextRetryAt: new Date(0),
          failures: 0,
          createdAt: new Date(),
        } as OrderCancellation;
        return Promise.resolve(row);
      },
    ),
    updateMany: jest.fn(({ data }: Prisma.OrderCancellationUpdateManyArgs) => {
      if (row && data) Object.assign(row, data);
      return Promise.resolve({ count: 1 });
    }),
    update: jest.fn(() => Promise.resolve({})),
    findMany: jest.fn(() => Promise.resolve(row ? [row] : [])),
  };
  const tx = {
    demoPaymentAttempt: { findFirst: jest.fn().mockResolvedValue(null) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    orderCancellation: cancellation,
    order: {
      findUnique: jest.fn(() => Promise.resolve(order)),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(() =>
        Promise.resolve({ ...order, status: "CANCELLED", version: 2 }),
      ),
    },
    orderStatusChange: {
      findUnique: jest.fn(() => Promise.resolve(receipt)),
      create: jest.fn(
        ({ data }: { data: Prisma.OrderStatusChangeUncheckedCreateInput }) => {
          receipt = {
            ...data,
            id: ID,
            createdAt: new Date(),
          } as OrderStatusChange;
          return Promise.resolve(receipt);
        },
      ),
    },
  };
  const transaction = jest.fn((work: (value: typeof tx) => Promise<unknown>) =>
    work(tx),
  );
  const prisma = {
    ...tx,
    $transaction: transaction,
  } as unknown as PrismaService;
  const restore = jest.fn<
    ReturnType<RestoreOrderStock>,
    Parameters<RestoreOrderStock>
  >((identity) => Promise.resolve({ ...identity, state: "RESTORED" }));
  const coordinator = new OrderCancellationCoordinator(prisma, restore);
  const run = (version = 1, key = KEY) =>
    coordinator.cancel(
      ID,
      { status: "CANCELLED", expectedVersion: version },
      key,
      ACTOR,
    );
  return {
    order,
    tx,
    prisma,
    cancellation,
    transaction,
    restore,
    coordinator,
    run,
  };
}

describe("durable unpaid Order cancellation", () => {
  it("does not restore checkout stock while an attempt may own another allocation", async () => {
    const h = harness();
    h.tx.demoPaymentAttempt.findFirst.mockResolvedValueOnce({ id: ID });
    await expect(h.run()).rejects.toThrow("demo_payment_in_progress");
    expect(h.restore).not.toHaveBeenCalled();
  });
  it("dispatches the existing status service command through Product restoration", async () => {
    const h = harness();
    const restore = jest.fn(
      (identity: { intentId: string; payloadHash: string }) =>
        of(
          productv1.CheckoutStockResponse.create({
            ...identity,
            state: "RESTORED",
          }),
        ),
    );
    const service = new OrderService(
      h.prisma,
      {} as ClientGrpc,
      {} as ClientGrpc,
    );
    Object.assign(service, { productSvc: { RestoreCheckoutStock: restore } });
    expect(
      (
        await service.updateOrderStatusAdmin(
          ID,
          { status: "CANCELLED", expectedVersion: 1 },
          KEY,
          ACTOR,
        )
      ).data,
    ).toMatchObject({ status: "CANCELLED", version: 2 });
    const deadline: unknown = expect.any(Date);
    expect(restore).toHaveBeenCalledWith(
      { intentId: ID, payloadHash: "a".repeat(64) },
      undefined,
      expect.objectContaining({ deadline }),
    );
  });
  it("preserves verified downstream context when requesting stock restoration", async () => {
    const h = harness();
    const context = {
      signingPolicy: { requestId: ACTOR.requestId },
      metadata: new Metadata(),
    };
    await h.coordinator.cancel(
      ID,
      { status: "CANCELLED", expectedVersion: 1 },
      KEY,
      ACTOR,
      context,
    );
    expect(h.restore).toHaveBeenCalledWith(
      { intentId: ID, payloadHash: "a".repeat(64) },
      context,
    );
  });
  it("persists original identity before remote work; commits audit/reply only after matching restoration", async () => {
    const h = harness();
    h.restore.mockImplementation((identity) => {
      expect(h.cancellation.create).toHaveBeenCalledTimes(1);
      expect(h.tx.order.updateMany).not.toHaveBeenCalled();
      expect(h.tx.orderStatusChange.create).not.toHaveBeenCalled();
      return Promise.resolve({ ...identity, state: "RESTORED" });
    });
    const result = await h.run();
    expect(result.data).toMatchObject({
      id: ID,
      status: "CANCELLED",
      version: 2,
    });
    expect(h.restore).toHaveBeenCalledWith(
      { intentId: ID, payloadHash: "a".repeat(64) },
      undefined,
    );
    expect(h.tx.orderStatusChange.create.mock.calls[0][0].data).toMatchObject({
      actorId: ACTOR.userId,
      requestId: ACTOR.requestId,
      previousStatus: "PENDING",
      version: 2,
    });
    expect(
      orderv1.Order.decode(
        orderv1.Order.encode(orderv1.Order.create(result.data)).finish(),
      ).status,
    ).toBe("CANCELLED");
    expect(h.cancellation.update).toHaveBeenCalledTimes(1);
    expect(await h.run()).toEqual(result);
    expect(h.restore).toHaveBeenCalledTimes(1);
    await expect(h.run(2)).rejects.toThrow("order_status_idempotency_conflict");
  });

  it.each(["PAID", "FULFILLED", "PAYMENT_PROCESSING", "CANCELLED"])(
    "rejects %s cancellation before remote work",
    async (status) => {
      const h = harness();
      Object.assign(h.order, { status });
      await expect(h.run()).rejects.toThrow("order_transition_not_permitted");
      expect(h.restore).not.toHaveBeenCalled();
      expect(h.cancellation.create).not.toHaveBeenCalled();
    },
  );
  it("rejects legacy/unfinished identity, wrong version, real-payment modes and ordinary actors", async () => {
    for (const change of [
      { checkoutAttempt: null },
      {
        checkoutAttempt: {
          id: ID,
          orderId: ID,
          userId: OWNER,
          state: "ORDER_COMMITTED",
          stockHash: "a".repeat(64),
        },
      },
      { version: 2 },
      { checkoutMode: "PROVIDER" },
    ]) {
      const h = harness();
      Object.assign(h.order, change);
      await expect(h.run()).rejects.toMatchObject({ status: 409 });
      expect(h.restore).not.toHaveBeenCalled();
    }
    const h = harness();
    await expect(
      h.coordinator.cancel(
        ID,
        { status: "CANCELLED", expectedVersion: 1 },
        KEY,
        { ...ACTOR, role: "user" },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it.each(["outage", "wrong-state", "wrong-identity", "wrong-hash"])(
    "retains a recoverable intent after %s without success",
    async (failure) => {
      const h = harness();
      h.restore.mockImplementationOnce((identity) => {
        if (failure === "outage")
          return Promise.reject(new Error("closed_socket"));
        return Promise.resolve({
          ...identity,
          state: failure === "wrong-state" ? "FINALIZED" : "RESTORED",
          intentId:
            failure === "wrong-identity" ? ACTOR.userId : identity.intentId,
          payloadHash:
            failure === "wrong-hash" ? "b".repeat(64) : identity.payloadHash,
        });
      });
      await expect(h.run()).rejects.toMatchObject({ status: 503 });
      expect(h.tx.order.updateMany).not.toHaveBeenCalled();
      expect(h.tx.orderStatusChange.create).not.toHaveBeenCalled();
      expect(h.cancellation.update).not.toHaveBeenCalled();
      const retryData: unknown = expect.objectContaining({
        leaseToken: null,
        leaseUntil: null,
        failures: 1,
      });
      expect(h.cancellation.updateMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: retryData }),
      );
    },
  );
  it("does not call Product when another worker owns the lease", async () => {
    const h = harness();
    h.cancellation.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(h.run()).rejects.toMatchObject({ status: 503 });
    expect(h.restore).not.toHaveBeenCalled();
  });
  it("retains the intent if local audit fails after remote restoration", async () => {
    const h = harness();
    h.tx.orderStatusChange.create.mockRejectedValueOnce(
      new Error("audit_write_failed"),
    );
    await expect(h.run()).rejects.toMatchObject({ status: 503 });
    expect(h.restore).toHaveBeenCalledTimes(1);
    expect(h.cancellation.update).not.toHaveBeenCalled();
    // Actual rollback of the earlier Order update is covered by the SQL proof.
  });
});
