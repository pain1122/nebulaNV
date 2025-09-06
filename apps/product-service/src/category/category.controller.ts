import { Body, Controller, Delete, Get, Param, Put, Query, Post } from '@nestjs/common';
import { CategoryService } from './category.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly svc: CategoryService) {}

  @Get()
  async list(@Query('publicOnly') publicOnly?: string) {
    return publicOnly === 'true' ? this.svc.listPublic() : this.svc.listAll();
  }

  @Get('default')
  getDefault() {
    return this.svc.getDefault(); // returns { id: '<uuid>' }
  }

  @Post('default/ensure')                // ⬅️ add this
  ensureDefault() {
    return this.svc.ensureDefaultCategory();
  }

  @Put('default')
  setDefault(@Body() body: { categoryId: string }) {
    return this.svc.setDefault(body.categoryId); // writes ID to settings
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; slug?: string; isHidden?: boolean }) {
    return this.svc.updateCategory(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('substituteId') substituteId?: string) {
    return this.svc.deleteCategory(id, substituteId);
  }
}
