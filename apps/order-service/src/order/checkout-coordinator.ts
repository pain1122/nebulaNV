import { BadRequestException, ConflictException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { checkoutStockHash, type CheckoutStockFacts } from "@nebula/clients";
import type { VerifiedServiceDownstreamContext } from "@nebula/grpc-auth";
import {
  Prisma,
  type CheckoutAttempt,
  type CheckoutReceipt,
} from "../../prisma/generated/client";
import { capturedCart, orderReply } from "./checkout-contract";
import {
  CHECKOUT_REPLAY_MS,
  checkoutHash,
  receiptBody,
  receiptReplay,
} from "./checkout-receipt";
import {
  ACTIVE_CHECKOUT_STATES,
  CHECKOUT_LEASE_MS,
  CHECKOUT_WAIT_MS,
  attemptPayload,
  checkoutPayloadBody,
  checkoutPending,
  type CheckoutPayload,
} from "./checkout-attempt-contract";
import { PrismaService } from "../prisma.service";

type Identity = { intentId: string; payloadHash: string };
type StockReply = Identity & { state: string };
type Context = VerifiedServiceDownstreamContext | undefined;
export interface CheckoutStockPort {
  reserve: (
    request: Identity & CheckoutStockFacts,
    context: Context,
  ) => Promise<StockReply>;
  finalize: (request: Identity, context: Context) => Promise<StockReply>;
  cancel: (request: Identity, context: Context) => Promise<StockReply>;
}
export interface PreparedCheckout {
  cartId: string;
  cartFingerprint: string;
  payload: CheckoutPayload;
}
type OwnerTransaction = <T>(
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) => Promise<T>;
const terminal = (row: CheckoutAttempt) =>
  row.state === "COMPLETED" || row.state === "CANCELLED";

export class CheckoutCoordinator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly owner: OwnerTransaction,
    private readonly stock: CheckoutStockPort,
  ) {}

  private validateIntent(row: CheckoutAttempt, intentHash: string) {
    if (row.intentHash !== intentHash)
      throw new ConflictException("checkout_idempotency_conflict");
  }
  private requireLease(
    row: CheckoutAttempt | null,
    token: string,
  ): asserts row is CheckoutAttempt {
    if (
      !row ||
      row.leaseToken !== token ||
      !row.leaseUntil ||
      row.leaseUntil.getTime() <= Date.now()
    )
      throw checkoutPending();
  }
  private validateStock(
    row: CheckoutAttempt,
    result: StockReply,
    state: string,
  ) {
    if (
      !result ||
      result.intentId !== row.id ||
      result.payloadHash !== row.stockHash ||
      result.state !== state
    )
      throw checkoutPending();
  }
  private identity(row: CheckoutAttempt): Identity {
    return { intentId: row.id, payloadHash: row.stockHash };
  }
  private async replay(row: CheckoutAttempt, intentHash: string) {
    this.validateIntent(row, intentHash);
    if (row.state === "CANCELLED")
      throw new ConflictException("checkout_attempt_cancelled");
    if (row.state !== "COMPLETED") throw checkoutPending();
    const receipt = await this.prisma.checkoutReceipt.findUnique({
      where: { userId_keyHash: { userId: row.userId, keyHash: row.keyHash } },
    });
    if (!receipt) throw checkoutPending();
    return { data: receiptReplay(receipt, row.userId, intentHash) };
  }

  async checkout(
    userId: string,
    keyHash: string,
    intentHash: string,
    prepare: () => Promise<PreparedCheckout>,
    context?: VerifiedServiceDownstreamContext,
  ) {
    const where = { userId_keyHash: { userId, keyHash } };
    const previous = await this.prisma.checkoutAttempt.findUnique({ where });
    if (previous) return this.existing(previous, intentHash, context);
    const legacy = await this.prisma.checkoutReceipt.findUnique({ where });
    if (legacy) return { data: receiptReplay(legacy, userId, intentHash) };
    const prepared = await prepare();
    const payload = checkoutPayloadBody(prepared.payload);
    const started = await this.owner(
      userId,
      async (
        tx,
      ): Promise<
        | { attempt: CheckoutAttempt; fresh: boolean }
        | { receipt: CheckoutReceipt }
      > => {
        const repeated = await tx.checkoutAttempt.findUnique({ where });
        if (repeated) return { attempt: repeated, fresh: false };
        const receipt = await tx.checkoutReceipt.findUnique({ where });
        if (receipt) return { receipt };
        const active = await tx.checkoutAttempt.findFirst({
          where: { userId, state: { in: [...ACTIVE_CHECKOUT_STATES] } },
        });
        if (active) throw new ConflictException("checkout_in_progress");
        const cart = await tx.cart.findUnique({
          where: { userId },
          include: { items: true },
        });
        if (
          !cart ||
          !cart.items.length ||
          (cart.expiresAt && cart.expiresAt.getTime() <= Date.now())
        )
          throw new BadRequestException("cart_empty");
        if (
          cart.id !== prepared.cartId ||
          checkoutHash(capturedCart(cart)) !== prepared.cartFingerprint
        )
          throw new ConflictException("checkout_cart_changed");
        const now = new Date();
        const attempt = await tx.checkoutAttempt.create({
          data: {
            id: randomUUID(),
            userId,
            keyHash,
            intentHash,
            cartId: cart.id,
            cartFingerprint: prepared.cartFingerprint,
            stockHash: checkoutStockHash(prepared.payload.stock),
            payload,
            leaseToken: randomUUID(),
            leaseUntil: new Date(now.getTime() + CHECKOUT_LEASE_MS),
            nextRetryAt: now,
          },
        });
        return { attempt, fresh: true };
      },
    );
    if ("receipt" in started)
      return { data: receiptReplay(started.receipt, userId, intentHash) };
    this.validateIntent(started.attempt, intentHash);
    return started.fresh
      ? this.newAttempt(started.attempt, context)
      : this.existing(started.attempt, intentHash, context);
  }

  private async existing(
    initial: CheckoutAttempt,
    intentHash: string,
    context: Context,
  ) {
    this.validateIntent(initial, intentHash);
    const deadline = Date.now() + CHECKOUT_WAIT_MS;
    let row = initial;
    for (;;) {
      if (terminal(row)) return this.replay(row, intentHash);
      const claimed = await this.claim(row);
      if (claimed) {
        await this.recoverClaim(claimed, context);
        const after = await this.prisma.checkoutAttempt.findUnique({
          where: { id: row.id },
        });
        if (!after) throw checkoutPending();
        return this.replay(after, intentHash);
      }
      if (Date.now() >= deadline) throw checkoutPending();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      const current = await this.prisma.checkoutAttempt.findUnique({
        where: { id: row.id },
      });
      if (!current) throw checkoutPending();
      row = current;
    }
  }

  private async newAttempt(row: CheckoutAttempt, context: Context) {
    const token = row.leaseToken!;
    try {
      const payload = attemptPayload(row);
      this.validateStock(
        row,
        await this.stock.reserve(
          { ...this.identity(row), ...payload.stock },
          context,
        ),
        "HELD",
      );
      row = await this.owner(row.userId, async (tx) => {
        const current = await tx.checkoutAttempt.findUnique({
          where: { id: row.id },
        });
        this.requireLease(current, token);
        if (current.state !== "PREPARED") throw checkoutPending();
        const cart = await tx.cart.findUnique({
          where: { userId: row.userId },
          include: { items: true },
        });
        if (
          !cart ||
          !cart.items.length ||
          (cart.expiresAt && cart.expiresAt.getTime() <= Date.now())
        )
          throw new BadRequestException("cart_empty");
        if (
          cart.id !== current.cartId ||
          checkoutHash(capturedCart(cart)) !== current.cartFingerprint
        )
          throw new ConflictException("checkout_cart_changed");
        const order = await tx.order.create({
          data: {
            id: row.id,
            orderNumber: payload.orderNumber,
            userId: row.userId,
            status: "PENDING",
            checkoutMode: "DEMO_NO_PAYMENT",
            currency: payload.currency,
            subtotal: payload.subtotal,
            total: payload.total,
            discountTotal: "0.00",
            taxTotal: "0.00",
            meta: payload.note ? { note: payload.note } : undefined,
            items: { create: payload.items },
          },
          include: { items: true },
        });
        const now = new Date();
        await tx.checkoutReceipt.create({
          data: {
            userId: row.userId,
            keyHash: row.keyHash,
            intentHash: row.intentHash,
            cartFingerprint: row.cartFingerprint,
            orderId: order.id,
            response: receiptBody(orderReply(order)),
            createdAt: now,
            replayUntil: new Date(now.getTime() + CHECKOUT_REPLAY_MS),
          },
        });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.delete({ where: { id: cart.id } });
        return tx.checkoutAttempt.update({
          where: { id: row.id },
          data: { state: "ORDER_COMMITTED", orderId: order.id },
        });
      });
    } catch (original) {
      // The transaction may have committed before its response was lost. Read
      // the durable decision first; an unavailable DB must leave stock alone.
      const decision = await this.owner(row.userId, async (tx) => {
        const current = await tx.checkoutAttempt.findUnique({
          where: { id: row.id },
        });
        if (current?.state === "COMPLETED") return current;
        this.requireLease(current, token);
        if (current.state === "PREPARED")
          return tx.checkoutAttempt.update({
            where: { id: row.id },
            data: { state: "CANCELLING" },
          });
        return current;
      }).catch((databaseFailure: unknown) => {
        throw checkoutPending(
          new AggregateError(
            [original, databaseFailure],
            "checkout_commit_outcome_unavailable",
          ),
        );
      });
      if (decision.state === "ORDER_COMMITTED") {
        await this.finish(decision, context);
        const done = await this.prisma.checkoutAttempt.findUniqueOrThrow({
          where: { id: row.id },
        });
        return this.replay(done, row.intentHash);
      }
      if (decision.state === "COMPLETED")
        return this.replay(decision, row.intentHash);
      if (decision.state !== "CANCELLING") throw checkoutPending();
      try {
        await this.finish(decision, context);
      } catch (recovery) {
        throw checkoutPending(
          new AggregateError(
            [original, recovery],
            "checkout_cancellation_pending",
          ),
        );
      }
      throw original;
    }
    await this.finish(row, context);
    const completed = await this.prisma.checkoutAttempt.findUniqueOrThrow({
      where: { id: row.id },
    });
    return this.replay(completed, row.intentHash);
  }

  private async finish(row: CheckoutAttempt, context: Context) {
    const token = row.leaseToken!;
    try {
      const committed = row.state === "ORDER_COMMITTED";
      if (!committed && row.state !== "CANCELLING") throw checkoutPending();
      const result = committed
        ? await this.stock.finalize(this.identity(row), context)
        : await this.stock.cancel(this.identity(row), context);
      this.validateStock(row, result, committed ? "FINALIZED" : "CANCELLED");
      await this.owner(row.userId, async (tx) => {
        const current = await tx.checkoutAttempt.findUnique({
          where: { id: row.id },
        });
        this.requireLease(current, token);
        if (current.state !== row.state) throw checkoutPending();
        if (committed) {
          const now = new Date();
          await tx.checkoutReceipt.update({
            where: { orderId: row.id },
            data: {
              createdAt: now,
              replayUntil: new Date(now.getTime() + CHECKOUT_REPLAY_MS),
            },
          });
        }
        await tx.checkoutAttempt.update({
          where: { id: row.id },
          data: {
            state: committed ? "COMPLETED" : "CANCELLED",
            payload: Prisma.DbNull,
            leaseToken: null,
            leaseUntil: null,
          },
        });
      });
    } catch (error) {
      try {
        await this.releaseForRetry(row, token);
      } catch (databaseFailure) {
        throw checkoutPending(
          new AggregateError(
            [error, databaseFailure],
            "checkout_recovery_persistence_unavailable",
          ),
        );
      }
      throw checkoutPending(error);
    }
  }
  private async releaseForRetry(row: CheckoutAttempt, token: string) {
    await this.owner(row.userId, async (tx) => {
      const current = await tx.checkoutAttempt.findUnique({
        where: { id: row.id },
      });
      if (!current || terminal(current) || current.leaseToken !== token) return;
      await tx.checkoutAttempt.update({
        where: { id: row.id },
        data: {
          leaseToken: null,
          leaseUntil: null,
          failures: Math.min(current.failures + 1, 2147483647),
          nextRetryAt: new Date(
            Date.now() +
              Math.min(60_000, 5000 * 2 ** Math.min(current.failures, 4)),
          ),
        },
      });
    });
  }

  private claim(candidate: CheckoutAttempt) {
    return this.owner(candidate.userId, async (tx) => {
      const row = await tx.checkoutAttempt.findUnique({
        where: { id: candidate.id },
      });
      if (
        !row ||
        terminal(row) ||
        row.nextRetryAt.getTime() > Date.now() ||
        (row.leaseUntil && row.leaseUntil.getTime() > Date.now())
      )
        return null;
      return tx.checkoutAttempt.update({
        where: { id: row.id },
        data: {
          state: row.state === "PREPARED" ? "CANCELLING" : row.state,
          leaseToken: randomUUID(),
          leaseUntil: new Date(Date.now() + CHECKOUT_LEASE_MS),
        },
      });
    });
  }
  private recoverClaim(row: CheckoutAttempt, context: Context) {
    return this.finish(row, context);
  }

  async recover() {
    const now = new Date();
    const candidates = await this.prisma.checkoutAttempt.findMany({
      where: {
        state: { in: [...ACTIVE_CHECKOUT_STATES] },
        nextRetryAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
      },
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
      take: 5,
    });
    const errors: unknown[] = [];
    for (const candidate of candidates) {
      try {
        const claimed = await this.claim(candidate);
        if (claimed) await this.recoverClaim(claimed, undefined);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length)
      throw new AggregateError(errors, "checkout_recovery_retry_pending");
  }
}
