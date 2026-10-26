import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  OrderStatus,
  Prisma,
  type OrderStatusChange,
} from "../../prisma/generated/client";
import type { PrismaService } from "../prisma.service";
import { adminOrderId } from "./order-admin-read";
import { orderReply, stableFacts } from "./checkout-contract";
import { checkoutHash, orderSnapshot, receiptBody } from "./checkout-receipt";
import { ACTIVE_DEMO_PAYMENTS } from "./demo-payment-contract";

export interface OrderStatusCommand {
  status: string;
  expectedVersion?: number;
}
export interface OrderStatusActor {
  userId?: string | null;
  role?: string;
  requestId?: string;
}

export function orderStatusIntent(
  id: string,
  input: OrderStatusCommand,
  key: unknown,
  actor: OrderStatusActor,
) {
  if (!actor?.userId) throw new UnauthorizedException("missing_user_id");
  if (actor.role !== "admin" && actor.role !== "root-admin")
    throw new ForbiddenException("order_status_actor_forbidden");
  const actorId = adminOrderId(actor.userId);
  const orderId = adminOrderId(id);
  if (
    !input ||
    !Object.values(OrderStatus).includes(input.status as OrderStatus)
  )
    throw new BadRequestException("invalid_order_status");
  const version = input.expectedVersion;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1 ||
    version >= 2147483647
  )
    throw new BadRequestException("order_expected_version_invalid");
  if (
    typeof key !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(key)
  )
    throw new BadRequestException("order_status_key_invalid");
  const requestId = actor.requestId ?? "";
  if (
    typeof requestId !== "string" ||
    requestId.length > 128 ||
    /[^\x20-\x7e]/.test(requestId)
  )
    throw new BadRequestException("order_request_id_invalid");
  const status = input.status as OrderStatus;
  return {
    orderId,
    actorId,
    actorRole: actor.role,
    requestId,
    status,
    expectedVersion: version,
    keyHash: checkoutHash(key),
    intentHash: checkoutHash(
      stableFacts({
        orderId,
        status,
        expectedVersion: version,
        actorRole: actor.role,
      }),
    ),
  };
}

export type OrderStatusIntent = ReturnType<typeof orderStatusIntent>;

export function statusChangeReplay(
  previous: OrderStatusChange,
  intent: OrderStatusIntent,
) {
  if (
    previous.intentHash !== intent.intentHash ||
    previous.orderId !== intent.orderId
  )
    throw new ConflictException("order_status_idempotency_conflict");
  try {
    const response = orderSnapshot(previous.response);
    if (
      response.id !== previous.orderId ||
      response.status !== previous.status ||
      response.version !== previous.version
    )
      throw new Error("order_status_receipt_mismatch");
    return { data: response };
  } catch (cause) {
    throw new ServiceUnavailableException("order_status_receipt_invalid", {
      cause,
    });
  }
}

export async function lockStatusKey(
  tx: Prisma.TransactionClient,
  intent: OrderStatusIntent,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nebula-order-status:${intent.actorId}:${intent.keyHash}`}, 0))::text`;
  const previous = await tx.orderStatusChange.findUnique({
    where: {
      actorId_keyHash: { actorId: intent.actorId, keyHash: intent.keyHash },
    },
  });
  return previous ? statusChangeReplay(previous, intent) : undefined;
}

export async function orderStatusTransaction<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2028", "P2034"].includes(error.code)
    )
      throw new ServiceUnavailableException("order_status_busy", {
        cause: error,
      });
    throw error;
  }
}

export async function applyOrderStatus(
  prisma: PrismaService,
  id: string,
  input: OrderStatusCommand,
  key: unknown,
  actor: OrderStatusActor,
) {
  const intent = orderStatusIntent(id, input, key, actor);
  return orderStatusTransaction(prisma, async (tx) => {
    const replay = await lockStatusKey(tx, intent);
    if (replay) return replay;
    const usedKey = await tx.orderCancellation.findUnique({
      where: {
        actorId_keyHash: {
          actorId: intent.actorId,
          keyHash: intent.keyHash,
        },
      },
    });
    if (usedKey)
      throw new ConflictException("order_status_idempotency_conflict");
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${intent.orderId}::uuid FOR UPDATE`;
    const current = await tx.order.findUnique({
      where: { id: intent.orderId },
      include: {
        items: true,
        checkoutAttempt: { select: { state: true } },
      },
    });
    if (!current) throw new NotFoundException("order_not_found");
    if (
      await tx.demoPaymentAttempt.findFirst({
        where: {
          orderId: current.id,
          state: { in: [...ACTIVE_DEMO_PAYMENTS] },
        },
      })
    )
      throw new ConflictException("demo_payment_in_progress");
    if (
      current.status === "PENDING" &&
      (await tx.demoPaymentAttempt.count({ where: { orderId: current.id } }))
    )
      throw new ConflictException("demo_payment_retry_required");
    if (
      await tx.orderCancellation.findUnique({
        where: { orderId: intent.orderId },
      })
    )
      throw new ConflictException("order_cancellation_in_progress");
    if (
      current.checkoutAttempt &&
      current.checkoutAttempt.state !== "COMPLETED"
    )
      throw new ConflictException("checkout_in_progress");
    if (current.version !== intent.expectedVersion)
      throw new ConflictException("order_version_conflict");
    // Payment outcomes and unpaid cancellation require their backed operations.
    // This endpoint only marks manual demo paid/fulfilled states.
    if (
      current.checkoutMode !== "DEMO_NO_PAYMENT" ||
      !(
        (current.status === "PENDING" && intent.status === "PAID") ||
        (current.status === "PAID" && intent.status === "FULFILLED")
      )
    )
      throw new ConflictException("order_transition_not_permitted");
    const changed = await tx.order.updateMany({
      where: {
        id: intent.orderId,
        version: intent.expectedVersion,
        status: current.status,
      },
      data: { status: intent.status, version: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new ConflictException("order_version_conflict");
    const response = orderReply(
      await tx.order.findUniqueOrThrow({
        where: { id: intent.orderId },
        include: { items: true },
      }),
    );
    await tx.orderStatusChange.create({
      data: {
        ...intent,
        orderId: intent.orderId,
        previousStatus: current.status,
        version: intent.expectedVersion + 1,
        response: receiptBody(response),
      },
    });
    return { data: response };
  });
}
