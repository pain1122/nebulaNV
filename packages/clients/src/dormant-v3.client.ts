import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTH_SERVICE_TARGET,
  BLOG_SERVICE_TARGET,
  MEDIA_SERVICE_TARGET,
  ORDER_SERVICE_TARGET,
  PRODUCT_SERVICE_TARGET,
  SETTINGS_SERVICE_TARGET,
  USER_SERVICE_TARGET,
  type GrpcRequestDefinition,
  type S2SAuthorizationContextV3,
} from "@nebula/grpc-auth";
import {
  authv1,
  blogv1,
  media,
  orderv1,
  productv1,
  settings,
  userv1,
} from "@nebula/protos";
import type { AuthProxy } from "./auth.client";
import type { BlogProxy, BlogTaxonomyProxy } from "./blog.client";
import type { MediaProxy } from "./media.client";
import type { OrderProxy } from "./order.client";
import type { ProductProxy, ProductTaxonomyProxy } from "./product.client";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
} from "./s2s-metadata";
import type { SettingsProxy } from "./settings.types";
import type { UserProxy } from "./user.client";

export type DormantV3SigningPolicy = Omit<GrpcClientSigningPolicy, "context"> &
  Readonly<{ context: S2SAuthorizationContextV3 }>;

type DormantV3Proxy<TProxy, TMethod extends keyof TProxy & string> = {
  [TKey in TMethod as `${TKey}V3`]: TProxy[TKey];
};

type DormantV3Bindings<
  TProxy,
  TMethod extends keyof TProxy & string,
> = Readonly<{
  [TKey in TMethod as `${TKey}V3`]: GrpcRequestDefinition;
}>;

function bindDormantV3<
  TProxy extends object,
  TMethod extends keyof TProxy & string,
>(options: {
  client: ClientGrpc;
  serviceName: string;
  target: string;
  policy: DormantV3SigningPolicy;
  bindings: DormantV3Bindings<TProxy, TMethod>;
}): DormantV3Proxy<TProxy, TMethod> {
  const raw = options.client.getService<Record<string, unknown>>(
    options.serviceName,
  );
  const proxy: Record<string, unknown> = {};
  for (const [receiver, definition] of Object.entries(
    options.bindings,
  ) as Array<[string, GrpcRequestDefinition]>) {
    const candidate = raw[receiver];
    if (typeof candidate !== "function") {
      throw new Error(`dormant_v3_client_method_missing:${receiver}`);
    }
    const method = candidate.bind(raw) as unknown as RawGrpcUnary<
      unknown,
      unknown
    >;
    proxy[receiver] = createSignedGrpcUnary({
      method,
      policy: options.policy,
      target: options.target,
      definition,
    });
  }
  return proxy as DormantV3Proxy<TProxy, TMethod>;
}

type AuthV3Method = "RefreshTokens" | "Logout" | "GetProfile";
export type DormantAuthV3Proxy = DormantV3Proxy<AuthProxy, AuthV3Method>;

export function getDormantAuthV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantAuthV3Proxy {
  return bindDormantV3<AuthProxy, AuthV3Method>({
    client,
    serviceName: "AuthService",
    target: AUTH_SERVICE_TARGET,
    policy,
    bindings: {
      RefreshTokensV3: authv1.AuthServiceService.refreshTokensV3,
      LogoutV3: authv1.AuthServiceService.logoutV3,
      GetProfileV3: authv1.AuthServiceService.getProfileV3,
    },
  });
}

type UserV3Method = "GetUser" | "ListUsers" | "UpdateProfile";
export type DormantUserV3Proxy = DormantV3Proxy<UserProxy, UserV3Method>;

export function getDormantUserV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantUserV3Proxy {
  return bindDormantV3<UserProxy, UserV3Method>({
    client,
    serviceName: "UserService",
    target: USER_SERVICE_TARGET,
    policy,
    bindings: {
      GetUserV3: userv1.UserServiceService.getUserV3,
      ListUsersV3: userv1.UserServiceService.listUsersV3,
      UpdateProfileV3: userv1.UserServiceService.updateProfileV3,
    },
  });
}

type SettingsV3Method = "SetString" | "DeleteString";
export type DormantSettingsV3Proxy = DormantV3Proxy<
  SettingsProxy,
  SettingsV3Method
>;

export function getDormantSettingsV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantSettingsV3Proxy {
  return bindDormantV3<SettingsProxy, SettingsV3Method>({
    client,
    serviceName: "SettingsService",
    target: SETTINGS_SERVICE_TARGET,
    policy,
    bindings: {
      SetStringV3: settings.SettingsServiceService.setStringV3,
      DeleteStringV3: settings.SettingsServiceService.deleteStringV3,
    },
  });
}

type ProductV3Method =
  | "CreateProduct"
  | "UpdateProduct"
  | "AdminGetProduct"
  | "AdminListProducts"
  | "DeleteProduct"
  | "RestoreProduct"
  | "HardDeleteProduct"
  | "ApplyDiscountBulk"
  | "AddImages"
  | "AdminListGallery"
  | "ReorderImages"
  | "RemoveImage";
export type DormantProductV3Proxy = DormantV3Proxy<
  ProductProxy,
  ProductV3Method
>;

export function getDormantProductV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantProductV3Proxy {
  return bindDormantV3<ProductProxy, ProductV3Method>({
    client,
    serviceName: "ProductService",
    target: PRODUCT_SERVICE_TARGET,
    policy,
    bindings: {
      CreateProductV3: productv1.ProductServiceService.createProductV3,
      UpdateProductV3: productv1.ProductServiceService.updateProductV3,
      AdminGetProductV3: productv1.ProductServiceService.adminGetProductV3,
      AdminListProductsV3: productv1.ProductServiceService.adminListProductsV3,
      DeleteProductV3: productv1.ProductServiceService.deleteProductV3,
      RestoreProductV3: productv1.ProductServiceService.restoreProductV3,
      HardDeleteProductV3: productv1.ProductServiceService.hardDeleteProductV3,
      ApplyDiscountBulkV3: productv1.ProductServiceService.applyDiscountBulkV3,
      AddImagesV3: productv1.ProductServiceService.addImagesV3,
      AdminListGalleryV3: productv1.ProductServiceService.adminListGalleryV3,
      ReorderImagesV3: productv1.ProductServiceService.reorderImagesV3,
      RemoveImageV3: productv1.ProductServiceService.removeImageV3,
    },
  });
}

type ProductTaxonomyV3Method = "Create" | "Update" | "Delete";
export type DormantProductTaxonomyV3Proxy = DormantV3Proxy<
  ProductTaxonomyProxy,
  ProductTaxonomyV3Method
>;

export function getDormantProductTaxonomyV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantProductTaxonomyV3Proxy {
  return bindDormantV3<ProductTaxonomyProxy, ProductTaxonomyV3Method>({
    client,
    serviceName: "ProductTaxonomyService",
    target: PRODUCT_SERVICE_TARGET,
    policy,
    bindings: {
      CreateV3: productv1.ProductTaxonomyServiceService.createV3,
      UpdateV3: productv1.ProductTaxonomyServiceService.updateV3,
      DeleteV3: productv1.ProductTaxonomyServiceService.deleteV3,
    },
  });
}

type BlogV3Method = "CreatePost" | "UpdatePost" | "DeletePost";
export type DormantBlogV3Proxy = DormantV3Proxy<BlogProxy, BlogV3Method>;

export function getDormantBlogV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantBlogV3Proxy {
  return bindDormantV3<BlogProxy, BlogV3Method>({
    client,
    serviceName: "BlogService",
    target: BLOG_SERVICE_TARGET,
    policy,
    bindings: {
      CreatePostV3: blogv1.BlogServiceService.createPostV3,
      UpdatePostV3: blogv1.BlogServiceService.updatePostV3,
      DeletePostV3: blogv1.BlogServiceService.deletePostV3,
    },
  });
}

type BlogTaxonomyV3Method = "Create" | "Update" | "Delete";
export type DormantBlogTaxonomyV3Proxy = DormantV3Proxy<
  BlogTaxonomyProxy,
  BlogTaxonomyV3Method
>;

export function getDormantBlogTaxonomyV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantBlogTaxonomyV3Proxy {
  return bindDormantV3<BlogTaxonomyProxy, BlogTaxonomyV3Method>({
    client,
    serviceName: "BlogTaxonomyService",
    target: BLOG_SERVICE_TARGET,
    policy,
    bindings: {
      CreateV3: blogv1.BlogTaxonomyServiceService.createV3,
      UpdateV3: blogv1.BlogTaxonomyServiceService.updateV3,
      DeleteV3: blogv1.BlogTaxonomyServiceService.deleteV3,
    },
  });
}

type OrderV3Method = keyof OrderProxy;
export type DormantOrderV3Proxy = DormantV3Proxy<OrderProxy, OrderV3Method>;

export function getDormantOrderV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantOrderV3Proxy {
  return bindDormantV3<OrderProxy, OrderV3Method>({
    client,
    serviceName: "OrderService",
    target: ORDER_SERVICE_TARGET,
    policy,
    bindings: {
      GetCartV3: orderv1.OrderServiceService.getCartV3,
      AddToCartV3: orderv1.OrderServiceService.addToCartV3,
      UpdateCartItemV3: orderv1.OrderServiceService.updateCartItemV3,
      RemoveCartItemV3: orderv1.OrderServiceService.removeCartItemV3,
      CheckoutV3: orderv1.OrderServiceService.checkoutV3,
      GetOrderV3: orderv1.OrderServiceService.getOrderV3,
      ListOrdersV3: orderv1.OrderServiceService.listOrdersV3,
      UpdateOrderStatusV3: orderv1.OrderServiceService.updateOrderStatusV3,
    },
  });
}

type MediaV3Method = keyof MediaProxy;
export type DormantMediaV3Proxy = DormantV3Proxy<MediaProxy, MediaV3Method>;

export function getDormantMediaV3(
  client: ClientGrpc,
  policy: DormantV3SigningPolicy,
): DormantMediaV3Proxy {
  return bindDormantV3<MediaProxy, MediaV3Method>({
    client,
    serviceName: "MediaService",
    target: MEDIA_SERVICE_TARGET,
    policy,
    bindings: {
      GetByIdV3: media.MediaServiceService.getByIdV3,
      ListPublicLibraryV3: media.MediaServiceService.listPublicLibraryV3,
      ListProtectedLibraryV3: media.MediaServiceService.listProtectedLibraryV3,
      ListStrictLibraryV3: media.MediaServiceService.listStrictLibraryV3,
      ListMyProtectedLibraryV3:
        media.MediaServiceService.listMyProtectedLibraryV3,
      PresignPublicLibraryUploadV3:
        media.MediaServiceService.presignPublicLibraryUploadV3,
      PresignProtectedLibraryUploadV3:
        media.MediaServiceService.presignProtectedLibraryUploadV3,
      PresignStrictLibraryUploadV3:
        media.MediaServiceService.presignStrictLibraryUploadV3,
      FinalizePublicLibraryUploadV3:
        media.MediaServiceService.finalizePublicLibraryUploadV3,
      FinalizeProtectedLibraryUploadV3:
        media.MediaServiceService.finalizeProtectedLibraryUploadV3,
      FinalizeStrictLibraryUploadV3:
        media.MediaServiceService.finalizeStrictLibraryUploadV3,
      CreatePublicLibraryReadUrlV3:
        media.MediaServiceService.createPublicLibraryReadUrlV3,
      CreateProtectedLibraryReadUrlV3:
        media.MediaServiceService.createProtectedLibraryReadUrlV3,
      CreateStrictLibraryReadUrlV3:
        media.MediaServiceService.createStrictLibraryReadUrlV3,
      CreateMyProtectedReadUrlV3:
        media.MediaServiceService.createMyProtectedReadUrlV3,
      DeleteProtectedLibraryByIdV3:
        media.MediaServiceService.deleteProtectedLibraryByIdV3,
      DeleteStrictLibraryByIdV3:
        media.MediaServiceService.deleteStrictLibraryByIdV3,
      PreviewPublicLibraryDeleteV3:
        media.MediaServiceService.previewPublicLibraryDeleteV3,
      ConfirmPublicLibraryDeleteV3:
        media.MediaServiceService.confirmPublicLibraryDeleteV3,
    },
  });
}
