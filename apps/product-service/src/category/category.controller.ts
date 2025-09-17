import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Post,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Public, Roles } from '@nebula/grpc-auth';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SetDefaultDto } from './dto/set-default.dto';
import { ListCategoriesQuery } from './dto/list-query.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller('categories')
@UsePipes(Pipe)
export class CategoryController {
  constructor(private readonly svc: CategoryService) {}

  // READS (public)
  @Public()
  @Get()
  async list(@Query() q: ListCategoriesQuery) {
    return q.publicOnly ? this.svc.listPublic() : this.svc.listAll();
  }

  @Public()
  @Get('default')
  getDefault() {
    // returns { id: '<uuid>' }
    return this.svc.getDefault();
  }

  // WRITES (admin)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(dto);
  }

  @Roles('admin')
  @Post('default/ensure')
  ensureDefault() {
    return this.svc.ensureDefaultCategory();
  }

  @Roles('admin')
  @Put('default')
  setDefault(@Body() body: SetDefaultDto) {
    return this.svc.setDefault(body.categoryId);
  }

  @Roles('admin')
  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.svc.updateCategory(id, body);
  }

  @Roles('admin')
  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: DeleteCategoryDto, // validates optional substituteId as UUID v4
  ) {
    return this.svc.deleteCategory(id, q.substituteId);
  }
}
