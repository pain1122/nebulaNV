import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata, status, type ServerUnaryCall } from "@grpc/grpc-js";
import { RequireUserId, resolveCtxUser, toRpc } from "@nebula/grpc-auth";
import { OrderService } from "../order.service";
import { OrderStatus } from "../../../prisma/generated/client";

type GetCartRequest = { userId: string };

type AddToCartRequest = {
  userId: string;
  productId: string;
  quantity: number;
};

type UpdateCartItemRequest = {
  userId: string;
  itemId: string;
  quantity: number;
};

type RemoveCartItemRequest = {
  userId: string;
  itemId: string;
};

type CheckoutRequest = {
  userId: string;
  note?: string;
};

type GetOrderRequest = {
  userId: string;
  id: string;
};

type ListOrdersRequest = {
  userId: string;
  status?: string;
};

type UpdateOrderStatusRequest = {
  id: string;
  status: string;
};

type GrpcCall<TReq> = ServerUnaryCall<TReq, unknown>;

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

  @GrpcMethod("OrderService", "Ping")
  ping() {
    return {};
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "GetCart")
  async getCart(
    req: GetCartRequest,
    meta: Metadata,
    call: GrpcCall<GetCartRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.getCartForUser(ctxUser.userId);
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "AddToCart")
  async addToCart(
    req: AddToCartRequest,
    meta: Metadata,
    call: GrpcCall<AddToCartRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.addToCart(ctxUser.userId, {
      productId: req.productId,
      quantity: req.quantity,
    });
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "UpdateCartItem")
  async updateCartItem(
    req: UpdateCartItemRequest,
    meta: Metadata,
    call: GrpcCall<UpdateCartItemRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.updateCartItem(ctxUser.userId, req.itemId, {
      quantity: req.quantity,
    });
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "RemoveCartItem")
  async removeCartItem(
    req: RemoveCartItemRequest,
    meta: Metadata,
    call: GrpcCall<RemoveCartItemRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.removeCartItem(ctxUser.userId, req.itemId);
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "Checkout")
  async checkout(
    req: CheckoutRequest,
    meta: Metadata,
    call: GrpcCall<CheckoutRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.checkout(ctxUser.userId, req.note);
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "GetOrder")
  async getOrder(
    req: GetOrderRequest,
    meta: Metadata,
    call: GrpcCall<GetOrderRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    return this.svc.getOrderForUser(ctxUser.userId, req.id);
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "ListOrders")
  async listOrders(
    req: ListOrdersRequest,
    meta: Metadata,
    call: GrpcCall<ListOrdersRequest>,
  ) {
    const ctxUser = resolveCtxUser(meta, call);
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id");
    const orderStatus = toOrderStatus(req.status);
    return this.svc.listOrdersForUser(ctxUser.userId, orderStatus);
  }

  @GrpcMethod("OrderService", "UpdateOrderStatus")
  async updateOrderStatus(req: UpdateOrderStatusRequest) {
    const orderStatus = toOrderStatus(req.status);
    if (!orderStatus)
      throw toRpc(status.INVALID_ARGUMENT, "missing_order_status");
    return this.svc.updateOrderStatusAdmin(req.id, orderStatus);
  }
}
