import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getProduct, type GrpcRequestInput } from "@nebula/clients";
import { productv1 } from "@nebula/protos";
import {
  PRODUCT_SERVICE,
  PRODUCT_SERVICE_TARGET,
  wrapGrpc,
} from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import {
  GatewayProductStatus,
  type GatewayAdminProductListQueryDto,
  type GatewayBulkResultDto,
  type GatewayGalleryAddDto,
  type GatewayGalleryImageDto,
  type GatewayGalleryOrderDto,
  type GatewayProductBulkDiscountDto,
  type GatewayProductDto,
  type GatewayProductListQueryDto,
  type GatewayProductPatchDto,
  type GatewayProductWriteDto,
} from "./product-api.dto";

type ProductPatchInput = GrpcRequestInput<productv1.ProductPatch>;

function knownStatus(value: string): GatewayProductStatus {
  if (
    !Object.values(GatewayProductStatus).includes(value as GatewayProductStatus)
  ) {
    throw new BadGatewayException("product_response_status_invalid");
  }
  return value as GatewayProductStatus;
}

function finiteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new BadGatewayException(`product_response_${name}_invalid`);
  }
  return value;
}

function product(value: productv1.Product | undefined): GatewayProductDto {
  if (
    !value?.id ||
    !value.title ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.complementaryIds)
  ) {
    throw new BadGatewayException("product_response_invalid");
  }
  return Object.freeze({
    id: value.id,
    slug: value.slug,
    title: value.title,
    description: value.description,
    excerpt: value.excerpt,
    sku: value.sku,
    status: knownStatus(value.status),
    price: finiteNumber(value.price, "price"),
    currency: value.currency,
    categoryId: value.categoryId,
    thumbnailUrl: value.thumbnailUrl,
    model3dUrl: value.model3dUrl,
    model3dFormat: value.model3dFormat,
    model3dLiveView: value.model3dLiveView,
    model3dPosterUrl: value.model3dPosterUrl,
    vrEnabled: value.vrEnabled,
    vrPlanImageUrl: value.vrPlanImageUrl,
    metaTitle: value.metaTitle,
    metaDescription: value.metaDescription,
    metaKeywords: value.metaKeywords,
    customSchema: value.customSchema,
    noindex: value.noindex,
    isFeatured: value.isFeatured,
    featureSort: finiteNumber(value.featureSort, "feature_sort"),
    promoTitle: value.promoTitle,
    promoBadge: value.promoBadge,
    promoActive: value.promoActive,
    discountType: value.discountType,
    discountValue: finiteNumber(value.discountValue, "discount_value"),
    discountActive: value.discountActive,
    discountStart: value.discountStart,
    discountEnd: value.discountEnd,
    effectivePrice: finiteNumber(value.effectivePrice, "effective_price"),
    tags: Object.freeze([...value.tags]),
    complementaryIds: Object.freeze([...value.complementaryIds]),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    deletedAt: value.deletedAt,
  });
}

function publicProduct(
  value: productv1.Product | undefined,
): GatewayProductDto {
  const mapped = product(value);
  if (mapped.status !== GatewayProductStatus.ACTIVE || mapped.deletedAt) {
    throw new NotFoundException("product_not_found");
  }
  return mapped;
}

function publicProducts(
  values: readonly productv1.Product[],
): readonly GatewayProductDto[] {
  const mapped = values.map(product);
  if (
    mapped.some(
      (value) =>
        value.status !== GatewayProductStatus.ACTIVE || value.deletedAt,
    )
  ) {
    throw new BadGatewayException("product_public_visibility_violation");
  }
  return Object.freeze(mapped);
}

function galleryImage(value: productv1.GalleryImage): GatewayGalleryImageDto {
  if (!value.id || !value.url || !Number.isInteger(value.sort)) {
    throw new BadGatewayException("product_gallery_response_invalid");
  }
  return Object.freeze({
    id: value.id,
    url: value.url,
    alt: value.alt,
    sort: value.sort,
    deletedAt: value.deletedAt,
  });
}

function gallery(
  response: productv1.GalleryResponse,
  productId: string,
  requirePublic: boolean,
): readonly GatewayGalleryImageDto[] {
  if (response.productId !== productId || !Array.isArray(response.images)) {
    throw new BadGatewayException("product_gallery_response_invalid");
  }
  const images = response.images.map(galleryImage);
  if (requirePublic && images.some((image) => image.deletedAt)) {
    throw new BadGatewayException("product_gallery_visibility_violation");
  }
  return Object.freeze(images);
}

function createInput(
  input: GatewayProductWriteDto,
): GrpcRequestInput<productv1.ProductInput> {
  return {
    title: input.title,
    slug: input.slug ?? "",
    sku: input.sku ?? "",
    price: input.price ?? 0,
    categoryId: input.categoryId ?? "",
    description: input.content ?? "",
    excerpt: input.excerpt ?? "",
    currency: input.currency ?? "",
    status: input.status ?? "",
    thumbnailUrl: input.thumbnailUrl ?? "",
    model3dUrl: input.model3dUrl ?? "",
    model3dFormat: input.model3dFormat ?? "",
    model3dLiveView: input.model3dLiveView ?? false,
    model3dPosterUrl: input.model3dPosterUrl ?? "",
    vrEnabled: input.vrEnabled ?? false,
    vrPlanImageUrl: input.vrPlanImageUrl ?? "",
    metaTitle: input.metaTitle ?? "",
    metaDescription: input.metaDescription ?? "",
    metaKeywords: input.metaKeywords ?? "",
    customSchema: input.customSchema ?? "",
    noindex: input.noindex ?? false,
    isFeatured: input.isFeatured ?? false,
    featureSort: input.featureSort ?? 0,
    promoTitle: input.promoTitle ?? "",
    promoBadge: input.promoBadge ?? "",
    promoActive: input.promoActive ?? false,
    discountType: input.discountType ?? "",
    discountValue: input.discountValue ?? 0,
    discountActive: input.discountActive ?? false,
    discountStart: input.discountStart ?? "",
    discountEnd: input.discountEnd ?? "",
    tags: input.tags ?? [],
    complementaryIds: input.complementaryIds ?? [],
  };
}

const PATCH_FIELDS = Object.freeze([
  "title",
  "slug",
  "sku",
  "price",
  "categoryId",
  "excerpt",
  "currency",
  "status",
  "thumbnailUrl",
  "model3dUrl",
  "model3dFormat",
  "model3dLiveView",
  "model3dPosterUrl",
  "vrEnabled",
  "vrPlanImageUrl",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "customSchema",
  "noindex",
  "isFeatured",
  "featureSort",
  "promoTitle",
  "promoBadge",
  "promoActive",
  "discountType",
  "discountValue",
  "discountActive",
  "discountStart",
  "discountEnd",
  "tags",
  "complementaryIds",
] as const);

function sparsePatch(input: GatewayProductPatchDto): ProductPatchInput {
  const patch: Partial<ProductPatchInput> = {};
  for (const field of PATCH_FIELDS) {
    const value = input[field];
    if (value !== undefined) Object.assign(patch, { [field]: value });
  }
  if (input.content !== undefined) patch.description = input.content;
  // The product receiver uses defaults:false, so this deliberately sparse
  // object preserves field presence. Generated fromPartial/create helpers must
  // not be used here because they materialize omitted scalar defaults.
  return patch as ProductPatchInput;
}

@Injectable()
export class GatewayProductApiService {
  constructor(@Inject(PRODUCT_SERVICE) private readonly client: ClientGrpc) {}

  private products(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(
      request,
      PRODUCT_SERVICE_TARGET,
    );
    return {
      proxy: getProduct(this.client, downstream.signingPolicy),
      metadata: downstream.metadata,
    };
  }

  async listPublic(
    request: GatewayHttpRequest,
    query: GatewayProductListQueryDto,
  ) {
    const products = this.products(request);
    const input = {
      ...(query.page === undefined ? {} : { page: query.page }),
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.q === undefined ? {} : { q: query.q }),
      ...(query.categoryId === undefined
        ? {}
        : { categoryId: query.categoryId }),
    } as GrpcRequestInput<productv1.ListProductsRequest>;
    const result = await wrapGrpc(
      firstValueFrom(products.proxy.ListProducts(input, products.metadata)),
    );
    if (!Number.isInteger(result.total) || result.total < 0) {
      throw new BadGatewayException("product_list_total_invalid");
    }
    return Object.freeze({
      data: publicProducts(result.data),
      total: result.total,
    });
  }

  async getPublic(request: GatewayHttpRequest, id: string) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(products.proxy.GetProduct({ id }, products.metadata)),
    );
    const mapped = publicProduct(result.data);
    if (mapped.id !== id)
      throw new BadGatewayException("product_response_identity_mismatch");
    return mapped;
  }

  async listAdmin(
    request: GatewayHttpRequest,
    query: GatewayAdminProductListQueryDto,
  ) {
    const products = this.products(request);
    const input = {
      ...(query.page === undefined ? {} : { page: query.page }),
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      ...(query.q === undefined ? {} : { q: query.q }),
      ...(query.categoryId === undefined
        ? {}
        : { categoryId: query.categoryId }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.includeDeleted === undefined
        ? {}
        : { includeDeleted: query.includeDeleted }),
    } as GrpcRequestInput<productv1.AdminListProductsRequest>;
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.AdminListProducts(input, products.metadata),
      ),
    );
    if (!Number.isInteger(result.total) || result.total < 0) {
      throw new BadGatewayException("product_list_total_invalid");
    }
    return Object.freeze({
      data: Object.freeze(result.data.map(product)),
      total: result.total,
    });
  }

  async getAdmin(request: GatewayHttpRequest, id: string) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(products.proxy.AdminGetProduct({ id }, products.metadata)),
    );
    const mapped = product(result.data);
    if (mapped.id !== id)
      throw new BadGatewayException("product_response_identity_mismatch");
    return mapped;
  }

  async create(request: GatewayHttpRequest, input: GatewayProductWriteDto) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.CreateProduct(
          { data: createInput(input) },
          products.metadata,
        ),
      ),
    );
    return product(result.data);
  }

  async update(
    request: GatewayHttpRequest,
    id: string,
    input: GatewayProductPatchDto,
  ) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.UpdateProduct(
          { id, data: sparsePatch(input) },
          products.metadata,
        ),
      ),
    );
    const mapped = product(result.data);
    if (mapped.id !== id)
      throw new BadGatewayException("product_response_identity_mismatch");
    return mapped;
  }

  async mutateById(
    request: GatewayHttpRequest,
    id: string,
    action: "delete" | "restore" | "hardDelete",
  ) {
    const products = this.products(request);
    const call =
      action === "delete"
        ? products.proxy.DeleteProduct({ id }, products.metadata)
        : action === "restore"
          ? products.proxy.RestoreProduct({ id }, products.metadata)
          : products.proxy.HardDeleteProduct({ id }, products.metadata);
    const mapped = product((await wrapGrpc(firstValueFrom(call))).data);
    if (mapped.id !== id)
      throw new BadGatewayException("product_response_identity_mismatch");
    return mapped;
  }

  async applyDiscount(
    request: GatewayHttpRequest,
    input: GatewayProductBulkDiscountDto,
  ): Promise<GatewayBulkResultDto> {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.ApplyDiscountBulk(
          {
            ids: input.ids ?? [],
            categoryId: input.categoryId ?? "",
            status: input.status ?? "",
            q: input.q ?? "",
            discountType: input.discountType ?? "",
            discountValue: input.discountValue ?? 0,
            discountActive: input.discountActive ?? false,
            discountStart: input.discountStart ?? "",
            discountEnd: input.discountEnd ?? "",
          },
          products.metadata,
        ),
      ),
    );
    if (!Number.isInteger(result.updated) || result.updated < 0) {
      throw new BadGatewayException("product_bulk_response_invalid");
    }
    return Object.freeze({ updated: result.updated });
  }

  async listGallery(
    request: GatewayHttpRequest,
    productId: string,
    requirePublic: boolean,
    includeDeleted = false,
  ) {
    const products = this.products(request);
    const result = requirePublic
      ? await wrapGrpc(
          firstValueFrom(
            products.proxy.ListGallery(
              { productId, includeDeleted: false },
              products.metadata,
            ),
          ),
        )
      : await wrapGrpc(
          firstValueFrom(
            products.proxy.AdminListGallery(
              { productId, includeDeleted },
              products.metadata,
            ),
          ),
        );
    return gallery(result, productId, requirePublic);
  }

  async addImages(
    request: GatewayHttpRequest,
    productId: string,
    input: GatewayGalleryAddDto,
  ) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.AddImages(
          {
            productId,
            images: input.images.map((image) => ({
              url: image.url,
              alt: image.alt ?? "",
              sort: image.sort ?? 0,
            })),
          },
          products.metadata,
        ),
      ),
    );
    return gallery(result, productId, false);
  }

  async reorderImages(
    request: GatewayHttpRequest,
    productId: string,
    input: GatewayGalleryOrderDto,
  ) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.ReorderImages(
          { productId, orders: input.orders },
          products.metadata,
        ),
      ),
    );
    return gallery(result, productId, false);
  }

  async removeImage(
    request: GatewayHttpRequest,
    productId: string,
    imageId: string,
    hardDelete: boolean,
  ) {
    const products = this.products(request);
    const result = await wrapGrpc(
      firstValueFrom(
        products.proxy.RemoveImage(
          { productId, imageId, hardDelete },
          products.metadata,
        ),
      ),
    );
    return gallery(result, productId, false);
  }
}
