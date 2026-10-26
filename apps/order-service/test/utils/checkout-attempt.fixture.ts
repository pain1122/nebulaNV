import { Prisma, type CheckoutAttempt } from "../../prisma/generated/client";

// Storage double for service decisions, not a PostgreSQL/concurrency proof.
export function attemptStore() {
  const rows: CheckoutAttempt[] = [];
  const find = (where: Prisma.CheckoutAttemptWhereUniqueInput) =>
    rows.find((row) =>
      where.id
        ? row.id === where.id
        : row.userId === where.userId_keyHash?.userId &&
          row.keyHash === where.userId_keyHash?.keyHash,
    ) ?? null;
  const findUnique = jest.fn(
    ({ where }: Prisma.CheckoutAttemptFindUniqueArgs) => {
      const row = find(where);
      return Promise.resolve(row ? structuredClone(row) : null);
    },
  );
  return {
    rows,
    delegate: {
      findUnique,
      findUniqueOrThrow: jest.fn(
        ({ where }: Prisma.CheckoutAttemptFindUniqueOrThrowArgs) => {
          const row = find(where);
          if (!row) throw new Error("attempt_missing");
          return Promise.resolve(structuredClone(row));
        },
      ),
      findFirst: jest.fn(({ where }: Prisma.CheckoutAttemptFindFirstArgs) =>
        Promise.resolve(
          structuredClone(
            rows.find(
              (row) =>
                row.userId === where?.userId &&
                ["PREPARED", "ORDER_COMMITTED", "CANCELLING"].includes(
                  row.state,
                ),
            ) ?? null,
          ),
        ),
      ),
      findMany: jest.fn(() =>
        Promise.resolve(
          structuredClone(
            rows
              .filter(
                (row) =>
                  ["PREPARED", "ORDER_COMMITTED", "CANCELLING"].includes(
                    row.state,
                  ) &&
                  row.nextRetryAt.getTime() <= Date.now() &&
                  (!row.leaseUntil || row.leaseUntil.getTime() <= Date.now()),
              )
              .slice(0, 5),
          ),
        ),
      ),
      create: jest.fn(({ data }: Prisma.CheckoutAttemptCreateArgs) => {
        const now = new Date();
        const row = {
          createdAt: now,
          updatedAt: now,
          nextRetryAt: now,
          failures: 0,
          state: "PREPARED",
          orderId: null,
          leaseToken: null,
          leaseUntil: null,
          ...data,
        } as CheckoutAttempt;
        rows.push(row);
        return Promise.resolve(structuredClone(row));
      }),
      update: jest.fn(({ where, data }: Prisma.CheckoutAttemptUpdateArgs) => {
        const row = find(where);
        if (!row) throw new Error("attempt_missing");
        const next = {
          ...row,
          ...data,
          payload:
            data.payload === Prisma.DbNull
              ? null
              : (data.payload ?? row.payload),
          updatedAt: new Date(),
        } as CheckoutAttempt;
        Object.assign(row, next);
        return Promise.resolve(structuredClone(next));
      }),
    },
  };
}
