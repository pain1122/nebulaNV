import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { Roles } from "@nebula/grpc-auth";
import { OrderService } from "./order.service";
import { AddToCartDto, CheckoutDto, UpdateCartItemDto, OrderStatusDto } from "./dto/order.dto";

@Controller("orders")
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  private getUserId(req: Request): string {
    const user = (req as any)?.user;
    if (!user?.userId) {
      throw new Error("missing user context");
    }
    return user.userId;
  }

  // ---------- Cart HTTP endpoints ----------

  @Roles("user")
  @Get("cart")
  async getCart(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.svc.getCartForUser(userId);
  }

  @Roles("user")
  @Post("cart/items")
  async addToCart(@Req() req: Request, @Body() dto: AddToCartDto) {
    const userId = this.getUserId(req);
    return this.svc.addToCart(userId, dto);
  }

  @Roles("user")
  @Patch("cart/items/:id")
  async updateCartItem(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = this.getUserId(req);
    return this.svc.updateCartItem(userId, id, dto);
  }

  @Roles("user")
  @Delete("cart/items/:id")
  async removeCartItem(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    const userId = this.getUserId(req);
    return this.svc.removeCartItem(userId, id);
  }

  // ---------- Checkout ----------

  @Roles("user")
  @Post("checkout")
  async checkout(@Req() req: Request, @Body() dto: CheckoutDto) {
    const userId = this.getUserId(req);
    return this.svc.checkout(userId, dto.note);
  }

  // ---------- Orders (user) ----------

  @Roles("user")
  @Get()
  async listForCurrentUser(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.svc.listOrdersForUser(userId);
  }

  @Roles("user")
  @Get(":id")
  async getForCurrentUser(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    const userId = this.getUserId(req);
    return this.svc.getOrderForUser(userId, id);
  }

  // ---------- Admin status update ----------

  @Roles("admin")
  @Patch(":id/status")
  async updateStatusAdmin(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body("status") status: OrderStatusDto,
  ) {
    // Map DTO enum to Prisma OrderStatus enum (same strings)
    // If they differ, map explicitly.
    return this.svc.updateOrderStatusAdmin(id, status as any);
  }
}
