import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { checkoutStockHash, type CheckoutStockFacts } from "@nebula/clients";
import type { VerifiedServiceDownstreamContext } from "@nebula/grpc-auth";
import {
  Prisma,
  type DemoPaymentAttempt,
  type DemoPaymentCommand,
} from "../../prisma/generated/client";
import type { PrismaService } from "../prisma.service";
import type { StoredOrder } from "./checkout-contract";
import { CHECKOUT_LEASE_MS } from "./checkout-attempt-contract";
import { orderStatusTransaction, type OrderStatusActor } from "./order-status";
import {
  ACTIVE_DEMO_PAYMENTS,
  demoBody,
  demoCommand,
  demoReply,
  demoReplay,
  type DemoCommandIntent,
  type DemoStartInput,
  type DemoOutcomeInput,
} from "./demo-payment-contract";

type Identity = { intentId: string; payloadHash: string };
type StockReply = Identity & { state: string };
type Context = VerifiedServiceDownstreamContext | undefined;
export interface DemoPaymentStock {
  quote: (order: StoredOrder, context: Context) => Promise<CheckoutStockFacts>;
  reserve: (
    request: Identity & CheckoutStockFacts,
    context: Context,
  ) => Promise<StockReply>;
  finalize: (request: Identity, context: Context) => Promise<StockReply>;
  cancel: (request: Identity, context: Context) => Promise<StockReply>;
  restore: (request: Identity, context: Context) => Promise<StockReply>;
}
const pending = (cause?: unknown) =>
  new ServiceUnavailableException("demo_payment_recovery_pending", { cause });

export class DemoPaymentCoordinator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: DemoPaymentStock,
  ) {}

  private validateOrder(
    order: StoredOrder & {
      checkoutAttempt: {
        id: string;
        state: string;
        stockHash: string;
        orderId: string | null;
        userId: string;
      } | null;
    },
    intent: DemoCommandIntent,
  ) {
    if (order.version !== intent.expectedVersion)
      throw new ConflictException("order_version_conflict");
    if (order.status !== "PENDING" || order.checkoutMode !== "DEMO_NO_PAYMENT")
      throw new ConflictException("demo_payment_start_not_permitted");
    const original = order.checkoutAttempt;
    if (
      !original ||
      original.state !== "COMPLETED" ||
      original.orderId !== order.id ||
      original.userId !== order.userId ||
      !/^[0-9a-f]{64}$/.test(original.stockHash)
    )
      throw new ConflictException("demo_payment_checkout_identity_missing");
    return original;
  }
  private async key(tx: Prisma.TransactionClient, intent: DemoCommandIntent) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nebula-demo-payment:${intent.actorId}:${intent.keyHash}`}, 0))::text`;
    const command = await tx.demoPaymentCommand.findUnique({
      where: {
        actorId_keyHash: { actorId: intent.actorId, keyHash: intent.keyHash },
      },
    });
    if (command) demoReplay(command, intent); // Validate intent even before a reply exists.
    return command;
  }
  private async previous(intent: DemoCommandIntent, context: Context) {
    const command = await this.prisma.demoPaymentCommand.findUnique({
      where: {
        actorId_keyHash: { actorId: intent.actorId, keyHash: intent.keyHash },
      },
    });
    return command ? this.existing(command, intent, context) : undefined;
  }
  private async existing(
    command: DemoPaymentCommand,
    intent: DemoCommandIntent,
    context: Context,
  ) {
    const replay = demoReplay(command, intent);
    if (replay) return replay;
    const attempt = await this.prisma.demoPaymentAttempt.findUnique({
      where: { id: command.attemptId },
    });
    if (!attempt) throw pending();
    return this.drive(attempt, context);
  }
  private createCommand(
    tx: Prisma.TransactionClient,
    intent: DemoCommandIntent,
    attemptId: string,
  ) {
    return tx.demoPaymentCommand.create({
      data: {
        orderId: intent.orderId,
        attemptId,
        kind: intent.kind,
        outcome: intent.outcome ?? null,
        actorId: intent.actorId,
        actorRole: intent.actorRole,
        keyHash: intent.keyHash,
        intentHash: intent.intentHash,
        expectedVersion: intent.expectedVersion,
        requestId: intent.requestId,
      },
    });
  }

  async start(
    id: string,
    input: DemoStartInput,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const intent = demoCommand("START", id, input, key, actor);
    const previous = await this.previous(intent, context);
    if (previous) return previous;
    // Quote outside the Order transaction. Recheck owner/version/active work
    // under its row lock before any durable reservation can be issued.
    const selection = await this.prisma.order.findFirst({
      where: { id: intent.orderId, userId: intent.actorId },
      include: { items: true, checkoutAttempt: true },
    });
    let first: boolean;
    let facts: CheckoutStockFacts | undefined;
    try {
      if (!selection) throw new NotFoundException("order_not_found");
      this.validateOrder(selection, intent);
      first =
        (await this.prisma.demoPaymentAttempt.count({
          where: { orderId: intent.orderId },
        })) === 0;
      if (!first) facts = await this.stock.quote(selection, context);
    } catch (cause) {
      const raced = await this.previous(intent, context);
      if (raced) return raced;
      throw cause;
    }
    // Keep the captured commercial rows immutable; only current owner/version
    // decides whether the already prepared quote may become a reservation.
    const started = await orderStatusTransaction(this.prisma, async (tx) => {
      const command = await this.key(tx, intent);
      if (command) return { command };
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${intent.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: intent.orderId, userId: intent.actorId },
        include: { items: true, checkoutAttempt: true },
      });
      if (!order) throw new NotFoundException("order_not_found");
      const original = this.validateOrder(order, intent);
      if (
        await tx.orderCancellation.findUnique({ where: { orderId: order.id } })
      )
        throw new ConflictException("order_cancellation_in_progress");
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
        ((await tx.demoPaymentAttempt.count({
          where: { orderId: order.id },
        })) ===
          0) !==
        first
      )
        throw new ConflictException("order_version_conflict");
      const attemptId = randomUUID();
      const attempt = await tx.demoPaymentAttempt.create({
        data: {
          id: attemptId,
          orderId: order.id,
          stockSource: first ? "FINALIZED_CHECKOUT" : "RETRY_HOLD",
          stockIntentId: first ? original.id : attemptId,
          stockHash: first ? original.stockHash : checkoutStockHash(facts!),
          stockFacts: first
            ? Prisma.DbNull
            : (JSON.parse(JSON.stringify(facts)) as Prisma.InputJsonObject),
        },
      });
      await this.createCommand(tx, intent, attempt.id);
      return { attempt };
    });
    return started.command
      ? this.existing(started.command, intent, context)
      : this.drive(started.attempt, context);
  }

  async resolve(
    id: string,
    input: DemoOutcomeInput,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const intent = demoCommand("OUTCOME", id, input, key, actor);
    const started = await orderStatusTransaction(this.prisma, async (tx) => {
      const previous = await this.key(tx, intent);
      if (previous) return { command: previous };
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${intent.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: intent.orderId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException("order_not_found");
      const attempt = await tx.demoPaymentAttempt.findUnique({
        where: { id: intent.attemptId },
      });
      if (!attempt || attempt.orderId !== order.id)
        throw new NotFoundException("demo_payment_not_found");
      if (order.version !== intent.expectedVersion)
        throw new ConflictException("order_version_conflict");
      if (
        order.status !== "PAYMENT_PROCESSING" ||
        order.checkoutMode !== "DEMO_NO_PAYMENT" ||
        attempt.state !== "PROCESSING"
      )
        throw new ConflictException("demo_payment_outcome_not_permitted");
      const command = await this.createCommand(tx, intent, attempt.id);
      if (intent.outcome === "UNKNOWN") {
        const response = demoReply(order, attempt);
        await tx.demoPaymentCommand.update({
          where: { id: command.id },
          data: { response: demoBody(response) },
        });
        return { reply: response };
      }
      return {
        attempt: await tx.demoPaymentAttempt.update({
          where: { id: attempt.id },
          data: { state: "RESOLVING", nextRetryAt: new Date(), failures: 0 },
        }),
      };
    });
    if (started.reply) return started.reply;
    return started.command
      ? this.existing(started.command, intent, context)
      : this.drive(started.attempt, context);
  }

  private validateStock(
    row: DemoPaymentAttempt,
    response: StockReply,
    state: string,
  ) {
    if (
      !response ||
      response.intentId !== row.stockIntentId ||
      response.payloadHash !== row.stockHash ||
      response.state !== state
    )
      throw pending();
  }
  private async finish(
    row: DemoPaymentAttempt,
    command: DemoPaymentCommand,
    token: string,
    state: "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED",
  ) {
    return orderStatusTransaction(this.prisma, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${row.orderId}::uuid FOR UPDATE`;
      const claimed = await tx.demoPaymentAttempt.updateMany({
        where: {
          id: row.id,
          state: row.state,
          leaseToken: token,
          leaseUntil: { gt: new Date() },
        },
        data: { state, leaseToken: null, leaseUntil: null },
      });
      if (claimed.count !== 1) throw pending();
      const changed = await tx.order.updateMany({
        where: {
          id: row.orderId,
          version: command.expectedVersion,
          checkoutMode: "DEMO_NO_PAYMENT",
          status: command.kind === "START" ? "PENDING" : "PAYMENT_PROCESSING",
        },
        data: {
          version: { increment: 1 },
          status:
            state === "PROCESSING"
              ? "PAYMENT_PROCESSING"
              : state === "SUCCEEDED"
                ? "PAID"
                : "PENDING",
        },
      });
      if (changed.count !== 1) throw pending();
      const order = await tx.order.findUniqueOrThrow({
        where: { id: row.orderId },
        include: { items: true },
      });
      const attempt = await tx.demoPaymentAttempt.findUniqueOrThrow({
        where: { id: row.id },
      });
      const response = demoReply(order, attempt);
      await tx.demoPaymentCommand.update({
        where: { id: command.id },
        data: { response: demoBody(response) },
      });
      return response;
    });
  }
  private async abortReservation(
    row: DemoPaymentAttempt,
    command: DemoPaymentCommand,
    token: string,
    context: Context,
  ) {
    const updated = await this.prisma.demoPaymentAttempt.updateMany({
      where: { id: row.id, state: "PREPARING", leaseToken: token },
      data: { abortRequested: true },
    });
    if (updated.count !== 1) throw pending();
    this.validateStock(
      row,
      await this.stock.cancel(
        { intentId: row.stockIntentId, payloadHash: row.stockHash },
        context,
      ),
      "CANCELLED",
    );
    return this.finish(row, command, token, "FAILED");
  }
  private async drive(
    row: DemoPaymentAttempt,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const now = new Date(),
      token = randomUUID();
    const claimed = await this.prisma.demoPaymentAttempt.updateMany({
      where: {
        id: row.id,
        state: { in: ["PREPARING", "RESOLVING"] },
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
      // The lease may have been acquired using an older read of the same row.
      row = await this.prisma.demoPaymentAttempt.findUniqueOrThrow({
        where: { id: row.id },
      });
      if (row.leaseToken !== token) throw pending();
      const command = await this.prisma.demoPaymentCommand.findFirst({
        where: { attemptId: row.id, response: { equals: Prisma.DbNull } },
      });
      if (!command) throw pending();
      const identity = {
        intentId: row.stockIntentId,
        payloadHash: row.stockHash,
      };
      if (row.state === "PREPARING") {
        if (command.kind !== "START") throw pending();
        if (row.stockSource === "RETRY_HOLD") {
          if (row.abortRequested)
            return await this.abortReservation(row, command, token, context);
          const facts = row.stockFacts as unknown as CheckoutStockFacts;
          if (!facts || checkoutStockHash(facts) !== row.stockHash)
            throw pending();
          let result: StockReply;
          try {
            result = await this.stock.reserve(
              { ...facts, ...identity },
              context,
            );
          } catch (error) {
            if (
              error instanceof ConflictException ||
              error instanceof NotFoundException
            )
              return await this.abortReservation(row, command, token, context);
            throw error;
          }
          if (result?.state === "CANCELLED") {
            this.validateStock(row, result, "CANCELLED");
            return await this.abortReservation(row, command, token, context);
          }
          this.validateStock(row, result, "HELD");
        }
        return await this.finish(row, command, token, "PROCESSING");
      }
      if (
        row.state !== "RESOLVING" ||
        command.kind !== "OUTCOME" ||
        !["SUCCEEDED", "FAILED", "CANCELLED"].includes(command.outcome ?? "")
      )
        throw pending();
      if (command.outcome === "SUCCEEDED") {
        if (row.stockSource === "RETRY_HOLD")
          this.validateStock(
            row,
            await this.stock.finalize(identity, context),
            "FINALIZED",
          );
      } else if (row.stockSource === "FINALIZED_CHECKOUT") {
        this.validateStock(
          row,
          await this.stock.restore(identity, context),
          "RESTORED",
        );
      } else
        this.validateStock(
          row,
          await this.stock.cancel(identity, context),
          "CANCELLED",
        );
      return await this.finish(
        row,
        command,
        token,
        command.outcome as "SUCCEEDED" | "FAILED" | "CANCELLED",
      );
    } catch (cause) {
      try {
        await this.prisma.demoPaymentAttempt.updateMany({
          where: {
            id: row.id,
            leaseToken: token,
            state: { in: ["PREPARING", "RESOLVING"] },
          },
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
        throw pending(
          new AggregateError(
            [cause, retryError],
            "demo_payment_retry_record_failed",
          ),
        );
      }
      throw pending(cause);
    }
  }
  async recover() {
    const now = new Date();
    const rows = await this.prisma.demoPaymentAttempt.findMany({
      where: {
        state: { in: ["PREPARING", "RESOLVING"] },
        nextRetryAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: "asc" }, { id: "asc" }],
      take: 5,
    });
    const errors: unknown[] = [];
    for (const row of rows) {
      try {
        await this.drive(row);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length)
      throw pending(
        new AggregateError(errors, "demo_payments_recovery_failed"),
      );
  }
}
