import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';
import { ProductServiceImpl } from './product.service';
import { ProductController } from './product.controller';
import { ProductGrpcController } from './grpc/product-grpc.controller'
import { HealthController } from '../health.controller';

@Module({
  providers: [PrismaService, ProductServiceImpl, { provide: APP_GUARD, useClass: GrpcTokenAuthGuard }],
  controllers: [ProductController, HealthController, ProductGrpcController],
})
export class ProductModule {}
