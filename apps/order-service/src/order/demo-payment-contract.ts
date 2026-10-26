import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { CheckoutStockFacts } from "@nebula/clients";
import type {
  DemoPaymentAttempt,
  DemoPaymentCommand,
  Prisma,
} from "../../prisma/generated/client";
import { adminOrderId } from "./order-admin-read";
import { cartQuote, checkCartStock, type CartProduct } from "./cart-contract";
import { orderReply, stableFacts, type StoredOrder } from "./checkout-contract";
import { checkoutHash, orderSnapshot, receiptBody } from "./checkout-receipt";
import type { OrderStatusActor } from "./order-status";

export const ACTIVE_DEMO_PAYMENTS = [
  "PREPARING",
  "PROCESSING",
  "RESOLVING",
] as const;
export const DEMO_OUTCOMES = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "UNKNOWN",
] as const;
export type DemoOutcome = (typeof DEMO_OUTCOMES)[number];
export interface DemoStartInput {
  expectedVersion?: number;
}
export interface DemoOutcomeInput extends DemoStartInput {
  attemptId: string;
  outcome: string;
}

export function demoCommand(
  kind: "START" | "OUTCOME",
  id: string,
  input: DemoStartInput | DemoOutcomeInput,
  key: unknown,
  actor: OrderStatusActor,
) {
  if (!actor?.userId) throw new UnauthorizedException("missing_user_id");
  const actorRole = actor.role;
  if (
    !actorRole ||
    (kind === "START"
      ? actorRole !== "user"
      : actorRole !== "admin" && actorRole !== "root-admin")
  )
    throw new ForbiddenException("demo_payment_actor_forbidden");
  const actorId = adminOrderId(actor.userId);
  const orderId = adminOrderId(id);
  const expectedVersion = input?.expectedVersion;
  if (
    !Number.isInteger(expectedVersion) ||
    typeof expectedVersion !== "number" ||
    expectedVersion < 1 ||
    expectedVersion >= 2147483647
  )
    throw new BadRequestException("order_expected_version_invalid");
  // Starting processing must leave capacity for one confirmed resolution.
  if (kind === "START" && expectedVersion >= 2147483646)
    throw new BadRequestException("demo_payment_version_capacity");
  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(key)
  )
    throw new BadRequestException("demo_payment_key_invalid");
  const requestId = actor.requestId ?? "";
  if (
    typeof requestId !== "string" ||
    requestId.length > 128 ||
    /[^\x20-\x7e]/.test(requestId)
  )
    throw new BadRequestException("order_request_id_invalid");
  let attemptId: string | undefined;
  let outcome: DemoOutcome | undefined;
  if (kind === "OUTCOME") {
    const result = input as DemoOutcomeInput;
    attemptId = adminOrderId(result.attemptId);
    if (!DEMO_OUTCOMES.includes(result.outcome as DemoOutcome))
      throw new BadRequestException("demo_payment_outcome_invalid");
    outcome = result.outcome as DemoOutcome;
  }
  return {
    kind,
    orderId,
    attemptId,
    outcome,
    actorId,
    actorRole,
    expectedVersion,
    requestId,
    keyHash: checkoutHash(key),
    intentHash: checkoutHash(
      stableFacts({
        kind,
        orderId,
        attemptId,
        outcome,
        actorRole: actor.role,
        expectedVersion,
      }),
    ),
  };
}
export type DemoCommandIntent = ReturnType<typeof demoCommand>;

export function demoReply(order: StoredOrder, attempt: DemoPaymentAttempt) {
  return {
    data: {
      order: orderReply(order),
      attempt: {
        id: attempt.id,
        orderId: attempt.orderId,
        state: attempt.state,
        mode: "DEMO" as const,
        amount: order.total.toFixed(2),
        currency: order.currency,
        failureCode: attempt.abortRequested ? "SELECTION_CHANGED" : "",
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
      },
    },
  };
}
export function demoBody(
  reply: ReturnType<typeof demoReply>,
): Prisma.InputJsonObject {
  return { order: receiptBody(reply.data.order), attempt: reply.data.attempt };
}
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export function demoReplay(
  command: DemoPaymentCommand,
  intent: DemoCommandIntent,
) {
  if (
    command.intentHash !== intent.intentHash ||
    command.orderId !== intent.orderId
  )
    throw new ConflictException("demo_payment_idempotency_conflict");
  if (!command.response) return undefined;
  try {
    const saved = command.response;
    if (!record(saved) || !record(saved.attempt))
      throw new Error("invalid_payment_reply");
    const order = orderSnapshot(saved.order);
    const a = saved.attempt;
    if (
      order.id !== command.orderId ||
      a.id !== command.attemptId ||
      a.orderId !== command.orderId ||
      a.mode !== "DEMO" ||
      a.amount !== order.total ||
      a.currency !== order.currency ||
      typeof a.createdAt !== "string" ||
      new Date(a.createdAt).toISOString() !== a.createdAt ||
      typeof a.updatedAt !== "string" ||
      new Date(a.updatedAt).toISOString() !== a.updatedAt ||
      (a.failureCode !== "" && a.failureCode !== "SELECTION_CHANGED")
    )
      throw new Error("invalid_payment_reply");
    const state =
      command.kind === "START"
        ? a.failureCode
          ? "FAILED"
          : "PROCESSING"
        : command.outcome === "UNKNOWN"
          ? "PROCESSING"
          : command.outcome;
    const status =
      state === "PROCESSING"
        ? "PAYMENT_PROCESSING"
        : state === "SUCCEEDED"
          ? "PAID"
          : "PENDING";
    if (
      a.state !== state ||
      order.status !== status ||
      order.version !==
        command.expectedVersion + (command.outcome === "UNKNOWN" ? 0 : 1)
    )
      throw new Error("invalid_payment_reply");
    return {
      data: {
        order,
        attempt: {
          id: command.attemptId,
          orderId: command.orderId,
          state: state as DemoPaymentAttempt["state"],
          mode: "DEMO" as const,
          amount: order.total,
          currency: order.currency,
          failureCode: a.failureCode,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        },
      },
    };
  } catch (cause) {
    throw new ServiceUnavailableException("demo_payment_receipt_invalid", {
      cause,
    });
  }
}

// Retry always uses current availability/versions but never changes the Order's
// saved commercial intent. The first attempt already owns Checkout's deduction.
export function demoRetryStock(
  order: StoredOrder,
  products: ReadonlyMap<string, CartProduct>,
  currency: string,
): CheckoutStockFacts {
  if (
    order.currency !== currency ||
    !order.items.length ||
    order.items.length > 100
  )
    throw new ConflictException("demo_payment_selection_changed");
  const lines: CheckoutStockFacts["lines"] = [];
  for (const item of order.items) {
    const product = products.get(item.productId);
    if (!product) throw new ConflictException("demo_payment_selection_changed");
    const quote = cartQuote(
      product,
      item.productId,
      item.variantId ?? undefined,
      currency,
    );
    checkCartStock(quote, item.quantity);
    if (
      !Number.isInteger(product.version) ||
      typeof product.version !== "number" ||
      product.version < 1 ||
      product.version >= 2147483647
    )
      throw new ServiceUnavailableException("product_version_contract_invalid");
    if (
      !quote.unitPrice.equals(item.unitPrice) ||
      quote.sku !== item.sku ||
      stableFacts(quote.selectedOptions) !== stableFacts(item.selectedOptions)
    )
      throw new ConflictException("demo_payment_selection_changed");
    lines.push({
      productId: item.productId,
      variantId: item.variantId ?? "",
      quantity: item.quantity,
      expectedVersion: product.version,
      sku: quote.sku,
      unitPrice: quote.unitPrice.toFixed(2),
      selectedOptions: quote.selectedOptions,
    });
  }
  return { currency, lines };
}
