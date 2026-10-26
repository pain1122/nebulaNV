import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getOrder } from "@nebula/clients";
import { orderv1 } from "@nebula/protos";
import { validateIdempotencyKey } from "../contracts/idempotency";
import {
  ORDER_SERVICE,
  ORDER_SERVICE_TARGET,
  wrapGrpc,
} from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import { isUUID } from "class-validator";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import {
  GatewayOrderStatus,
  type GatewayCartAddDto,
  type GatewayCartDto,
  type GatewayCartItemDto,
  type GatewayCartUpdateDto,
  type GatewayCheckoutDto,
  type GatewayOrderDto,
  type GatewayOrderItemDto,
  type GatewayOrderListQueryDto,
  type GatewayAdminOrderListQueryDto,
  type GatewayOrderStatusUpdateDto,
  type GatewayDemoPaymentStartDto,
  type GatewayDemoPaymentOutcomeDto,
  type GatewayDemoPaymentReplyDto,
  type GatewayDemoPaymentAttemptDto,
} from "./order-api.dto";

function actorUserId(request: GatewayHttpRequest): string {
  const userId = request.user?.userId;
  if (!userId) throw new Error("gateway_verified_actor_state_incomplete");
  return userId;
}

function integer(value: number, name: string, minimum = 0): number {
  if (!Number.isInteger(value) || value < minimum || value > 2147483647) {
    throw new BadGatewayException(`order_response_${name}_invalid`);
  }
  return value;
}

function amount(value: string): string {
  if (!/^\d{1,16}\.\d{2}$/.test(value))
    throw new BadGatewayException("cart_response_amount_invalid");
  return value;
}

function cartItem(value: orderv1.CartItem): GatewayCartItemDto {
  if (!value.id || !value.productId || !value.name)
    throw new BadGatewayException("cart_item_response_invalid");
  return Object.freeze({
    id: value.id,
    productId: value.productId,
    sku: value.sku,
    name: value.name,
    quantity: integer(value.quantity, "cart_quantity", 1),
    unitPrice: amount(value.unitPrice),
    meta: value.meta,
    variantId: value.variantId,
    selectedOptions: Object.freeze({ ...value.selectedOptions }),
    lineTotal: amount(value.lineTotal),
  });
}

function cart(value: orderv1.Cart | undefined, userId: string): GatewayCartDto {
  if (!value?.id || value.userId !== userId || !Array.isArray(value.items)) {
    throw new BadGatewayException("cart_response_identity_invalid");
  }
  return Object.freeze({
    id: value.id,
    userId: value.userId,
    currency: value.currency,
    expiresAt: value.expiresAt,
    items: Object.freeze(value.items.map(cartItem)),
    subtotal: amount(value.subtotal),
    total: amount(value.total),
  });
}

function orderStatus(value: string): GatewayOrderStatus {
  if (
    !Object.values(GatewayOrderStatus).includes(value as GatewayOrderStatus)
  ) {
    throw new BadGatewayException("order_response_status_invalid");
  }
  return value as GatewayOrderStatus;
}

function orderItem(value: orderv1.OrderItem): GatewayOrderItemDto {
  if (!value.id || !value.productId || !value.name)
    throw new BadGatewayException("order_item_response_invalid");
  return Object.freeze({
    id: value.id,
    productId: value.productId,
    sku: value.sku,
    name: value.name,
    quantity: integer(value.quantity, "item_quantity", 1),
    unitPrice: amount(value.unitPrice),
    lineTotal: amount(value.lineTotal),
    meta: value.meta,
    variantId: value.variantId,
    selectedOptions: Object.freeze({ ...value.selectedOptions }),
  });
}

function order(
  value: orderv1.Order | undefined,
  expectedUserId?: string,
  requireVersion = false,
): GatewayOrderDto {
  if (
    !value?.id ||
    !value.orderNumber ||
    !value.userId ||
    value.checkoutMode !== "DEMO_NO_PAYMENT" ||
    !Array.isArray(value.items) ||
    (expectedUserId && value.userId !== expectedUserId)
  ) {
    throw new BadGatewayException("order_response_identity_invalid");
  }
  if (requireVersion && value.version === undefined)
    throw new BadGatewayException("order_response_version_missing");
  return Object.freeze({
    ...(value.version === undefined
      ? {}
      : { version: integer(value.version, "version", 1) }),
    id: value.id,
    orderNumber: value.orderNumber,
    userId: value.userId,
    status: orderStatus(value.status),
    currency: value.currency,
    checkoutMode: value.checkoutMode,
    subtotal: amount(value.subtotal),
    discountTotal: amount(value.discountTotal),
    taxTotal: amount(value.taxTotal),
    total: amount(value.total),
    shippingAddress: value.shippingAddress,
    billingAddress: value.billingAddress,
    meta: value.meta,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    items: Object.freeze(value.items.map(orderItem)),
  });
}

function demoPayment(
  value: orderv1.DemoPaymentReply | undefined,
  id: string,
  expectedVersion: number,
  userId?: string,
  attemptId?: string,
  outcome?: string,
): GatewayDemoPaymentReplyDto {
  const mapped = order(value?.order, userId, true);
  const a = value?.attempt;
  const validDate = (date: string) => {
    const parsed = new Date(date);
    return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === date;
  };
  if (
    !a ||
    !isUUID(a.id, "4") ||
    mapped.id !== id.toLowerCase() ||
    a.orderId !== mapped.id ||
    (attemptId !== undefined && a.id !== attemptId.toLowerCase()) ||
    a.mode !== "DEMO" ||
    a.amount !== mapped.total ||
    !/^[A-Z]{3}$/.test(a.currency) ||
    a.currency !== mapped.currency ||
    !validDate(a.createdAt) ||
    !validDate(a.updatedAt) ||
    (a.failureCode !== "" && a.failureCode !== "SELECTION_CHANGED")
  ) {
    throw new BadGatewayException("demo_payment_response_identity_invalid");
  }
  const state =
    outcome === undefined
      ? a.failureCode
        ? "FAILED"
        : "PROCESSING"
      : outcome === "UNKNOWN"
        ? "PROCESSING"
        : outcome;
  const status =
    state === "PROCESSING"
      ? "PAYMENT_PROCESSING"
      : state === "SUCCEEDED"
        ? "PAID"
        : "PENDING";
  if (
    a.state !== state ||
    mapped.status !== status ||
    mapped.version !== expectedVersion + (outcome === "UNKNOWN" ? 0 : 1) ||
    (outcome !== undefined && a.failureCode !== "")
  ) {
    throw new BadGatewayException("demo_payment_response_state_invalid");
  }
  return Object.freeze({
    order: mapped,
    attempt: Object.freeze({
      id: a.id,
      orderId: a.orderId,
      state: a.state as GatewayDemoPaymentAttemptDto["state"],
      mode: "DEMO" as const,
      amount: amount(a.amount),
      currency: a.currency,
      failureCode: a.failureCode,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }),
  });
}

@Injectable()
export class GatewayOrderApiService {
  constructor(@Inject(ORDER_SERVICE) private readonly client: ClientGrpc) {}

  async startDemoPayment(
    request: GatewayHttpRequest,
    id: string,
    input: GatewayDemoPaymentStartDto,
  ) {
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.StartDemoPayment(
          {
            id,
            expectedVersion: input.expectedVersion,
            idempotencyKey: this.checkoutKey(request),
          },
          orders.metadata,
        ),
      ),
    );
    return demoPayment(
      result.data,
      id,
      input.expectedVersion,
      actorUserId(request),
    );
  }

  async resolveDemoPayment(
    request: GatewayHttpRequest,
    id: string,
    attemptId: string,
    input: GatewayDemoPaymentOutcomeDto,
  ) {
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.ResolveDemoPayment(
          {
            id,
            attemptId,
            outcome: input.outcome,
            expectedVersion: input.expectedVersion,
            idempotencyKey: this.checkoutKey(request),
          },
          orders.metadata,
        ),
      ),
    );
    return demoPayment(
      result.data,
      id,
      input.expectedVersion,
      undefined,
      attemptId,
      input.outcome,
    );
  }

  private checkoutKey(request: GatewayHttpRequest): string {
    const key = request.headers["idempotency-key"];
    if (typeof key !== "string" || !validateIdempotencyKey(key))
      throw new BadRequestException("checkout_idempotency_key_invalid");
    return key;
  }

  private orders(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(
      request,
      ORDER_SERVICE_TARGET,
    );
    return {
      proxy: getOrder(this.client, downstream.signingPolicy),
      metadata: downstream.metadata,
    };
  }

  async getCart(request: GatewayHttpRequest) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(orders.proxy.GetCart({ userId: "" }, orders.metadata)),
    );
    return cart(result.data, userId);
  }

  async addToCart(request: GatewayHttpRequest, input: GatewayCartAddDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.AddToCart(
          {
            userId: "",
            productId: input.productId,
            quantity: input.quantity,
            variantId: input.variantId,
          },
          orders.metadata,
        ),
      ),
    );
    return cart(result.data, userId);
  }

  async updateCartItem(
    request: GatewayHttpRequest,
    itemId: string,
    input: GatewayCartUpdateDto,
  ) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.UpdateCartItem(
          {
            userId: "",
            itemId,
            quantity: input.quantity,
          },
          orders.metadata,
        ),
      ),
    );
    return cart(result.data, userId);
  }

  async removeCartItem(request: GatewayHttpRequest, itemId: string) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.RemoveCartItem({ userId: "", itemId }, orders.metadata),
      ),
    );
    return cart(result.data, userId);
  }

  async checkout(request: GatewayHttpRequest, input: GatewayCheckoutDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.Checkout(
          {
            userId: "",
            note: input.note ?? "",
            idempotencyKey: this.checkoutKey(request),
          },
          orders.metadata,
        ),
      ),
    );
    return order(result.data, userId);
  }

  async list(request: GatewayHttpRequest, query: GatewayOrderListQueryDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.ListOrders(
          { userId: "", status: query.status ?? "" },
          orders.metadata,
        ),
      ),
    );
    return Object.freeze(result.data.map((value) => order(value, userId)));
  }

  async get(request: GatewayHttpRequest, id: string) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const mapped = order(
      (
        await wrapGrpc(
          firstValueFrom(
            orders.proxy.GetOrder({ userId: "", id }, orders.metadata),
          ),
        )
      ).data,
      userId,
    );
    if (mapped.id !== id)
      throw new BadGatewayException("order_response_identity_mismatch");
    return mapped;
  }

  async updateStatus(
    request: GatewayHttpRequest,
    id: string,
    input: GatewayOrderStatusUpdateDto,
  ) {
    const idempotencyKey = request.headers["idempotency-key"];
    if (
      typeof idempotencyKey !== "string" ||
      !validateIdempotencyKey(idempotencyKey)
    )
      throw new BadRequestException("order_status_key_invalid");
    const orders = this.orders(request);
    const mapped = order(
      (
        await wrapGrpc(
          firstValueFrom(
            orders.proxy.UpdateOrderStatus(
              {
                id,
                status: input.status,
                expectedVersion: input.expectedVersion,
                idempotencyKey,
              },
              orders.metadata,
            ),
          ),
        )
      ).data,
      undefined,
      true,
    );
    if (
      mapped.id !== id ||
      mapped.status !== input.status ||
      mapped.version !== input.expectedVersion + 1
    )
      throw new BadGatewayException("order_response_identity_mismatch");
    return mapped;
  }

  async adminGet(request: GatewayHttpRequest, id: string) {
    const orders = this.orders(request);
    const result = await wrapGrpc(
      firstValueFrom(orders.proxy.AdminGetOrder({ id }, orders.metadata)),
    );
    const mapped = order(result.data, undefined, true);
    if (mapped.id !== id.toLowerCase())
      throw new BadGatewayException("order_response_identity_mismatch");
    return mapped;
  }

  async adminList(
    request: GatewayHttpRequest,
    query: GatewayAdminOrderListQueryDto,
  ) {
    const orders = this.orders(request);
    const page = query.page ?? 1,
      limit = query.limit ?? 20;
    const result = await wrapGrpc(
      firstValueFrom(
        orders.proxy.AdminListOrders(
          {
            status: query.status,
            userId: query.userId,
            page,
            limit,
          },
          orders.metadata,
        ),
      ),
    );
    const data = (result.data ?? []).map((value) =>
      order(value, undefined, true),
    );
    if (
      result.page !== page ||
      result.limit !== limit ||
      !Number.isSafeInteger(result.total) ||
      result.total < 0 ||
      data.length > limit ||
      data.length > result.total ||
      data.some(
        (value) =>
          (query.userId !== undefined &&
            value.userId !== query.userId.toLowerCase()) ||
          (query.status !== undefined && value.status !== query.status),
      )
    )
      throw new BadGatewayException("order_admin_list_response_invalid");
    return Object.freeze({
      data: Object.freeze(data),
      page,
      limit,
      total: result.total,
    });
  }
}
