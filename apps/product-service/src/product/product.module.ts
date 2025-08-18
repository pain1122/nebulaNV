import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProductServiceImpl } from './product.service';
import { ProductController } from './product.controller';

@Module({
  providers: [PrismaService, ProductServiceImpl],
  controllers: [ProductController],
})
export class ProductModule {}
