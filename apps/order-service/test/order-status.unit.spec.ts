import type { PrismaService } from "../src/prisma.service";
import {
  OrderStatus,
  type OrderStatusChange,
  type Prisma,
} from "../prisma/generated/client";
import {
  applyOrderStatus,
  type OrderStatusCommand,
} from "../src/order/order-status";
import { orderReply } from "../src/order/checkout-contract";
import { receiptReplay } from "../src/order/checkout-receipt";
import { storedOrder } from "./utils/order.fixture";
import { orderv1 } from "@nebula/protos";
import { loadSync, type ServiceDefinition } from "@grpc/proto-loader";
import { grpcS2SProtoLoaderOptions } from "@nebula/grpc-auth";

const ID = "fd230000-0000-4000-8000-000000000001";
const ACTOR = {
  userId: "fd230000-0000-4000-8000-000000000090",
  role: "admin",
  requestId: "status-unit",
};
const KEY = "order-status-unit-command";
function harness() {
  let current = {
    ...storedOrder({ id: ID }),
    checkoutAttempt: null as null | { state: string },
  };
  const saved = new Map<string, OrderStatusChange>();
  const tx = {
    demoPaymentAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    orderCancellation: { findUnique: jest.fn().mockResolvedValue(null) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    order: {
      findUnique: jest.fn(() => Promise.resolve(current)),
      updateMany: jest.fn(({ data }: { data: { status: OrderStatus } }) => {
        current = {
          ...current,
          status: data.status,
          version: current.version + 1,
        };
        return Promise.resolve({ count: 1 });
      }),
      findUniqueOrThrow: jest.fn(() => Promise.resolve(current)),
    },
    orderStatusChange: {
      findUnique: jest.fn(
        ({ where }: { where: { actorId_keyHash: { keyHash: string } } }) =>
          Promise.resolve(saved.get(where.actorId_keyHash.keyHash) ?? null),
      ),
      create: jest.fn(
        ({ data }: { data: Prisma.OrderStatusChangeUncheckedCreateInput }) => {
          const row = {
            ...data,
            id: ID,
            createdAt: new Date(),
          } as OrderStatusChange;
          saved.set(data.keyHash, row);
          return Promise.resolve(row);
        },
      ),
    },
  };
  const transaction = jest.fn((work: (value: typeof tx) => Promise<unknown>) =>
    work(tx),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const run = (
    input: OrderStatusCommand = { status: "PAID", expectedVersion: 1 },
    key: unknown = KEY,
    actor = ACTOR,
  ) => applyOrderStatus(prisma, ID, input, key, actor);
  return {
    tx,
    prisma,
    transaction,
    run,
    setState: (status: OrderStatus, version = 1) => {
      current = { ...current, status, version };
    },
    unfinished: () => {
      current.checkoutAttempt = { state: "ORDER_COMMITTED" };
    },
  };
}
describe("Order status controls", () => {
  it("preserves absent versus zero command versions in generated and receiver codecs", async () => {
    const generated = orderv1.OrderServiceService.updateOrderStatus;
    const loaded = loadSync(
      require.resolve("@nebula/protos/order.proto"),
      grpcS2SProtoLoaderOptions(),
    );
    const receiver = (loaded["order.OrderService"] as ServiceDefinition)
      .UpdateOrderStatus;
    for (const version of [undefined, 0]) {
      const body = orderv1.UpdateOrderStatusRequest.create({
        id: ID,
        status: "PAID",
        idempotencyKey: KEY,
        expectedVersion: version,
      });
      const decoded = generated.requestDeserialize(
        generated.requestSerialize(body),
      );
      const received = receiver.requestDeserialize(
        receiver.requestSerialize(body),
      ) as orderv1.UpdateOrderStatusRequest;
      expect(decoded.expectedVersion).toBe(version);
      expect(received.expectedVersion).toBe(version);
      const h = harness();
      await expect(
        applyOrderStatus(
          h.prisma,
          received.id,
          received,
          received.idempotencyKey,
          ACTOR,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(h.transaction).not.toHaveBeenCalled();
    }
  });
  it("commits a conditional manual demo transition and verified audit facts", async () => {
    const h = harness();
    expect((await h.run()).data).toMatchObject({ status: "PAID", version: 2 });
    expect(h.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: ID, version: 1, status: "PENDING" },
      data: { status: "PAID", version: { increment: 1 } },
    });
    const auditData: unknown = expect.objectContaining({
      orderId: ID,
      actorId: ACTOR.userId,
      actorRole: "admin",
      requestId: ACTOR.requestId,
      previousStatus: "PENDING",
      status: "PAID",
      expectedVersion: 1,
      version: 2,
    });
    expect(h.tx.orderStatusChange.create).toHaveBeenCalledWith({
      data: auditData,
    });
    expect(
      JSON.stringify(h.tx.orderStatusChange.create.mock.calls[0][0]),
    ).not.toContain(KEY);
  });
  it("replays the original reply before consulting later Order state", async () => {
    const h = harness();
    const first = await h.run();
    h.setState(OrderStatus.FULFILLED, 3);
    expect(await h.run()).toEqual(first);
    expect(h.tx.order.findUnique).toHaveBeenCalledTimes(1);
    expect(h.tx.orderStatusChange.create).toHaveBeenCalledTimes(1);
    await expect(
      h.run({ status: "FULFILLED", expectedVersion: 2 }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("allows PAID to FULFILLED with a new current-version command", async () => {
    const h = harness();
    await h.run();
    expect(
      (
        await h.run(
          { status: "FULFILLED", expectedVersion: 2 },
          "order-status-unit-second",
        )
      ).data,
    ).toMatchObject({ status: "FULFILLED", version: 3 });
  });
  it.each([
    ["PENDING", "PENDING"],
    ["PENDING", "FULFILLED"],
    ["PENDING", "PAYMENT_PROCESSING"],
    ["PENDING", "CANCELLED"],
    ["PAID", "PENDING"],
    ["PAID", "CANCELLED"],
    ["PAYMENT_PROCESSING", "PAID"],
    ["PAYMENT_PROCESSING", "PENDING"],
    ["FULFILLED", "PENDING"],
    ["CANCELLED", "PAID"],
  ])("rejects unsupported %s -> %s without a write", async (before, after) => {
    const h = harness();
    h.setState(before as OrderStatus);
    await expect(
      h.run({ status: after, expectedVersion: 1 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(h.tx.order.updateMany).not.toHaveBeenCalled();
    expect(h.tx.orderStatusChange.create).not.toHaveBeenCalled();
  });
  it.each([undefined, null, 0, -1, 1.5, 2147483647, "1"])(
    "rejects invalid/absent version %j before DB",
    async (value) => {
      const h = harness();
      await expect(
        h.run({ status: "PAID", expectedVersion: value as number }),
      ).rejects.toMatchObject({ status: 400 });
      expect(h.transaction).not.toHaveBeenCalled();
    },
  );
  it("rejects missing keys and unverified/ordinary actors before DB", async () => {
    const fresh = harness();
    await expect(fresh.run(undefined, null)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      fresh.run(undefined, KEY, { ...ACTOR, userId: "" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      fresh.run(undefined, KEY, { ...ACTOR, role: "user" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fresh.transaction).not.toHaveBeenCalled();
  });
  it("rejects stale claims, unfinished Checkout and lost conditional races", async () => {
    const h = harness();
    h.setState(OrderStatus.PENDING, 2);
    await expect(h.run()).rejects.toThrow("order_version_conflict");
    const pending = harness();
    pending.unfinished();
    await expect(pending.run()).rejects.toThrow("checkout_in_progress");
    const race = harness();
    race.tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(race.run()).rejects.toThrow("order_version_conflict");
    expect(race.tx.orderStatusChange.create).not.toHaveBeenCalled();
  });
  it("blocks manual payment while a cancellation holds the Order", async () => {
    const h = harness();
    h.tx.orderCancellation.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ orderId: ID });
    await expect(h.run()).rejects.toThrow("order_cancellation_in_progress");
    expect(h.tx.order.updateMany).not.toHaveBeenCalled();
  });
  it("blocks plain status changes during attempts and PAID after an allocation was released", async () => {
    const active = harness();
    active.tx.demoPaymentAttempt.findFirst.mockResolvedValueOnce({ id: ID });
    await expect(active.run()).rejects.toThrow("demo_payment_in_progress");
    const released = harness();
    released.tx.demoPaymentAttempt.count.mockResolvedValueOnce(1);
    await expect(released.run()).rejects.toThrow("demo_payment_retry_required");
    expect(released.tx.order.updateMany).not.toHaveBeenCalled();
  });
  it("does not reuse an actor/key reserved by an unresolved cancellation", async () => {
    const h = harness();
    h.tx.orderCancellation.findUnique.mockResolvedValueOnce({ orderId: ID });
    await expect(h.run()).rejects.toThrow("order_status_idempotency_conflict");
    expect(h.tx.order.findUnique).not.toHaveBeenCalled();
  });
  it("does not manufacture a version on historical immutable Checkout replay", () => {
    const snapshot = orderReply(storedOrder({ id: ID }));
    const { version, ...legacy } = snapshot;
    const receipt = {
      intentHash: "intent",
      replayUntil: new Date(Date.now() + 60000),
      orderId: ID,
      response: legacy,
    } as unknown as Parameters<typeof receiptReplay>[0];
    expect(receiptReplay(receipt, legacy.userId, "intent")).toEqual(legacy);
    expect(
      receiptReplay({ ...receipt, response: snapshot }, legacy.userId, "intent")
        .version,
    ).toBe(version);
    expect(
      orderv1.Order.decode(
        orderv1.Order.encode(orderv1.Order.create(legacy)).finish(),
      ).version,
    ).toBeUndefined();
    expect(
      orderv1.Order.decode(
        orderv1.Order.encode(orderv1.Order.create(snapshot)).finish(),
      ).version,
    ).toBe(1);
  });
});
