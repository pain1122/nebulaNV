import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProductServiceImpl } from './product.service';
import { ProductController } from './product.controller';
import { ProductGrpcController } from './grpc/product-grpc.controller'
import { HealthController } from '../health.controller';

@Module({
  providers: [PrismaService, ProductServiceImpl],
  controllers: [ProductController, HealthController, ProductGrpcController],
})
export class ProductModule {}
