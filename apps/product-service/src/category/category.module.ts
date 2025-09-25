import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaService } from '../prisma.service';
import {DefaultCategoryInitializer} from "./default-category.initializer"


@Module({
  providers: [CategoryService, PrismaService, DefaultCategoryInitializer],
  controllers: [CategoryController],
})
export class CategoryModule {}
