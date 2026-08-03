import { Module } from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderController } from "./order.controller";
import { OrderGrpcController } from "./grpc/order-grpc.controller";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [OrderController, OrderGrpcController],
  providers: [OrderService, PrismaService],
  exports: [PrismaService],
})
export class OrderModule {}
