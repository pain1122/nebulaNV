import type { ClientGrpc } from "@nestjs/microservices";
import { PRODUCT_SERVICE_TARGET } from "@nebula/grpc-auth";
import { productv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type ProductRaw = {
  CreateProduct: RawGrpcUnary<
    productv1.CreateProductRequest,
    productv1.ProductResponse
  >;
  UpdateProduct: RawGrpcUnary<
    productv1.UpdateProductRequest,
    productv1.ProductResponse
  >;
  GetProduct: RawGrpcUnary<
    productv1.GetProductRequest,
    productv1.ProductResponse
  >;
  ListProducts: RawGrpcUnary<
    productv1.ListProductsRequest,
    productv1.ListProductsResponse
  >;
  AdminGetProduct: RawGrpcUnary<
    productv1.GetProductRequest,
    productv1.ProductResponse
  >;
  AdminListProducts: RawGrpcUnary<
    productv1.AdminListProductsRequest,
    productv1.ListProductsResponse
  >;
  DeleteProduct: RawGrpcUnary<
    productv1.DeleteProductRequest,
    productv1.ProductResponse
  >;
  RestoreProduct: RawGrpcUnary<
    productv1.RestoreProductRequest,
    productv1.ProductResponse
  >;
  HardDeleteProduct: RawGrpcUnary<
    productv1.HardDeleteProductRequest,
    productv1.ProductResponse
  >;
  ApplyDiscountBulk: RawGrpcUnary<
    productv1.ApplyDiscountBulkRequest,
    productv1.BulkResult
  >;
  AddImages: RawGrpcUnary<
    productv1.AddImagesRequest,
    productv1.GalleryResponse
  >;
  ListGallery: RawGrpcUnary<
    productv1.ListGalleryRequest,
    productv1.GalleryResponse
  >;
  AdminListGallery: RawGrpcUnary<
    productv1.AdminListGalleryRequest,
    productv1.GalleryResponse
  >;
  ReorderImages: RawGrpcUnary<
    productv1.ReorderImagesRequest,
    productv1.GalleryResponse
  >;
  RemoveImage: RawGrpcUnary<
    productv1.RemoveImageRequest,
    productv1.GalleryResponse
  >;
};

type ProductTaxonomyRaw = {
  List: RawGrpcUnary<
    productv1.ListProductTaxonomiesRequest,
    productv1.ListProductTaxonomiesResponse
  >;
  Get: RawGrpcUnary<
    productv1.GetProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Create: RawGrpcUnary<
    productv1.CreateProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Update: RawGrpcUnary<
    productv1.UpdateProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Delete: RawGrpcUnary<
    productv1.DeleteProductTaxonomyRequest,
    productv1.DeleteProductTaxonomyResponse
  >;
};

export interface ProductProxy {
  CreateProduct: SignedGrpcUnary<
    productv1.CreateProductRequest,
    productv1.ProductResponse
  >;
  UpdateProduct: SignedGrpcUnary<
    productv1.UpdateProductRequest,
    productv1.ProductResponse
  >;
  GetProduct: SignedGrpcUnary<
    productv1.GetProductRequest,
    productv1.ProductResponse
  >;
  ListProducts: SignedGrpcUnary<
    productv1.ListProductsRequest,
    productv1.ListProductsResponse
  >;
  AdminGetProduct: SignedGrpcUnary<
    productv1.GetProductRequest,
    productv1.ProductResponse
  >;
  AdminListProducts: SignedGrpcUnary<
    productv1.AdminListProductsRequest,
    productv1.ListProductsResponse
  >;
  DeleteProduct: SignedGrpcUnary<
    productv1.DeleteProductRequest,
    productv1.ProductResponse
  >;
  RestoreProduct: SignedGrpcUnary<
    productv1.RestoreProductRequest,
    productv1.ProductResponse
  >;
  HardDeleteProduct: SignedGrpcUnary<
    productv1.HardDeleteProductRequest,
    productv1.ProductResponse
  >;
  ApplyDiscountBulk: SignedGrpcUnary<
    productv1.ApplyDiscountBulkRequest,
    productv1.BulkResult
  >;
  AddImages: SignedGrpcUnary<
    productv1.AddImagesRequest,
    productv1.GalleryResponse
  >;
  ListGallery: SignedGrpcUnary<
    productv1.ListGalleryRequest,
    productv1.GalleryResponse
  >;
  AdminListGallery: SignedGrpcUnary<
    productv1.AdminListGalleryRequest,
    productv1.GalleryResponse
  >;
  ReorderImages: SignedGrpcUnary<
    productv1.ReorderImagesRequest,
    productv1.GalleryResponse
  >;
  RemoveImage: SignedGrpcUnary<
    productv1.RemoveImageRequest,
    productv1.GalleryResponse
  >;
}

export interface ProductTaxonomyProxy {
  List: SignedGrpcUnary<
    productv1.ListProductTaxonomiesRequest,
    productv1.ListProductTaxonomiesResponse
  >;
  Get: SignedGrpcUnary<
    productv1.GetProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Create: SignedGrpcUnary<
    productv1.CreateProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Update: SignedGrpcUnary<
    productv1.UpdateProductTaxonomyRequest,
    productv1.ProductTaxonomyResponse
  >;
  Delete: SignedGrpcUnary<
    productv1.DeleteProductTaxonomyRequest,
    productv1.DeleteProductTaxonomyResponse
  >;
}

export function getProduct(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): ProductProxy {
  const raw = client.getService<ProductRaw>("ProductService");
  const common = { policy: signingPolicy, target: PRODUCT_SERVICE_TARGET };
  return {
    CreateProduct: createSignedGrpcUnary({
      ...common,
      method: raw.CreateProduct.bind(raw),
      definition: productv1.ProductServiceService.createProduct,
    }),
    UpdateProduct: createSignedGrpcUnary({
      ...common,
      method: raw.UpdateProduct.bind(raw),
      definition: productv1.ProductServiceService.updateProduct,
    }),
    GetProduct: createSignedGrpcUnary({
      ...common,
      method: raw.GetProduct.bind(raw),
      definition: productv1.ProductServiceService.getProduct,
    }),
    ListProducts: createSignedGrpcUnary({
      ...common,
      method: raw.ListProducts.bind(raw),
      definition: productv1.ProductServiceService.listProducts,
    }),
    AdminGetProduct: createSignedGrpcUnary({
      ...common,
      method: raw.AdminGetProduct.bind(raw),
      definition: productv1.ProductServiceService.adminGetProduct,
    }),
    AdminListProducts: createSignedGrpcUnary({
      ...common,
      method: raw.AdminListProducts.bind(raw),
      definition: productv1.ProductServiceService.adminListProducts,
    }),
    DeleteProduct: createSignedGrpcUnary({
      ...common,
      method: raw.DeleteProduct.bind(raw),
      definition: productv1.ProductServiceService.deleteProduct,
    }),
    RestoreProduct: createSignedGrpcUnary({
      ...common,
      method: raw.RestoreProduct.bind(raw),
      definition: productv1.ProductServiceService.restoreProduct,
    }),
    HardDeleteProduct: createSignedGrpcUnary({
      ...common,
      method: raw.HardDeleteProduct.bind(raw),
      definition: productv1.ProductServiceService.hardDeleteProduct,
    }),
    ApplyDiscountBulk: createSignedGrpcUnary({
      ...common,
      method: raw.ApplyDiscountBulk.bind(raw),
      definition: productv1.ProductServiceService.applyDiscountBulk,
    }),
    AddImages: createSignedGrpcUnary({
      ...common,
      method: raw.AddImages.bind(raw),
      definition: productv1.ProductServiceService.addImages,
    }),
    ListGallery: createSignedGrpcUnary({
      ...common,
      method: raw.ListGallery.bind(raw),
      definition: productv1.ProductServiceService.listGallery,
    }),
    AdminListGallery: createSignedGrpcUnary({
      ...common,
      method: raw.AdminListGallery.bind(raw),
      definition: productv1.ProductServiceService.adminListGallery,
    }),
    ReorderImages: createSignedGrpcUnary({
      ...common,
      method: raw.ReorderImages.bind(raw),
      definition: productv1.ProductServiceService.reorderImages,
    }),
    RemoveImage: createSignedGrpcUnary({
      ...common,
      method: raw.RemoveImage.bind(raw),
      definition: productv1.ProductServiceService.removeImage,
    }),
  };
}

export function getProductTaxonomy(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): ProductTaxonomyProxy {
  const raw = client.getService<ProductTaxonomyRaw>("ProductTaxonomyService");
  const common = { policy: signingPolicy, target: PRODUCT_SERVICE_TARGET };
  return {
    List: createSignedGrpcUnary({
      ...common,
      method: raw.List.bind(raw),
      definition: productv1.ProductTaxonomyServiceService.list,
    }),
    Get: createSignedGrpcUnary({
      ...common,
      method: raw.Get.bind(raw),
      definition: productv1.ProductTaxonomyServiceService.get,
    }),
    Create: createSignedGrpcUnary({
      ...common,
      method: raw.Create.bind(raw),
      definition: productv1.ProductTaxonomyServiceService.create,
    }),
    Update: createSignedGrpcUnary({
      ...common,
      method: raw.Update.bind(raw),
      definition: productv1.ProductTaxonomyServiceService.update,
    }),
    Delete: createSignedGrpcUnary({
      ...common,
      method: raw.Delete.bind(raw),
      definition: productv1.ProductTaxonomyServiceService.delete,
    }),
  };
}
