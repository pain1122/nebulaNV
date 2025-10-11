import {
  Controller,
  Logger,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata } from "@grpc/grpc-js";
import * as crypto from "crypto";

import { ProductServiceImpl } from "../product.service";
import { Public, Roles } from "@nebula/grpc-auth";
import { productv1 } from "@nebula/protos";

import { CreateProductDto } from "../dto/create-product.dto";
import { UpdateProductDto } from "../dto/update-product.dto";
import { IdDto } from "../dto/id.dto";
import { ListProductsDto } from "../dto/list-products.dto";
import { ApplyDiscountBulkDto } from "../dto/apply-discount-bulk.dto";
import { AddImagesDto } from "../dto/add-images.dto";
import { ListGalleryDto } from "../dto/list-gallery.dto";
import { ReorderImagesDto } from "../dto/reorder-images.dto";
import { RemoveImageDto } from "../dto/remove-image.dto";

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

  // ------------------------------------------------------
  // Internal call validator
  // ------------------------------------------------------
  private isInternal(meta?: Metadata): boolean {
    try {
      const headerName = process.env.GATEWAY_HEADER ?? "x-gateway-sign";
      const sig = meta?.get(headerName)?.[0] as string | undefined;
      if (!sig || !process.env.GATEWAY_SECRET) return false;

      // Time bucket (per minute)
      const bucket = Math.floor(Date.now() / 60000);
      const expected = crypto
        .createHmac("sha256", process.env.GATEWAY_SECRET)
        .update(String(bucket))
        .digest("hex");

      return sig === expected;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------
  // CreateProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "CreateProduct")
  create(dto: CreateProductDto) {
    return this.svc.create(dto.data);
  }

  // ------------------------------------------------------
  // UpdateProduct
  // Admins normally; internal (order-service) bypass via HMAC
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "UpdateProduct")
  async update(dto: UpdateProductDto, meta: Metadata) {
    // Allow HMAC-signed internal calls (e.g., from order-service)
    const isInternal = this.isInternal(meta);
    if (!isInternal) {
      // Non-internal path → handled by @Roles('admin')
      // (GrpcTokenAuthGuard enforces role already)
      // Just extra safeguard in case guard misfires
      throw new ForbiddenException("Admin or internal service only");
    }

    this.log.debug(`[ProductService] UpdateProduct internal call`);
    return this.svc.update(dto.id, dto.patch);
  }

  // ------------------------------------------------------
  // GetProduct (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "GetProduct")
  get(req: IdDto) {
    return this.svc.get(req.id);
  }

  // ------------------------------------------------------
  // ListProducts (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "ListProducts")
  list(req: ListProductsDto) {
    return this.svc.list({
      q: req.q,
      categoryId: req.categoryId,
      status: req.status,
      page: req.page,
      limit: req.limit,
      includeDeleted: req.includeDeleted,
    });
  }

  // ------------------------------------------------------
  // DeleteProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "DeleteProduct")
  del(req: IdDto) {
    return this.svc.softDelete(req.id);
  }

  // ------------------------------------------------------
  // RestoreProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "RestoreProduct")
  restore(req: IdDto) {
    return this.svc.restore(req.id);
  }

  // ------------------------------------------------------
  // HardDeleteProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "HardDeleteProduct")
  hardDelete(req: IdDto) {
    return this.svc.hardDelete(req.id);
  }

  // ------------------------------------------------------
  // ApplyDiscountBulk (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "ApplyDiscountBulk")
  applyDiscountBulk(req: ApplyDiscountBulkDto) {
    return this.svc.applyDiscountBulk(req as any);
  }

  // ------------------------------------------------------
  // AddImages (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "AddImages")
  async addImagesGrpc(req: AddImagesDto) {
    const imgs = await this.svc.addImages(req.productId, req.images ?? []);
    return productv1.GalleryResponse.create({
      productId: req.productId,
      images: imgs.map((i) => ({
        id: i.id,
        url: i.url,
        alt: i.alt ?? "",
        sort: i.sortOrder,
      })),
    });
  }

  // ------------------------------------------------------
  // ListGallery (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "ListGallery")
  async listGalleryGrpc(req: ListGalleryDto) {
    const imgs = await this.svc.listGallery(req.productId, !!req.includeDeleted);
    return productv1.GalleryResponse.create({
      productId: req.productId,
      images: imgs.map((i) => ({
        id: i.id,
        url: i.url,
        alt: i.alt ?? "",
        sort: i.sortOrder,
      })),
    });
  }

  // ------------------------------------------------------
  // ReorderImages (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "ReorderImages")
  async reorderImagesGrpc(req: ReorderImagesDto) {
    const imgs = await this.svc.reorderImages(req.productId, req.orders ?? []);
    return productv1.GalleryResponse.create({
      productId: req.productId,
      images: imgs.map((i) => ({
        id: i.id,
        url: i.url,
        alt: i.alt ?? "",
        sort: i.sortOrder,
      })),
    });
  }

  // ------------------------------------------------------
  // RemoveImage (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("ProductService", "RemoveImage")
  async removeImageGrpc(req: RemoveImageDto) {
    const imgs = await this.svc.removeImage(req.productId, req.imageId, !!req.hardDelete);
    return productv1.GalleryResponse.create({
      productId: req.productId,
      images: imgs.map((i) => ({
        id: i.id,
        url: i.url,
        alt: i.alt ?? "",
        sort: i.sortOrder,
      })),
    });
  }
}
