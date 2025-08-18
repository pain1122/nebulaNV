import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { join } from 'path';

export const PRODUCT_PROTO = join(__dirname, '../proto/product.proto');

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ProductModule, CategoryModule],
})
export class AppModule {}
