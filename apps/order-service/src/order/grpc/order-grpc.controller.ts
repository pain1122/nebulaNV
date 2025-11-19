import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { OrderService } from "../order.service";
import { OrderStatus } from "../../../prisma/generated/client";

@Controller()
export class OrderGrpcController {
  constructor(private readonly svc: OrderService) {}

  @GrpcMethod("OrderService", "Ping")
  ping(_: any) {
    return {};
  }

  @GrpcMethod("OrderService", "GetCart")
  async getCart(req: { userId: string }) {
    return this.svc.getCartForUser(req.userId);
  }

  @GrpcMethod("OrderService", "AddToCart")
  async addToCart(req: { userId: string; productId: string; quantity: number }) {
    return this.svc.addToCart(req.userId, {
      productId: req.productId,
      quantity: req.quantity,
    });
  }

  @GrpcMethod("OrderService", "UpdateCartItem")
  async updateCartItem(req: { userId: string; itemId: string; quantity: number }) {
    return this.svc.updateCartItem(req.userId, req.itemId, { quantity: req.quantity });
  }

  @GrpcMethod("OrderService", "RemoveCartItem")
  async removeCartItem(req: { userId: string; itemId: string }) {
    return this.svc.removeCartItem(req.userId, req.itemId);
  }

  @GrpcMethod("OrderService", "Checkout")
  async checkout(req: { userId: string; note?: string }) {
    return this.svc.checkout(req.userId, req.note);
  }

  @GrpcMethod("OrderService", "GetOrder")
  async getOrder(req: { userId: string; id: string }) {
    return this.svc.getOrderForUser(req.userId, req.id);
  }

  @GrpcMethod("OrderService", "ListOrders")
  async listOrders(req: { userId: string; status?: string }) {
    const status = req.status ? (req.status as OrderStatus) : undefined;
    return this.svc.listOrdersForUser(req.userId, status);
  }

  @GrpcMethod("OrderService", "UpdateOrderStatus")
  async updateOrderStatus(req: { id: string; status: string }) {
    const status = req.status as OrderStatus;
    return this.svc.updateOrderStatusAdmin(req.id, status);
  }
}
