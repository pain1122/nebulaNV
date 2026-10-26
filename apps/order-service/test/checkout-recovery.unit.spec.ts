import { CheckoutRecovery } from "../src/order/checkout-recovery";
import { CheckoutReceiptRetention } from "../src/order/checkout-receipt-retention";
import type { OrderService } from "../src/order/order.service";
import type { PrismaService } from "../src/prisma.service";
import type { Prisma } from "../prisma/generated/client";

describe("bounded checkout recovery scheduling and receipt retention", () => {
  it("prevents overlapping ticks and resumes after a failed pass", async () => {
    let release!: () => void;
    const recoverCheckouts = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const recoverOrderCancellations = jest.fn().mockResolvedValue(undefined);
    const worker = new CheckoutRecovery({
      recoverCheckouts,
      recoverOrderCancellations,
      recoverDemoPayments: jest.fn().mockResolvedValue(undefined),
    } as unknown as OrderService);
    const first = worker.tick();
    await worker.tick();
    expect(recoverCheckouts).toHaveBeenCalledTimes(1);
    release();
    await first;
    recoverCheckouts.mockRejectedValueOnce(new Error("dependency_unavailable"));
    await expect(worker.tick()).rejects.toMatchObject({
      errors: [expect.objectContaining({ message: "dependency_unavailable" })],
    });
    expect(recoverOrderCancellations).toHaveBeenCalledTimes(2);
    recoverCheckouts.mockResolvedValueOnce();
    await worker.tick();
    expect(recoverCheckouts).toHaveBeenCalledTimes(3);
    worker.onModuleDestroy();
  });
  it("excludes unfinished purchases from both compaction selection and update", async () => {
    const findMany = jest
      .fn<
        Promise<Array<{ id: string }>>,
        [Prisma.CheckoutReceiptFindManyArgs]
      >()
      .mockResolvedValue([{ id: "receipt" }]);
    const updateMany = jest
      .fn<Promise<{ count: number }>, [Prisma.CheckoutReceiptUpdateManyArgs]>()
      .mockResolvedValue({ count: 1 });
    const retention = new CheckoutReceiptRetention({
      checkoutReceipt: { findMany, updateMany },
    } as unknown as PrismaService);
    await retention.compact();
    const eligible = [
      { order: { checkoutAttempt: { is: null } } },
      { order: { checkoutAttempt: { is: { state: "COMPLETED" } } } },
    ];
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { OR: eligible },
      take: 100,
    });
    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { OR: eligible },
    });
  });
});
