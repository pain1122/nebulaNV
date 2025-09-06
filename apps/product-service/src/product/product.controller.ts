// apps/product-service/src/product/product.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductServiceImpl } from './product.service';
import { productv1 } from '@nebula/protos';

type ListQuery = {
  page?: string;        // accept strings from query
  limit?: string;
  q?: string;
  category_id?: string;
  status?: string;
  include_deleted?: string;
};

@Controller('products')
export class ProductController {
  constructor(private readonly svc: ProductServiceImpl) {}

  @Get()
  list(@Query() q: ListQuery) {
    // Build a proto-shaped request (good typing), then adapt to your service
    const req: productv1.ListProductsRequest = {
      page: q.page ? parseInt(q.page, 10) : 1,
      limit: q.limit ? parseInt(q.limit, 10) : 20,
      q: q.q ?? '',
      categoryId: q.category_id ?? '',       // NOTE: depends on ts-proto naming (see tip below)
      status: q.status ?? '',
      includeDeleted: q.include_deleted === 'true',
    } as any;

    // If your service takes an object filter:
    return this.svc.list(req);

    // If your service takes separate args instead, adapt here:
    // return this.svc.list(req.page, req.limit, req.q, req.categoryId, req.status, req.includeDeleted);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);                 // your service: (id: string)
  }

  @Post()
  create(@Body() body: productv1.CreateProductRequest) {
    return this.svc.create(body.data);       // your service likely expects the inner data
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: productv1.UpdateProductRequest) {
    // proto: { id, data }, service: update(id, patch)
    const patch = body?.data ?? (body as any); // tolerate both shapes while migrating
    return this.svc.update(id, patch);
  }
}
