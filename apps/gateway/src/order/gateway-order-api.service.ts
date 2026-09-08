import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getOrder } from "@nebula/clients";
import { orderv1 } from "@nebula/protos";
import { ORDER_SERVICE, ORDER_SERVICE_TARGET, wrapGrpc } from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
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
} from "./order-api.dto";

function actorUserId(request: GatewayHttpRequest): string {
  const userId = request.user?.userId;
  if (!userId) throw new Error("gateway_verified_actor_state_incomplete");
  return userId;
}

function integer(value: number, name: string, minimum = 0): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new BadGatewayException(`order_response_${name}_invalid`);
  }
  return value;
}

function cartItem(value: orderv1.CartItem): GatewayCartItemDto {
  if (!value.id || !value.productId || !value.name) throw new BadGatewayException("cart_item_response_invalid");
  return Object.freeze({
    id: value.id, productId: value.productId, sku: value.sku, name: value.name,
    quantity: integer(value.quantity, "cart_quantity", 1), unitPrice: value.unitPrice, meta: value.meta,
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
  });
}

function orderStatus(value: string): GatewayOrderStatus {
  if (!Object.values(GatewayOrderStatus).includes(value as GatewayOrderStatus)) {
    throw new BadGatewayException("order_response_status_invalid");
  }
  return value as GatewayOrderStatus;
}

function orderItem(value: orderv1.OrderItem): GatewayOrderItemDto {
  if (!value.id || !value.productId || !value.name) throw new BadGatewayException("order_item_response_invalid");
  return Object.freeze({
    id: value.id, productId: value.productId, sku: value.sku, name: value.name,
    quantity: integer(value.quantity, "item_quantity", 1), unitPrice: value.unitPrice,
    lineTotal: value.lineTotal, meta: value.meta,
  });
}

function order(value: orderv1.Order | undefined, expectedUserId?: string): GatewayOrderDto {
  if (!value?.id || !value.orderNumber || !value.userId || !Array.isArray(value.items) || (expectedUserId && value.userId !== expectedUserId)) {
    throw new BadGatewayException("order_response_identity_invalid");
  }
  return Object.freeze({
    id: value.id, orderNumber: value.orderNumber, userId: value.userId,
    status: orderStatus(value.status), currency: value.currency, subtotal: value.subtotal,
    discountTotal: value.discountTotal, taxTotal: value.taxTotal, total: value.total,
    shippingAddress: value.shippingAddress, billingAddress: value.billingAddress,
    meta: value.meta, createdAt: value.createdAt, updatedAt: value.updatedAt,
    items: Object.freeze(value.items.map(orderItem)),
  });
}

@Injectable()
export class GatewayOrderApiService {
  constructor(@Inject(ORDER_SERVICE) private readonly client: ClientGrpc) {}

  private orders(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(request, ORDER_SERVICE_TARGET);
    return { proxy: getOrder(this.client, downstream.signingPolicy), metadata: downstream.metadata };
  }

  async getCart(request: GatewayHttpRequest) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.GetCart({ userId: "" }, orders.metadata)));
    return cart(result.data, userId);
  }

  async addToCart(request: GatewayHttpRequest, input: GatewayCartAddDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.AddToCart({
      userId: "", productId: input.productId, quantity: input.quantity,
    }, orders.metadata)));
    return cart(result.data, userId);
  }

  async updateCartItem(request: GatewayHttpRequest, itemId: string, input: GatewayCartUpdateDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.UpdateCartItem({
      userId: "", itemId, quantity: input.quantity,
    }, orders.metadata)));
    return cart(result.data, userId);
  }

  async removeCartItem(request: GatewayHttpRequest, itemId: string) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.RemoveCartItem({ userId: "", itemId }, orders.metadata)));
    return cart(result.data, userId);
  }

  async checkout(request: GatewayHttpRequest, input: GatewayCheckoutDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.Checkout({ userId: "", note: input.note ?? "" }, orders.metadata)));
    return order(result.data, userId);
  }

  async list(request: GatewayHttpRequest, query: GatewayOrderListQueryDto) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const result = await wrapGrpc(firstValueFrom(orders.proxy.ListOrders({ userId: "", status: query.status ?? "" }, orders.metadata)));
    return Object.freeze(result.data.map((value) => order(value, userId)));
  }

  async get(request: GatewayHttpRequest, id: string) {
    const userId = actorUserId(request);
    const orders = this.orders(request);
    const mapped = order((await wrapGrpc(firstValueFrom(orders.proxy.GetOrder({ userId: "", id }, orders.metadata)))).data, userId);
    if (mapped.id !== id) throw new BadGatewayException("order_response_identity_mismatch");
    return mapped;
  }

  async updateStatus(request: GatewayHttpRequest, id: string, status: GatewayOrderStatus) {
    const orders = this.orders(request);
    const mapped = order((await wrapGrpc(firstValueFrom(orders.proxy.UpdateOrderStatus({ id, status }, orders.metadata)))).data);
    if (mapped.id !== id) throw new BadGatewayException("order_response_identity_mismatch");
    return mapped;
  }
}
