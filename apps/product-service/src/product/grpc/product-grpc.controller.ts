import { Controller, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ProductServiceImpl } from '../product.service';
import { Public, Roles } from '@nebula/grpc-auth';

import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { IdDto } from '../dto/id.dto';
import { ListProductsDto } from '../dto/list-products.dto';
import { ApplyDiscountBulkDto } from '../dto/apply-discount-bulk.dto';
import { AddImagesDto } from '../dto/add-images.dto';
import { ListGalleryDto } from '../dto/list-gallery.dto';
import { ReorderImagesDto } from '../dto/reorder-images.dto';
import { RemoveImageDto } from '../dto/remove-image.dto';

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
export class ProductGrpcController {
  private readonly log = new Logger(ProductGrpcController.name);
  constructor(private readonly svc: ProductServiceImpl) {}

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'CreateProduct')
  create(dto: CreateProductDto) {
    return this.svc.create(dto.data);
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'UpdateProduct')
  update(dto: UpdateProductDto) {
    return this.svc.update(dto.id, dto.patch);
  }

  @UsePipes(Pipe)
  @Public()
  @GrpcMethod('ProductService', 'GetProduct')
  get(req: IdDto) {
    return this.svc.get(req.id);
  }

  @UsePipes(Pipe)
  @Public()
  @GrpcMethod('ProductService', 'ListProducts')
  list(req: ListProductsDto) {
    return this.svc.list({
      q: req.q,
      category_id: req.categoryId,
      status: req.status,
      page: req.page,
      limit: req.limit,
      include_deleted: req.includeDeleted,
    });
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'DeleteProduct')
  del(req: IdDto) {
    return this.svc.softDelete(req.id);
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'RestoreProduct')
  restore(req: IdDto) {
    return this.svc.restore(req.id);
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'HardDeleteProduct')
  hardDelete(req: IdDto) {
    return this.svc.hardDelete(req.id);
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'ApplyDiscountBulk')
  applyDiscountBulk(req: ApplyDiscountBulkDto) {
    return this.svc.applyDiscountBulk(req as any);
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'AddImages')
  async addImagesGrpc(req: AddImagesDto) {
    const imgs = await this.svc.addImages(req.productId, req.images ?? []);
    return {
      product_id: req.productId,
      images: imgs.map(i => ({ id: i.id, url: i.url, alt: i.alt ?? '', sort: i.sortOrder })),
    };
  }

  @UsePipes(Pipe)
  @Public()
  @GrpcMethod('ProductService', 'ListGallery')
  async listGalleryGrpc(req: ListGalleryDto) {
    const imgs = await this.svc.listGallery(req.productId, !!req.includeDeleted);
    return {
      product_id: req.productId,
      images: imgs.map(i => ({ id: i.id, url: i.url, alt: i.alt ?? '', sort: i.sortOrder })),
    };
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'ReorderImages')
  async reorderImagesGrpc(req: ReorderImagesDto) {
    const imgs = await this.svc.reorderImages(req.productId, req.orders ?? []);
    return {
      product_id: req.productId,
      images: imgs.map(i => ({ id: i.id, url: i.url, alt: i.alt ?? '', sort: i.sortOrder })),
    };
  }

  @UsePipes(Pipe)
  @Roles('admin')
  @GrpcMethod('ProductService', 'RemoveImage')
  async removeImageGrpc(req: RemoveImageDto) {
    const imgs = await this.svc.removeImage(req.productId, req.imageId, !!req.hardDelete);
    return {
      product_id: req.productId,
      images: imgs.map(i => ({ id: i.id, url: i.url, alt: i.alt ?? '', sort: i.sortOrder })),
    };
  }
}
