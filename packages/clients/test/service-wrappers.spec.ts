import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTH_SERVICE_TARGET,
  BLOG_SERVICE_TARGET,
  MEDIA_SERVICE_TARGET,
  ORDER_SERVICE_TARGET,
  PRODUCT_SERVICE_TARGET,
  TENANT_AUTHORITY_SERVICE_TARGET,
  USER_SERVICE_TARGET,
  X_REQUEST_ID_HEADER,
  X_S2S_PATH_HEADER,
  X_S2S_TARGET_HEADER,
} from "@nebula/grpc-auth";
import {
  authv1,
  blogv1,
  media,
  orderv1,
  productv1,
  tenantauthorityv1,
  userv1,
} from "@nebula/protos";
import { firstValueFrom, of, type Observable } from "rxjs";
import { getAuth } from "../src/auth.client";
import { getBlog, getBlogTaxonomy } from "../src/blog.client";
import { getMedia } from "../src/media.client";
import { getOrder } from "../src/order.client";
import { getProduct, getProductTaxonomy } from "../src/product.client";
import type { GrpcClientSigningPolicy } from "../src/s2s-metadata";
import { getTenantAuthority } from "../src/tenant-authority.client";
import { getUser } from "../src/user.client";

type Definition = { path: string };
type CallableProxy = Record<string, (request: object) => Observable<unknown>>;

const signingPolicy: GrpcClientSigningPolicy = {
  kind: "gateway",
  serviceName: "gateway",
  key: {
    id: "gateway-wrapper-test-v1",
    secret: "gateway-wrapper-test-secret-00000000000001",
  },
  requestId: "wrapper-ingress-request",
  context: {
    version: "1",
    applicationId: "storefront-web",
    tenantId: "tenant-main",
    siteId: "site-main",
    channelId: "web",
  },
};

const cases: Array<{
  serviceName: string;
  target: string;
  definitions: Record<string, Definition>;
  create: (client: ClientGrpc, policy: GrpcClientSigningPolicy) => object;
}> = [
  {
    serviceName: "TenantAuthorityService",
    target: TENANT_AUTHORITY_SERVICE_TARGET,
    create: (client, policy) => getTenantAuthority(client, policy),
    definitions: {
      ResolveApplicationRegistration:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveApplicationRegistration,
      ListAllowedWebOrigins:
        tenantauthorityv1.TenantAuthorityServiceService.listAllowedWebOrigins,
      ValidateTargetScope:
        tenantauthorityv1.TenantAuthorityServiceService.validateTargetScope,
      ResolveEntitlementScopeRef:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveEntitlementScopeRef,
      ResolveActorAuthorization:
        tenantauthorityv1.TenantAuthorityServiceService
          .resolveActorAuthorization,
    },
  },
  {
    serviceName: "AuthService",
    target: AUTH_SERVICE_TARGET,
    create: (client, policy) => getAuth(client, policy),
    definitions: {
      Register: authv1.AuthServiceService.register,
      ValidateUser: authv1.AuthServiceService.validateUser,
      GetTokens: authv1.AuthServiceService.getTokens,
      RefreshTokens: authv1.AuthServiceService.refreshTokens,
      Logout: authv1.AuthServiceService.logout,
      ValidateToken: authv1.AuthServiceService.validateToken,
      GetProfile: authv1.AuthServiceService.getProfile,
    },
  },
  {
    serviceName: "UserService",
    target: USER_SERVICE_TARGET,
    create: (client, policy) => getUser(client, policy),
    definitions: {
      GetUser: userv1.UserServiceService.getUser,
      ListUsers: userv1.UserServiceService.listUsers,
      UpdateProfile: userv1.UserServiceService.updateProfile,
    },
  },
  {
    serviceName: "ProductService",
    target: PRODUCT_SERVICE_TARGET,
    create: (client, policy) => getProduct(client, policy),
    definitions: {
      CreateProduct: productv1.ProductServiceService.createProduct,
      UpdateProduct: productv1.ProductServiceService.updateProduct,
      GetProduct: productv1.ProductServiceService.getProduct,
      ListProducts: productv1.ProductServiceService.listProducts,
      AdminGetProduct: productv1.ProductServiceService.adminGetProduct,
      AdminListProducts: productv1.ProductServiceService.adminListProducts,
      DeleteProduct: productv1.ProductServiceService.deleteProduct,
      RestoreProduct: productv1.ProductServiceService.restoreProduct,
      HardDeleteProduct: productv1.ProductServiceService.hardDeleteProduct,
      ApplyDiscountBulk: productv1.ProductServiceService.applyDiscountBulk,
      AddImages: productv1.ProductServiceService.addImages,
      ListGallery: productv1.ProductServiceService.listGallery,
      AdminListGallery: productv1.ProductServiceService.adminListGallery,
      ReorderImages: productv1.ProductServiceService.reorderImages,
      RemoveImage: productv1.ProductServiceService.removeImage,
    },
  },
  {
    serviceName: "ProductTaxonomyService",
    target: PRODUCT_SERVICE_TARGET,
    create: (client, policy) => getProductTaxonomy(client, policy),
    definitions: {
      List: productv1.ProductTaxonomyServiceService.list,
      Get: productv1.ProductTaxonomyServiceService.get,
      Create: productv1.ProductTaxonomyServiceService.create,
      Update: productv1.ProductTaxonomyServiceService.update,
      Delete: productv1.ProductTaxonomyServiceService.delete,
    },
  },
  {
    serviceName: "BlogService",
    target: BLOG_SERVICE_TARGET,
    create: (client, policy) => getBlog(client, policy),
    definitions: {
      ListPosts: blogv1.BlogServiceService.listPosts,
      GetPost: blogv1.BlogServiceService.getPost,
      CreatePost: blogv1.BlogServiceService.createPost,
      UpdatePost: blogv1.BlogServiceService.updatePost,
      DeletePost: blogv1.BlogServiceService.deletePost,
    },
  },
  {
    serviceName: "BlogTaxonomyService",
    target: BLOG_SERVICE_TARGET,
    create: (client, policy) => getBlogTaxonomy(client, policy),
    definitions: {
      List: blogv1.BlogTaxonomyServiceService.list,
      Get: blogv1.BlogTaxonomyServiceService.get,
      Create: blogv1.BlogTaxonomyServiceService.create,
      Update: blogv1.BlogTaxonomyServiceService.update,
      Delete: blogv1.BlogTaxonomyServiceService.delete,
    },
  },
  {
    serviceName: "OrderService",
    target: ORDER_SERVICE_TARGET,
    create: (client, policy) => getOrder(client, policy),
    definitions: {
      GetCart: orderv1.OrderServiceService.getCart,
      AddToCart: orderv1.OrderServiceService.addToCart,
      UpdateCartItem: orderv1.OrderServiceService.updateCartItem,
      RemoveCartItem: orderv1.OrderServiceService.removeCartItem,
      Checkout: orderv1.OrderServiceService.checkout,
      GetOrder: orderv1.OrderServiceService.getOrder,
      ListOrders: orderv1.OrderServiceService.listOrders,
      UpdateOrderStatus: orderv1.OrderServiceService.updateOrderStatus,
    },
  },
  {
    serviceName: "MediaService",
    target: MEDIA_SERVICE_TARGET,
    create: (client, policy) => getMedia(client, policy),
    definitions: {
      GetById: media.MediaServiceService.getById,
      ListPublicLibrary: media.MediaServiceService.listPublicLibrary,
      ListProtectedLibrary: media.MediaServiceService.listProtectedLibrary,
      ListStrictLibrary: media.MediaServiceService.listStrictLibrary,
      ListMyProtectedLibrary: media.MediaServiceService.listMyProtectedLibrary,
      PresignPublicLibraryUpload:
        media.MediaServiceService.presignPublicLibraryUpload,
      PresignProtectedLibraryUpload:
        media.MediaServiceService.presignProtectedLibraryUpload,
      PresignStrictLibraryUpload:
        media.MediaServiceService.presignStrictLibraryUpload,
      FinalizePublicLibraryUpload:
        media.MediaServiceService.finalizePublicLibraryUpload,
      FinalizeProtectedLibraryUpload:
        media.MediaServiceService.finalizeProtectedLibraryUpload,
      FinalizeStrictLibraryUpload:
        media.MediaServiceService.finalizeStrictLibraryUpload,
      CreatePublicLibraryReadUrl:
        media.MediaServiceService.createPublicLibraryReadUrl,
      CreateProtectedLibraryReadUrl:
        media.MediaServiceService.createProtectedLibraryReadUrl,
      CreateStrictLibraryReadUrl:
        media.MediaServiceService.createStrictLibraryReadUrl,
      CreateMyProtectedReadUrl:
        media.MediaServiceService.createMyProtectedReadUrl,
      DeleteProtectedLibraryById:
        media.MediaServiceService.deleteProtectedLibraryById,
      DeleteStrictLibraryById:
        media.MediaServiceService.deleteStrictLibraryById,
      PreviewPublicLibraryDelete:
        media.MediaServiceService.previewPublicLibraryDelete,
      ConfirmPublicLibraryDelete:
        media.MediaServiceService.confirmPublicLibraryDelete,
    },
  },
];

function metadataText(metadata: Metadata, key: string): string {
  const values = metadata.get(key);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

describe("manifest-selected typed service wrappers", () => {
  it.each(cases)(
    "$serviceName binds every selected method to its fixed generated definition",
    async ({ serviceName, target, definitions, create }) => {
      const sentMetadata = new Map<string, Metadata>();
      const raw = Object.fromEntries(
        Object.keys(definitions).map((methodName) => {
          const method = jest.fn(
            (request: unknown, metadata?: Metadata): Observable<unknown> => {
              void request;
              if (metadata) sentMetadata.set(methodName, metadata);
              return of({});
            },
          );
          return [methodName, method];
        }),
      );
      const client = {
        getService: jest.fn((requestedName: string) => {
          expect(requestedName).toBe(serviceName);
          return raw;
        }),
      } as unknown as ClientGrpc;
      const proxy = create(client, signingPolicy) as CallableProxy;

      expect(Object.keys(proxy)).toEqual(Object.keys(definitions));
      for (const [methodName, definition] of Object.entries(definitions)) {
        await firstValueFrom(proxy[methodName]({}));
        const sent = sentMetadata.get(methodName);
        expect(sent).toBeInstanceOf(Metadata);
        if (!sent) throw new Error(`metadata_missing_${methodName}`);
        expect(metadataText(sent, X_S2S_TARGET_HEADER)).toBe(target);
        expect(metadataText(sent, X_S2S_PATH_HEADER)).toBe(definition.path);
        expect(metadataText(sent, X_REQUEST_ID_HEADER)).toBe(
          "wrapper-ingress-request",
        );
      }
    },
  );
});
