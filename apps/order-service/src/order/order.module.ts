import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { AdminOrderController } from "./admin-order.controller";
import { OrderGrpcController } from "./grpc/order-grpc.controller";
import { PrismaService } from "../prisma.service";
import { CheckoutReceiptRetention } from "./checkout-receipt-retention";
import { CheckoutRecovery } from "./checkout-recovery";

@Module({
  controllers: [OrderController, AdminOrderController, OrderGrpcController],
  providers: [
    OrderService,
    PrismaService,
    CheckoutReceiptRetention,
    CheckoutRecovery,
  ],
  exports: [PrismaService],
})
export class OrderModule {}
