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
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { Roles } from "@nebula/grpc-auth";
import { OrderService } from "./order.service";
import {
  AddToCartDto,
  CheckoutDto,
  StartDemoPaymentDto,
  UpdateCartItemDto,
  UpdateOrderStatusDto,
} from "./dto/order.dto";

type RequestUser = {
  userId?: string;
  role?: string;
};

type AuthenticatedRequest = Request & {
  user?: RequestUser;
  requestId?: string;
};

@Controller("orders")
export class OrderController {
  constructor(private readonly svc: OrderService) {}

  private getUserId(req: Request): string {
    const userId = (req as AuthenticatedRequest).user?.userId;
    if (!userId) {
      throw new UnauthorizedException("missing user context");
    }
    return userId;
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
    return this.svc.checkout(userId, req.headers["idempotency-key"], dto.note);
  }

  // ---------- Orders (user) ----------

  @Roles("user")
  @Post(":id/demo-payment-attempts")
  startDemoPayment(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: StartDemoPaymentDto,
  ) {
    const verified = req as AuthenticatedRequest;
    return this.svc.startDemoPayment(id, dto, req.headers["idempotency-key"], {
      userId: verified.user?.userId,
      role: verified.user?.role,
      requestId: verified.requestId,
    });
  }

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

  @Roles("admin", "root-admin")
  @Patch(":id/status")
  async updateStatusAdmin(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const verified = req as AuthenticatedRequest;
    return this.svc.updateOrderStatusAdmin(
      id,
      dto,
      req.headers["idempotency-key"],
      {
        userId: verified.user?.userId,
        role: verified.user?.role,
        requestId: verified.requestId,
      },
    );
  }
}
