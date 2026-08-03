import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ProductServiceImpl } from "./product.service";
import { ProductController } from "./product.controller";
import { ProductGrpcController } from "./grpc/product-grpc.controller";

@Module({
  providers: [PrismaService, ProductServiceImpl],
  controllers: [ProductController, ProductGrpcController],
  exports: [PrismaService],
})
export class ProductModule {}
