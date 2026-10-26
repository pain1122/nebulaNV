import { Controller, Logger, UsePipes } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import type { ServerUnaryCall } from "@grpc/grpc-js";

import { ProductServiceImpl } from "../product.service";
import {
  createGrpcValidationPipe,
  createVerifiedServiceDownstreamContext,
  DormantS2SAuthorizationV3Receiver,
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
import { ImageMetadataGrpcDto } from "../dto/image-metadata.dto";
import { AddImagesDto } from "../dto/add-images.dto";
import { ListGalleryDto } from "../dto/list-gallery.dto";
import { ReorderImagesDto } from "../dto/reorder-images.dto";
import { RemoveImageDto } from "../dto/remove-image.dto";
import {
  CreateVariantDto,
  UpdateVariantDto,
  DeleteVariantDto,
} from "../dto/variant.dto";
import { BadRequestException } from "@nestjs/common";

const Pipe = createGrpcValidationPipe();

type GrpcCall<TRequest> = ServerUnaryCall<TRequest, unknown> &
  RpcContextWithContext;

type GalleryRow = {
  id: string;
  url: string;
  mediaId: string | null;
  alt: string | null;
  title?: string | null;
  altOverride?: string;
  titleOverride?: string;
  metadataVersion?: number;
  sortOrder: number;
  deletedAt: Date | null;
};

function galleryResponse(productId: string, images: GalleryRow[]) {
  return productv1.GalleryResponse.create({
    productId,
    images: images.map((image) => ({
      id: image.id,
      mediaId: image.mediaId ?? "",
      url: image.mediaId ? `/api/v1/media/render/${image.mediaId}` : "",
      alt: image.alt ?? "",
      title: image.title ?? "",
      altOverride: image.altOverride,
      titleOverride: image.titleOverride,
      metadataVersion: image.metadataVersion ?? 1,
      sort: image.sortOrder,
      deletedAt: image.deletedAt?.toISOString() ?? "",
    })),
  });
}

@Controller()
export class ProductGrpcController {
  private readonly log = new Logger(ProductGrpcController.name);
  constructor(private readonly svc: ProductServiceImpl) {}

  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "UpdateImageMetadata")
  async updateImageMetadata(req: ImageMetadataGrpcDto) {
    return galleryResponse(
      req.productId,
      await this.svc.updateImageMetadata(req.productId, req.imageId, req),
    );
  }

  // ------------------------------------------------------
  // CreateProduct (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "CreateProductV3")
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
  @DormantS2SAuthorizationV3Receiver("ProductService", "UpdateProductV3")
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
      dto.patch
        ? {
            ...dto.patch,
            tagIds: dto.patch.replaceTagIds ? dto.patch.tagIds : undefined,
          }
        : undefined,
      dto.expectedVersion,
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

  @DormantS2SAuthorizationV3Receiver("ProductService", "AdminGetProductV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AdminGetProduct")
  adminGet(req: IdDto) {
    return this.svc.getAdmin(req.id);
  }

  @DormantS2SAuthorizationV3Receiver("ProductService", "AdminListProductsV3")
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

  @DormantS2SAuthorizationV3Receiver("ProductService", "CreateVariantV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "CreateVariant")
  createVariant(req: CreateVariantDto) {
    return this.svc.createVariant(req.productId, req.data, req.expectedVersion);
  }

  @DormantS2SAuthorizationV3Receiver("ProductService", "UpdateVariantV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "UpdateVariant")
  updateVariant(req: UpdateVariantDto) {
    const {
      clearPriceOverride,
      priceOverride,
      replaceOptions,
      options,
      ...patch
    } = req.data;
    if (clearPriceOverride && priceOverride !== undefined) {
      throw new BadRequestException("variant_price_override_conflict");
    }
    return this.svc.updateVariant(
      req.productId,
      req.variantId,
      {
        ...patch,
        ...(clearPriceOverride
          ? { priceOverride: null }
          : priceOverride === undefined
            ? {}
            : { priceOverride }),
        ...(replaceOptions ? { options } : {}),
      },
      req.expectedVersion,
    );
  }

  @DormantS2SAuthorizationV3Receiver("ProductService", "DeleteVariantV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "DeleteVariant")
  deleteVariant(req: DeleteVariantDto) {
    return this.svc.deleteVariant(
      req.productId,
      req.variantId,
      req.expectedVersion,
    );
  }

  // ------------------------------------------------------
  // DeleteProduct (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "DeleteProductV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "DeleteProduct")
  del(req: IdDto) {
    return this.svc.softDelete(req.id);
  }

  // ------------------------------------------------------
  // RestoreProduct (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "RestoreProductV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "RestoreProduct")
  restore(req: IdDto) {
    return this.svc.restore(req.id);
  }

  // ------------------------------------------------------
  // HardDeleteProduct (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "HardDeleteProductV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "HardDeleteProduct")
  hardDelete(req: IdDto) {
    return this.svc.hardDelete(req.id);
  }

  // ------------------------------------------------------
  // ApplyDiscountBulk (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "ApplyDiscountBulkV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "ApplyDiscountBulk")
  applyDiscountBulk(req: ApplyDiscountBulkDto) {
    return this.svc.applyDiscountBulk(req);
  }

  // ------------------------------------------------------
  // AddImages (Admin only)
  // ------------------------------------------------------
  @DormantS2SAuthorizationV3Receiver("ProductService", "AddImagesV3")
  @UsePipes(Pipe)
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductService", "AddImages")
  async addImagesGrpc(
    req: AddImagesDto,
    metadata: MetadataWithContext,
    call: GrpcCall<AddImagesDto>,
  ) {
    const imgs = await this.svc.addImages(
      req.productId,
      req.images ?? [],
      createVerifiedServiceDownstreamContext(metadata, call),
    );
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

  @DormantS2SAuthorizationV3Receiver("ProductService", "AdminListGalleryV3")
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
  @DormantS2SAuthorizationV3Receiver("ProductService", "ReorderImagesV3")
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
  @DormantS2SAuthorizationV3Receiver("ProductService", "RemoveImageV3")
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
