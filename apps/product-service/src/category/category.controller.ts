import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Public, Roles } from '@nebula/grpc-auth';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Public()
  @Get()
  list() {
    return this.service.list();
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
