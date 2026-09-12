import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  AUTH_SERVICE_TARGET,
  BLOG_SERVICE_TARGET,
  MEDIA_SERVICE_TARGET,
  ORDER_SERVICE_TARGET,
  PRODUCT_SERVICE_TARGET,
  SETTINGS_SERVICE_TARGET,
  USER_SERVICE_TARGET,
  X_S2S_PATH_HEADER,
  X_S2S_TARGET_HEADER,
  X_S2S_VERSION_HEADER,
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
import { firstValueFrom, of, type Observable } from "rxjs";
import {
  getDormantAuthV3,
  getDormantBlogTaxonomyV3,
  getDormantBlogV3,
  getDormantMediaV3,
  getDormantOrderV3,
  getDormantProductTaxonomyV3,
  getDormantProductV3,
  getDormantSettingsV3,
  getDormantUserV3,
  type DormantV3SigningPolicy,
} from "../src/dormant-v3.client";

type Definition = { path: string };
type CallableProxy = Record<string, (request: object) => Observable<unknown>>;

const policy: DormantV3SigningPolicy = {
  kind: "gateway",
  serviceName: "gateway",
  key: {
    id: "gateway-dormant-v3-test-key",
    secret: "gateway-dormant-v3-test-secret-00000000001",
  },
  requestId: "dormant-v3-ingress-request",
  context: {
    version: "3",
    identityRealmId: "b1000000-0000-4000-8000-000000000001",
    subjectId: "d1000000-0000-4000-8000-000000000001",
    sessionRef: `sr2_${"A".repeat(43)}`,
    sessionRefKeyId: "b5100000-0000-4000-8000-000000000001",
    authenticationAuthorityRef: "b2000000-0000-4000-8000-000000000001",
    application: {
      applicationId: "a4000000-0000-4000-8000-000000000001",
      audience: "urn:nebula:application:a4000000-0000-4000-8000-000000000001",
      applicationPolicyRevision: "1",
      federationTrustId: null,
      federationTrustRevision: null,
    },
    target: {
      kind: "APPLICATION",
      tenantId: "a1000000-0000-4000-8000-000000000001",
      siteId: "a2000000-0000-4000-8000-000000000001",
    },
    actorAuthority: {
      kind: "MEMBERSHIP",
      membershipId: "c1000000-0000-4000-8000-000000000001",
      membershipEpochRef: `meg1_${"C".repeat(43)}`,
      roleGrantId: "c3000000-0000-4000-8000-000000000001",
      effectiveRole: "SITE_ADMIN",
      parentRelationshipId: null,
    },
    authorityRef: `ar2_${"B".repeat(43)}`,
    authorityRefKeyId: "b5200000-0000-4000-8000-000000000001",
    resolvedAtUnixMs: "1750000000000",
  },
};

const cases: Array<{
  serviceName: string;
  target: string;
  definitions: Record<string, Definition>;
  create: (client: ClientGrpc, signing: DormantV3SigningPolicy) => object;
}> = [
  {
    serviceName: "AuthService",
    target: AUTH_SERVICE_TARGET,
    create: getDormantAuthV3,
    definitions: {
      RefreshTokensV3: authv1.AuthServiceService.refreshTokensV3,
      LogoutV3: authv1.AuthServiceService.logoutV3,
      GetProfileV3: authv1.AuthServiceService.getProfileV3,
    },
  },
  {
    serviceName: "UserService",
    target: USER_SERVICE_TARGET,
    create: getDormantUserV3,
    definitions: {
      GetUserV3: userv1.UserServiceService.getUserV3,
      ListUsersV3: userv1.UserServiceService.listUsersV3,
      UpdateProfileV3: userv1.UserServiceService.updateProfileV3,
    },
  },
  {
    serviceName: "SettingsService",
    target: SETTINGS_SERVICE_TARGET,
    create: getDormantSettingsV3,
    definitions: {
      SetStringV3: settings.SettingsServiceService.setStringV3,
      DeleteStringV3: settings.SettingsServiceService.deleteStringV3,
    },
  },
  {
    serviceName: "ProductService",
    target: PRODUCT_SERVICE_TARGET,
    create: getDormantProductV3,
    definitions: {
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
  },
  {
    serviceName: "ProductTaxonomyService",
    target: PRODUCT_SERVICE_TARGET,
    create: getDormantProductTaxonomyV3,
    definitions: {
      CreateV3: productv1.ProductTaxonomyServiceService.createV3,
      UpdateV3: productv1.ProductTaxonomyServiceService.updateV3,
      DeleteV3: productv1.ProductTaxonomyServiceService.deleteV3,
    },
  },
  {
    serviceName: "BlogService",
    target: BLOG_SERVICE_TARGET,
    create: getDormantBlogV3,
    definitions: {
      CreatePostV3: blogv1.BlogServiceService.createPostV3,
      UpdatePostV3: blogv1.BlogServiceService.updatePostV3,
      DeletePostV3: blogv1.BlogServiceService.deletePostV3,
    },
  },
  {
    serviceName: "BlogTaxonomyService",
    target: BLOG_SERVICE_TARGET,
    create: getDormantBlogTaxonomyV3,
    definitions: {
      CreateV3: blogv1.BlogTaxonomyServiceService.createV3,
      UpdateV3: blogv1.BlogTaxonomyServiceService.updateV3,
      DeleteV3: blogv1.BlogTaxonomyServiceService.deleteV3,
    },
  },
  {
    serviceName: "OrderService",
    target: ORDER_SERVICE_TARGET,
    create: getDormantOrderV3,
    definitions: {
      GetCartV3: orderv1.OrderServiceService.getCartV3,
      AddToCartV3: orderv1.OrderServiceService.addToCartV3,
      UpdateCartItemV3: orderv1.OrderServiceService.updateCartItemV3,
      RemoveCartItemV3: orderv1.OrderServiceService.removeCartItemV3,
      CheckoutV3: orderv1.OrderServiceService.checkoutV3,
      GetOrderV3: orderv1.OrderServiceService.getOrderV3,
      ListOrdersV3: orderv1.OrderServiceService.listOrdersV3,
      UpdateOrderStatusV3: orderv1.OrderServiceService.updateOrderStatusV3,
    },
  },
  {
    serviceName: "MediaService",
    target: MEDIA_SERVICE_TARGET,
    create: getDormantMediaV3,
    definitions: {
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
  },
];

function metadataText(metadata: Metadata, key: string): string {
  const values = metadata.get(key);
  expect(values).toHaveLength(1);
  return String(values[0]);
}

describe("dormant context-v3 typed service wrappers", () => {
  it("covers the complete protected receiver inventory", () => {
    expect(
      cases.reduce(
        (total, current) => total + Object.keys(current.definitions).length,
        0,
      ),
    ).toBe(56);
  });

  it.each(cases)(
    "$serviceName signs every v3 receiver against its generated path",
    async ({ serviceName, target, definitions, create }) => {
      const sentMetadata = new Map<string, Metadata>();
      const raw = Object.fromEntries(
        Object.keys(definitions).map((methodName) => [
          methodName,
          jest.fn(
            (request: unknown, metadata?: Metadata): Observable<unknown> => {
              void request;
              if (metadata) sentMetadata.set(methodName, metadata);
              return of({});
            },
          ),
        ]),
      );
      const client = {
        getService: jest.fn((requestedName: string) => {
          expect(requestedName).toBe(serviceName);
          return raw;
        }),
      } as unknown as ClientGrpc;
      const proxy = create(client, policy) as CallableProxy;

      expect(Object.keys(proxy)).toEqual(Object.keys(definitions));
      for (const [methodName, definition] of Object.entries(definitions)) {
        await firstValueFrom(proxy[methodName]({}));
        const sent = sentMetadata.get(methodName);
        expect(sent).toBeInstanceOf(Metadata);
        if (!sent) throw new Error(`metadata_missing_${methodName}`);
        expect(metadataText(sent, X_S2S_TARGET_HEADER)).toBe(target);
        expect(metadataText(sent, X_S2S_PATH_HEADER)).toBe(definition.path);
        expect(metadataText(sent, X_S2S_VERSION_HEADER)).toBe("3");
      }
    },
  );
});
