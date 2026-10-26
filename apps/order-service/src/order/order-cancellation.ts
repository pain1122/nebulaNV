import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { VerifiedServiceDownstreamContext } from "@nebula/grpc-auth";
import type { OrderCancellation } from "../../prisma/generated/client";
import type { PrismaService } from "../prisma.service";
import { CHECKOUT_LEASE_MS } from "./checkout-attempt-contract";
import { orderReply } from "./checkout-contract";
import { receiptBody } from "./checkout-receipt";
import { ACTIVE_DEMO_PAYMENTS } from "./demo-payment-contract";
import {
  lockStatusKey,
  orderStatusIntent,
  orderStatusTransaction,
  type OrderStatusActor,
  type OrderStatusCommand,
} from "./order-status";

type Identity = { intentId: string; payloadHash: string };
type Context = VerifiedServiceDownstreamContext | undefined;
export type RestoreOrderStock = (
  identity: Identity,
  context: Context,
) => Promise<Identity & { state: string }>;
const pending = (cause?: unknown) =>
  new ServiceUnavailableException("order_cancellation_recovery_pending", {
    cause,
  });

export class OrderCancellationCoordinator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restore: RestoreOrderStock,
  ) {}

  async cancel(
    id: string,
    input: OrderStatusCommand,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const intent = orderStatusIntent(id, input, key, actor);
    if (intent.status !== "CANCELLED")
      throw new ConflictException("order_transition_not_permitted");
    const started = await orderStatusTransaction(this.prisma, async (tx) => {
      const replay = await lockStatusKey(tx, intent);
      if (replay) return { replay };
      const keyOwner = await tx.orderCancellation.findUnique({
        where: {
          actorId_keyHash: { actorId: intent.actorId, keyHash: intent.keyHash },
        },
      });
      if (
        keyOwner &&
        (keyOwner.intentHash !== intent.intentHash ||
          keyOwner.orderId !== intent.orderId)
      )
        throw new ConflictException("order_status_idempotency_conflict");
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${intent.orderId}::uuid FOR UPDATE`;
      const existing = await tx.orderCancellation.findUnique({
        where: { orderId: intent.orderId },
      });
      if (existing) {
        if (
          existing.actorId !== intent.actorId ||
          existing.keyHash !== intent.keyHash ||
          existing.intentHash !== intent.intentHash
        )
          throw new ConflictException("order_cancellation_in_progress");
        if (existing.completedAt) throw pending(); // A completed command must have its audit/reply.
        return { row: existing };
      }
      const order = await tx.order.findUnique({
        where: { id: intent.orderId },
        include: { checkoutAttempt: true },
      });
      if (!order) throw new NotFoundException("order_not_found");
      if (order.version !== intent.expectedVersion)
        throw new ConflictException("order_version_conflict");
      if (
        order.status !== "PENDING" ||
        order.checkoutMode !== "DEMO_NO_PAYMENT"
      )
        throw new ConflictException("order_transition_not_permitted");
      const attempt = order.checkoutAttempt;
      if (
        await tx.demoPaymentAttempt.findFirst({
          where: {
            orderId: order.id,
            state: { in: [...ACTIVE_DEMO_PAYMENTS] },
          },
        })
      )
        throw new ConflictException("demo_payment_in_progress");
      if (
        !attempt ||
        attempt.state !== "COMPLETED" ||
        attempt.orderId !== order.id ||
        attempt.userId !== order.userId ||
        !/^[0-9a-f]{64}$/.test(attempt.stockHash)
      )
        throw new ConflictException(
          "order_cancellation_stock_identity_missing",
        );
      const row = await tx.orderCancellation.create({
        data: {
          orderId: intent.orderId,
          checkoutAttemptId: attempt.id,
          stockHash: attempt.stockHash,
          actorId: intent.actorId,
          actorRole: intent.actorRole,
          keyHash: intent.keyHash,
          intentHash: intent.intentHash,
          expectedVersion: intent.expectedVersion,
          requestId: intent.requestId,
        },
      });
      return { row };
    });
    if (started.replay) return started.replay;
    return this.drive(started.row, context);
  }

  private async drive(
    row: OrderCancellation,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const now = new Date();
    const token = randomUUID();
    const claimed = await this.prisma.orderCancellation.updateMany({
      where: {
        orderId: row.orderId,
        completedAt: null,
        nextRetryAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      data: {
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + CHECKOUT_LEASE_MS),
      },
    });
    if (claimed.count !== 1) throw pending();
    try {
      const identity = {
        intentId: row.checkoutAttemptId,
        payloadHash: row.stockHash,
      };
      const restored = await this.restore(identity, context);
      if (
        !restored ||
        restored.intentId !== identity.intentId ||
        restored.payloadHash !== identity.payloadHash ||
        restored.state !== "RESTORED"
      )
        throw pending();
      return await orderStatusTransaction(this.prisma, async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${row.orderId}::uuid FOR UPDATE`;
        const current = await tx.orderCancellation.findUnique({
          where: { orderId: row.orderId },
        });
        if (
          !current ||
          current.completedAt ||
          current.leaseToken !== token ||
          !current.leaseUntil ||
          current.leaseUntil.getTime() <= Date.now()
        )
          throw pending();
        const changed = await tx.order.updateMany({
          where: {
            id: row.orderId,
            status: "PENDING",
            checkoutMode: "DEMO_NO_PAYMENT",
            version: row.expectedVersion,
          },
          data: { status: "CANCELLED", version: { increment: 1 } },
        });
        if (changed.count !== 1) throw pending();
        const response = orderReply(
          await tx.order.findUniqueOrThrow({
            where: { id: row.orderId },
            include: { items: true },
          }),
        );
        await tx.orderStatusChange.create({
          data: {
            orderId: row.orderId,
            actorId: row.actorId,
            actorRole: row.actorRole,
            keyHash: row.keyHash,
            intentHash: row.intentHash,
            previousStatus: "PENDING",
            status: "CANCELLED",
            expectedVersion: row.expectedVersion,
            version: row.expectedVersion + 1,
            requestId: row.requestId,
            response: receiptBody(response),
          },
        });
        await tx.orderCancellation.update({
          where: { orderId: row.orderId },
          data: { completedAt: new Date(), leaseToken: null, leaseUntil: null },
        });
        return { data: response };
      });
    } catch (cause) {
      // A remote credit may have committed even when its reply/local commit failed.
      // Keep the durable command and retry the same identity; never undo by guessing.
      try {
        await this.prisma.orderCancellation.updateMany({
          where: { orderId: row.orderId, completedAt: null, leaseToken: token },
          data: {
            leaseToken: null,
            leaseUntil: null,
            failures: Math.min(row.failures + 1, 1_000_000),
            nextRetryAt: new Date(
              Date.now() +
                Math.min(60_000, 1000 * 2 ** Math.min(row.failures, 6)),
            ),
          },
        });
      } catch (retryError) {
        // The original lease eventually expires even if retry bookkeeping fails.
        throw pending(
          new AggregateError(
            [cause, retryError],
            "order_cancellation_retry_record_failed",
          ),
        );
      }
      throw pending(cause);
    }
  }

  async recover() {
    const now = new Date();
    const rows = await this.prisma.orderCancellation.findMany({
      where: {
        completedAt: null,
        nextRetryAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: "asc" }, { orderId: "asc" }],
      take: 5,
    });
    const failures: unknown[] = [];
    for (const row of rows) {
      try {
        await this.drive(row);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length)
      throw pending(
        new AggregateError(failures, "order_cancellations_recovery_failed"),
      );
  }
}
