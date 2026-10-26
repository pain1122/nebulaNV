import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  ParseUUIDPipe,
} from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "@nebula/grpc-auth";
import { OrderService } from "./order.service";
import { AdminOrderListDto, ResolveDemoPaymentDto } from "./dto/order.dto";

@Controller("admin/orders")
export class AdminOrderController {
  constructor(private readonly orders: OrderService) {}
  @Roles("admin", "root-admin")
  @Post(":id/demo-payment-attempts/:attemptId/outcome")
  @HttpCode(200)
  resolveDemoPayment(
    @Req()
    req: Request & {
      user?: { userId?: string; role?: string };
      requestId?: string;
    },
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("attemptId", new ParseUUIDPipe({ version: "4" })) attemptId: string,
    @Body() dto: ResolveDemoPaymentDto,
  ) {
    return this.orders.resolveDemoPayment(
      id,
      { ...dto, attemptId },
      req.headers["idempotency-key"],
      {
        userId: req.user?.userId,
        role: req.user?.role,
        requestId: req.requestId,
      },
    );
  }
  @Roles("admin", "root-admin")
  @Get()
  list(@Query() query: AdminOrderListDto) {
    return this.orders.listOrdersForAdmin(query);
  }
  @Roles("admin", "root-admin")
  @Get(":id")
  get(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.orders.getOrderForAdmin(id);
  }
}
