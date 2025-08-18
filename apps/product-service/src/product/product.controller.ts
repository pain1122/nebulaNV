import {Controller, Logger } from "@nestjs/common"
import {GrpcMethod, RpcException } from "@nestjs/microservices"
import {ProductServiceImpl} from "./product.service"

@Controller()
export class ProductController {
  private readonly log = new Logger(ProductController.name);
  constructor(private readonly svc: ProductServiceImpl) {}

  @GrpcMethod('ProductService', 'CreateProduct')
  async create(req: { data: any }) {
    this.log.debug(`[CreateProduct] req=${JSON.stringify(req)}`);
    try {
      const res = await this.svc.create(req.data);
      this.log.debug(`[CreateProduct] ok id=${res?.data?.id}`);
      return res;
    } catch (e: any) {
      this.log.error(`[CreateProduct] error: ${e?.message}`, e?.stack);
      // 13 = INTERNAL for Prisma errors; Postman will show the message
      throw new RpcException({ code: 13, message: e?.message || 'Internal error' });
    }
  }

  @GrpcMethod("ProductService", "UpdateProduct")
  update(req: {id: string; data: any}) {
    return this.svc.update(req.id, req.data)
  }

  @GrpcMethod("ProductService", "GetProduct")
  get(req: {id: string}) {
    return this.svc.get(req.id)
  }

  @GrpcMethod("ProductService", "ListProducts")
  list(req: any) {
    return this.svc.list(req)
  }

  @GrpcMethod("ProductService", "DeleteProduct") // soft delete
  del(req: {id: string}) {
    return this.svc.softDelete(req.id)
  }

  @GrpcMethod("ProductService", "RestoreProduct")
  restore(req: {id: string}) {
    return this.svc.restore(req.id)
  }

  @GrpcMethod("ProductService", "HardDeleteProduct") // irreversible
  hardDelete(req: {id: string}) {
    return this.svc.hardDelete(req.id)
  }

  @GrpcMethod("ProductService", "ApplyDiscountBulk")
  applyDiscountBulk(req: any) {
    return this.svc.applyDiscountBulk(req)
  }

  @GrpcMethod("ProductService", "AddImages")
  async addImagesGrpc(data: any) {
    const imgs = await this.svc.addImages(data.product_id, data.images ?? [])
    return {
      product_id: data.product_id,
      images: imgs.map((i) => ({id: i.id, url: i.url, alt: i.alt ?? "", sort: i.sortOrder})),
    }
  }

  @GrpcMethod("ProductService", "ListGallery")
  async listGalleryGrpc(data: any) {
    const imgs = await this.svc.listGallery(data.product_id, !!data.include_deleted)
    return {
      product_id: data.product_id,
      images: imgs.map((i) => ({id: i.id, url: i.url, alt: i.alt ?? "", sort: i.sortOrder})),
    }
  }

  @GrpcMethod("ProductService", "ReorderImages")
  async reorderImagesGrpc(data: any) {
    const imgs = await this.svc.reorderImages(data.product_id, data.orders ?? [])
    return {
      product_id: data.product_id,
      images: imgs.map((i) => ({id: i.id, url: i.url, alt: i.alt ?? "", sort: i.sortOrder})),
    }
  }

  @GrpcMethod("ProductService", "RemoveImage")
  async removeImageGrpc(data: any) {
    const imgs = await this.svc.removeImage(data.product_id, data.image_id, !!data.hard_delete)
    return {
      product_id: data.product_id,
      images: imgs.map((i) => ({id: i.id, url: i.url, alt: i.alt ?? "", sort: i.sortOrder})),
    }
  }
}
