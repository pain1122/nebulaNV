import { Controller, Logger, UsePipes } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import type { ServerUnaryCall } from "@grpc/grpc-js";

import { ProductServiceImpl } from "../product.service";
import {
  createGrpcValidationPipe,
  createVerifiedServiceDownstreamContext,
  Public,
  Roles,
  type MetadataWithContext,
  type RpcContextWithContext,
} from "@nebula/grpc-auth";
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

const Pipe = createGrpcValidationPipe();

type GrpcCall<TRequest> = ServerUnaryCall<TRequest, unknown> &
  RpcContextWithContext;

type GalleryRow = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  deletedAt: Date | null;
};

function galleryResponse(productId: string, images: GalleryRow[]) {
  return productv1.GalleryResponse.create({
    productId,
    images: images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? "",
      sort: image.sortOrder,
      deletedAt: image.deletedAt?.toISOString() ?? "",
    })),
  });
}

@Controller()
export class ProductGrpcController {
  private readonly log = new Logger(ProductGrpcController.name);
  constructor(private readonly svc: ProductServiceImpl) {}

  // ------------------------------------------------------
  // CreateProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "CreateProduct")
  create(
    dto: CreateProductDto,
    metadata: MetadataWithContext,
    call: GrpcCall<CreateProductDto>,
  ) {
    return this.svc.create(
      dto.data,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
  }

  // ------------------------------------------------------
  // UpdateProduct
  // Admin-only (guard handles user JWT or signed S2S with injected role)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "UpdateProduct")
  async update(
    dto: UpdateProductDto,
    metadata: MetadataWithContext,
    call: GrpcCall<UpdateProductDto>,
  ) {
    return this.svc.update(
      dto.id,
      dto.patch,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
  }

  // ------------------------------------------------------
  // GetProduct (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "GetProduct")
  get(req: IdDto) {
    return this.svc.getPublic(req.id);
  }

  // ------------------------------------------------------
  // ListProducts (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "ListProducts")
  list(req: ListProductsDto) {
    return this.svc.listPublic({
      q: req.q,
      categoryId: req.categoryId,
      page: req.page,
      limit: req.limit,
    });
  }

  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AdminGetProduct")
  adminGet(req: IdDto) {
    return this.svc.getAdmin(req.id);
  }

  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AdminListProducts")
  adminList(req: ListProductsDto) {
    return this.svc.listAdmin({
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
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "DeleteProduct")
  del(req: IdDto) {
    return this.svc.softDelete(req.id);
  }

  // ------------------------------------------------------
  // RestoreProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "RestoreProduct")
  restore(req: IdDto) {
    return this.svc.restore(req.id);
  }

  // ------------------------------------------------------
  // HardDeleteProduct (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "HardDeleteProduct")
  hardDelete(req: IdDto) {
    return this.svc.hardDelete(req.id);
  }

  // ------------------------------------------------------
  // ApplyDiscountBulk (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "ApplyDiscountBulk")
  applyDiscountBulk(req: ApplyDiscountBulkDto) {
    return this.svc.applyDiscountBulk(req);
  }

  // ------------------------------------------------------
  // AddImages (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AddImages")
  async addImagesGrpc(req: AddImagesDto) {
    const imgs = await this.svc.addImages(req.productId, req.images ?? []);
    return galleryResponse(req.productId, imgs);
  }

  // ------------------------------------------------------
  // ListGallery (Public)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Public()
  @GrpcMethod("ProductService", "ListGallery")
  async listGalleryGrpc(req: ListGalleryDto) {
    const imgs = await this.svc.listPublicGallery(req.productId);
    return galleryResponse(req.productId, imgs);
  }

  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AdminListGallery")
  async adminListGalleryGrpc(req: ListGalleryDto) {
    const imgs = await this.svc.listAdminGallery(
      req.productId,
      !!req.includeDeleted,
    );
    return galleryResponse(req.productId, imgs);
  }

  // ------------------------------------------------------
  // ReorderImages (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "ReorderImages")
  async reorderImagesGrpc(req: ReorderImagesDto) {
    const imgs = await this.svc.reorderImages(req.productId, req.orders ?? []);
    return galleryResponse(req.productId, imgs);
  }

  // ------------------------------------------------------
  // RemoveImage (Admin only)
  // ------------------------------------------------------
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "RemoveImage")
  async removeImageGrpc(req: RemoveImageDto) {
    const imgs = await this.svc.removeImage(
      req.productId,
      req.imageId,
      !!req.hardDelete,
    );
    return galleryResponse(req.productId, imgs);
  }
}
