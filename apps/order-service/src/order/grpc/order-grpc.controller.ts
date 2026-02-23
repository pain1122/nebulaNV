import {Controller} from "@nestjs/common"
import {GrpcMethod} from "@nestjs/microservices"
import {Metadata, status} from "@grpc/grpc-js"
import {RequireUserId, resolveCtxUser, toRpc} from "@nebula/grpc-auth"
import {OrderService} from "../order.service"
import {OrderStatus} from "../../../prisma/generated/client"

@Controller()
export class OrderGrpcController {
  constructor(private readonly svc: OrderService) {}

  @GrpcMethod("OrderService", "Ping")
  ping(_: any) {
    return {}
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "GetCart")
  async getCart(req: { userId: string },meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.getCartForUser(ctxUser.userId)
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "AddToCart")
  async addToCart(req: {userId: string; productId: string; quantity: number}, meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.addToCart(ctxUser.userId, {
      productId: req.productId,
      quantity: req.quantity,
    })
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "UpdateCartItem")
  async updateCartItem(req: {userId: string; itemId: string; quantity: number}, meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.updateCartItem(ctxUser.userId, req.itemId, {quantity: req.quantity})
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "RemoveCartItem")
  async removeCartItem(req: {userId: string; itemId: string}, meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.removeCartItem(ctxUser.userId, req.itemId)
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "Checkout")
  async checkout(req: {userId: string; note?: string}, meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.checkout(ctxUser.userId, req.note)
  }

  @RequireUserId()
  @GrpcMethod("OrderService", "GetOrder")
  async getOrder(req: {userId: string; id: string}, meta: Metadata, call: any) {
    const ctxUser = resolveCtxUser(meta, call)
    if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
    return this.svc.getOrderForUser(ctxUser.userId, req.id)
  }

@RequireUserId()
@GrpcMethod("OrderService", "ListOrders")
async listOrders(req: { userId: string; status?: string }, meta: Metadata, call: any) {
  const ctxUser = resolveCtxUser(meta, call)
  if (!ctxUser) throw toRpc(status.UNAUTHENTICATED, "missing_user_id")
  const orderStatus = req.status ? (req.status as OrderStatus) : undefined
  return this.svc.listOrdersForUser(ctxUser.userId, orderStatus)
}


  @GrpcMethod("OrderService", "UpdateOrderStatus")
  async updateOrderStatus(req: {id: string; status: string}) {
    const orderStatus = req.status as OrderStatus
    return this.svc.updateOrderStatusAdmin(req.id, orderStatus)
  }
}
