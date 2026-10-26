import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ProductServiceImpl } from "./product.service";
import { ProductController } from "./product.controller";
import { ProductGrpcController } from "./grpc/product-grpc.controller";
import { CheckoutStockService } from "./checkout-stock.service";
import { CheckoutStockGrpcController } from "./grpc/checkout-stock-grpc.controller";

@Module({
  providers: [PrismaService, ProductServiceImpl, CheckoutStockService],
  controllers: [
    ProductController,
    ProductGrpcController,
    CheckoutStockGrpcController,
  ],
  exports: [PrismaService],
})
export class ProductModule {}
