import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { status, type ServerUnaryCall } from "@grpc/grpc-js";
import {
  createVerifiedServiceDownstreamContext,
  Public,
  RequireUserId,
  Roles,
  resolveCtxUser,
  toRpc,
  type MetadataWithContext,
  type RpcContextWithContext,
} from "@nebula/grpc-auth";
import type { orderv1 } from "@nebula/protos";
import { OrderService } from "../order.service";
import { OrderStatus } from "../../../prisma/generated/client";

type ProtoLoaderRequest<T extends { $type: string }> = Omit<T, "$type">;
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type CheckoutRequest = WithOptional<
  ProtoLoaderRequest<orderv1.CheckoutRequest>,
  "note"
>;
type ListOrdersRequest = WithOptional<
  ProtoLoaderRequest<orderv1.ListOrdersRequest>,
  "status"
>;
type GrpcCall<TReq> = ServerUnaryCall<TReq, unknown> & RpcContextWithContext;

const ORDER_STATUS_VALUES = new Set<string>(Object.values(OrderStatus));

function toOrderStatus(value: string | undefined): OrderStatus | undefined {
  if (!value) return undefined;

  if (ORDER_STATUS_VALUES.has(value)) {
    return value as OrderStatus;
  }

  throw toRpc(status.INVALID_ARGUMENT, "invalid_order_status");
}

@Controller()
export class OrderGrpcController {
  constructor(private readonly svc: OrderService) {}

  @Public()
  @GrpcMethod("OrderService", "Ping")
  ping() {
    return {};
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "GetCart")
  async getCart(
    req: ProtoLoaderRequest<orderv1.GetCartRequest>,
    meta: MetadataWithContext,
    call: GrpcCall<ProtoLoaderRequest<orderv1.GetCartRequest>>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.getCartForUser(
      ctxUser.userId,
      createVerifiedServiceDownstreamContext(meta, call),
    );
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "AddToCart")
  async addToCart(
    req: ProtoLoaderRequest<orderv1.AddToCartRequest>,
    meta: MetadataWithContext,
    call: GrpcCall<ProtoLoaderRequest<orderv1.AddToCartRequest>>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.addToCart(
      ctxUser.userId,
      {
        productId: req.productId,
        quantity: req.quantity,
      },
      createVerifiedServiceDownstreamContext(meta, call),
    );
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "UpdateCartItem")
  async updateCartItem(
    req: ProtoLoaderRequest<orderv1.UpdateCartItemRequest>,
    meta: MetadataWithContext,
    call: GrpcCall<ProtoLoaderRequest<orderv1.UpdateCartItemRequest>>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.updateCartItem(
      ctxUser.userId,
      req.itemId,
      { quantity: req.quantity },
      createVerifiedServiceDownstreamContext(meta, call),
    );
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "RemoveCartItem")
  async removeCartItem(
    req: ProtoLoaderRequest<orderv1.RemoveCartItemRequest>,
    meta: MetadataWithContext,
    call: GrpcCall<ProtoLoaderRequest<orderv1.RemoveCartItemRequest>>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.removeCartItem(
      ctxUser.userId,
      req.itemId,
      createVerifiedServiceDownstreamContext(meta, call),
    );
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "Checkout")
  async checkout(
    req: CheckoutRequest,
    meta: MetadataWithContext,
    call: GrpcCall<CheckoutRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.checkout(ctxUser.userId, req.note);
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "GetOrder")
  async getOrder(
    req: ProtoLoaderRequest<orderv1.GetOrderRequest>,
    meta: MetadataWithContext,
    call: GrpcCall<ProtoLoaderRequest<orderv1.GetOrderRequest>>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.getOrderForUser(ctxUser.userId, req.id);
  }

  @Roles("user")
  @RequireUserId()
  @GrpcMethod("OrderService", "ListOrders")
  async listOrders(
    req: ListOrdersRequest,
    meta: MetadataWithContext,
    call: GrpcCall<ListOrdersRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    const orderStatus = toOrderStatus(req.status);
    return this.svc.listOrdersForUser(ctxUser.userId, orderStatus);
  }

  @Roles("admin", "root-admin")
  @GrpcMethod("OrderService", "UpdateOrderStatus")
  async updateOrderStatus(
    req: ProtoLoaderRequest<orderv1.UpdateOrderStatusRequest>,
  ) {
    const orderStatus = toOrderStatus(req.status);
    if (!orderStatus)
      throw toRpc(status.INVALID_ARGUMENT, "missing_order_status");
    return this.svc.updateOrderStatusAdmin(req.id, orderStatus);
  }
}
