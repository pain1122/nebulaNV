import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderGrpcController } from "./grpc/order-grpc.controller";
import { PrismaService } from "../prisma.service";
import { HealthController } from "../health.controller";

@Module({
  controllers: [OrderController, OrderGrpcController, HealthController],
  providers: [OrderService, PrismaService],
})
export class OrderModule {}
