import { Metadata, status } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { productv1 } from "@nebula/protos";
import { AUTHORIZATION_HEADER, X_REQUEST_ID_HEADER } from "@nebula/grpc-auth";
import { of, throwError } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayProductApiService } from "../src/product/gateway-product-api.service";
import {
  GatewayDiscountType,
  GatewayProductAvailability,
  GatewayProductStatus,
} from "../src/product/product-api.dto";

const PRODUCT_KEY = {
  id: "gateway-product-v1",
  secret: "gateway-product-api-test-secret-000000001",
};
const PRODUCT_ID = "d90a947b-3717-44f3-aa21-f6a92767f65c";

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-product-api-123",
  applicationId: "admin-web-local",
  applicationProfile: "admin-web",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "admin-web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function gatewayRequest(authenticated: boolean): GatewayHttpRequest {
  const request = {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "anonymous" },
  } as unknown as GatewayHttpRequest;
  if (authenticated) {
    request.actor = {
      kind: "authenticated",
      identity: {
        userId: "admin-1",
        role: "admin",
        sessionRef: "session-ref-1",
      },
    };
    request.user = request.actor.identity;
    request.accessToken = "verified-admin-token";
  }
  return request;
}

function product(
  overrides: Partial<productv1.Product> = {},
): productv1.Product {
  return productv1.Product.create({
    id: PRODUCT_ID,
    title: "Desk",
    status: GatewayProductStatus.ACTIVE,
    price: 100,
    effectivePrice: 100,
    availability: GatewayProductAvailability.AVAILABLE,
    version: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    ...overrides,
  });
}

function createHarness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn((_request: unknown, _metadata?: unknown) => {
    void _request;
    void _metadata;
    return of({});
  });
  const raw = {
    UpdateImageMetadata: overrides.UpdateImageMetadata ?? unused,
    ReserveCheckoutStock: overrides.ReserveCheckoutStock ?? unused,
    FinalizeCheckoutStock: overrides.FinalizeCheckoutStock ?? unused,
    CancelCheckoutStock: overrides.CancelCheckoutStock ?? unused,
    RestoreCheckoutStock: overrides.RestoreCheckoutStock ?? unused,
    CreateProduct: overrides.CreateProduct ?? unused,
    UpdateProduct: overrides.UpdateProduct ?? unused,
    GetProduct: overrides.GetProduct ?? unused,
    ListProducts: overrides.ListProducts ?? unused,
    AdminGetProduct: overrides.AdminGetProduct ?? unused,
    AdminListProducts: overrides.AdminListProducts ?? unused,
    CreateVariant: overrides.CreateVariant ?? unused,
    UpdateVariant: overrides.UpdateVariant ?? unused,
    DeleteVariant: overrides.DeleteVariant ?? unused,
    DeleteProduct: overrides.DeleteProduct ?? unused,
    RestoreProduct: overrides.RestoreProduct ?? unused,
    HardDeleteProduct: overrides.HardDeleteProduct ?? unused,
    ApplyDiscountBulk: overrides.ApplyDiscountBulk ?? unused,
    AddImages: overrides.AddImages ?? unused,
    ListGallery: overrides.ListGallery ?? unused,
    AdminListGallery: overrides.AdminListGallery ?? unused,
    ReorderImages: overrides.ReorderImages ?? unused,
    RemoveImage: overrides.RemoveImage ?? unused,
  };
  const client = {
    getService: jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return raw;
    }),
  } as unknown as ClientGrpc;
  return { service: new GatewayProductApiService(client), raw };
}

describe("GatewayProductApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "product-service": PRODUCT_KEY,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("uses only the public read RPC and rejects a widened lifecycle response", async () => {
    const listProducts = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: [product()], total: 1 });
    });
    const adminListProducts = jest.fn();
    const { service } = createHarness({
      ListProducts: listProducts,
      AdminListProducts: adminListProducts,
    });

    await expect(
      service.listPublic(gatewayRequest(false), { page: 1, limit: 20 }),
    ).resolves.toMatchObject({
      total: 1,
      data: [
        {
          availability: GatewayProductAvailability.AVAILABLE,
          stockQuantity: 0,
          version: 1,
        },
      ],
    });
    expect(listProducts.mock.calls[0]?.[0]).toMatchObject({
      page: 1,
      limit: 20,
    });
    expect(listProducts.mock.calls[0]?.[0]).not.toHaveProperty("status");
    expect(listProducts.mock.calls[0]?.[0]).not.toHaveProperty(
      "includeDeleted",
    );
    expect(listProducts.mock.calls[0]?.[0]).not.toHaveProperty("categoryId");
    expect(adminListProducts).not.toHaveBeenCalled();

    const widened = createHarness({
      ListProducts: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          data: [product({ status: GatewayProductStatus.DRAFT })],
          total: 1,
        });
      }),
    });
    await expect(
      widened.service.listPublic(gatewayRequest(false), {}),
    ).rejects.toMatchObject({ status: 502 });

    const depleted = createHarness({
      ListProducts: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          data: [
            product({
              trackInventory: true,
              stockQuantity: 0,
              availability: GatewayProductAvailability.OUT_OF_STOCK,
            }),
          ],
          total: 1,
        });
      }),
    });
    await expect(
      depleted.service.listPublic(gatewayRequest(false), {}),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("preserves omission for optional public and admin list fields", async () => {
    const listProducts = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: [], total: 0 });
    });
    const adminListProducts = jest.fn(
      (_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [], total: 0 });
      },
    );
    const { service } = createHarness({
      ListProducts: listProducts,
      AdminListProducts: adminListProducts,
    });

    await service.listPublic(gatewayRequest(false), {});
    await service.listAdmin(gatewayRequest(true), {});

    expect(listProducts.mock.calls[0]?.[0]).toEqual({});
    expect(adminListProducts.mock.calls[0]?.[0]).toEqual({});
  });

  it("maps a Product read outage and a stale write to distinct HTTP failures", async () => {
    const { service } = createHarness({
      ListProducts: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return throwError(() => ({
          code: status.UNAVAILABLE,
          details: "offline",
        }));
      }),
      UpdateProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return throwError(() => ({
          code: status.ABORTED,
          details: "stale_version",
        }));
      }),
    });

    await expect(
      service.listPublic(gatewayRequest(false), {}),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      service.update(gatewayRequest(true), PRODUCT_ID, {
        title: "Revised desk",
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("maps external content and preserves a sparse update patch", async () => {
    const createProduct = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const updateProduct = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const { service } = createHarness({
      CreateProduct: createProduct,
      UpdateProduct: updateProduct,
    });

    await service.create(gatewayRequest(true), {
      title: "Desk",
      price: 100,
      content: "Solid oak",
      trackInventory: true,
      stockQuantity: 4,
    });
    expect(createProduct.mock.calls[0]?.[0]).toEqual({
      data: {
        title: "Desk",
        price: 100,
        description: "Solid oak",
        trackInventory: true,
        stockQuantity: 4,
      },
    });

    await service.update(gatewayRequest(true), PRODUCT_ID, {
      content: "Updated",
      promoActive: false,
      expectedVersion: 7,
    });
    const patch = updateProduct.mock.calls[0]?.[0] as {
      id: string;
      data: Record<string, unknown>;
      expectedVersion: number;
    };
    expect(patch.id).toBe(PRODUCT_ID);
    expect(patch.data).toEqual({ description: "Updated", promoActive: false });
    expect(patch).toMatchObject({ expectedVersion: 7 });

    const metadata = updateProduct.mock.calls[0]?.[1] as Metadata;
    expect(metadata.get(AUTHORIZATION_HEADER)).toEqual([
      "Bearer verified-admin-token",
    ]);
    expect(metadata.get(X_REQUEST_ID_HEADER)).toEqual([
      requestContext.requestId,
    ]);
  });

  it("forwards thumbnail Media IDs and an explicit thumbnail clear", async () => {
    const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const createProduct = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const updateProduct = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const { service } = createHarness({
      CreateProduct: createProduct,
      UpdateProduct: updateProduct,
    });

    await service.create(gatewayRequest(true), {
      title: "Desk",
      price: 100,
      thumbnailMediaId: mediaId,
    });
    expect(createProduct.mock.calls[0]?.[0]).toEqual({
      data: { title: "Desk", price: 100, thumbnailMediaId: mediaId },
    });

    await service.update(gatewayRequest(true), PRODUCT_ID, {
      clearThumbnailMedia: true,
      expectedVersion: 1,
    });
    expect(updateProduct.mock.calls[0]?.[0]).toEqual({
      id: PRODUCT_ID,
      data: { clearThumbnailMedia: true },
      expectedVersion: 1,
    });
  });

  it("rejects an unverified public thumbnail URL from Product", async () => {
    const legacy = createHarness({
      GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          data: product({ thumbnailUrl: "https://unknown.test/image.png" }),
        });
      }),
    });
    await expect(
      legacy.service.getPublic(gatewayRequest(false), PRODUCT_ID),
    ).rejects.toMatchObject({ status: 502 });

    const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const verified = createHarness({
      GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          data: product({
            thumbnailMediaId: mediaId,
            thumbnailUrl: `/api/v1/media/render/${mediaId}`,
          }),
        });
      }),
    });
    await expect(
      verified.service.getPublic(gatewayRequest(false), PRODUCT_ID),
    ).resolves.toMatchObject({ thumbnailMediaId: mediaId });
  });

  it("omits legacy URL fields from public, admin, list, and write responses", async () => {
    const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const data = product({
      thumbnailMediaId: mediaId,
      thumbnailUrl: `/api/v1/media/render/${mediaId}`,
      model3dUrl: "https://provider.test/model.glb",
      model3dPosterUrl: "https://provider.test/poster.jpg",
      vrPlanImageUrl: "https://provider.test/plan.jpg",
    });
    const { service } = createHarness({
      GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data });
      }),
      AdminGetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data });
      }),
      ListProducts: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [data], total: 1 });
      }),
      AdminListProducts: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: [data], total: 1 });
      }),
      CreateProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data });
      }),
    });
    const responses = [
      await service.getPublic(gatewayRequest(false), PRODUCT_ID),
      await service.getAdmin(gatewayRequest(true), PRODUCT_ID),
      ...(await service.listPublic(gatewayRequest(false), {})).data,
      ...(await service.listAdmin(gatewayRequest(true), {})).data,
      await service.create(gatewayRequest(true), { title: "Desk", price: 100 }),
    ];
    for (const response of responses) {
      expect(response.thumbnailMediaId).toBe(mediaId);
      for (const field of [
        "thumbnailUrl",
        "model3dUrl",
        "model3dPosterUrl",
        "vrPlanImageUrl",
      ]) {
        expect(response).not.toHaveProperty(field);
      }
    }
  });

  it("omits gallery URLs while retaining legacy row IDs for admin repair", async () => {
    const images = [
      {
        id: "legacy-image",
        mediaId: "",
        url: "https://provider.test/legacy.jpg",
        alt: "legacy",
        sort: 0,
        deletedAt: "",
      },
      {
        id: "empty-legacy-image",
        mediaId: "",
        url: "",
        alt: "",
        sort: 1,
        deletedAt: "",
      },
    ];
    const { service } = createHarness({
      AdminListGallery: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ productId: PRODUCT_ID, images });
      }),
    });
    const response = await service.listGallery(
      gatewayRequest(true),
      PRODUCT_ID,
      false,
    );
    expect(response.map((image) => image.id)).toEqual([
      "legacy-image",
      "empty-legacy-image",
    ]);
    response.forEach((image) => expect(image).not.toHaveProperty("url"));
  });

  it("normalizes the legacy empty discount response and rejects unknown values", async () => {
    const compatible = createHarness({
      GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: product({ discountType: "" }) });
      }),
    });
    await expect(
      compatible.service.getPublic(gatewayRequest(false), PRODUCT_ID),
    ).resolves.toMatchObject({ discountType: GatewayDiscountType.NONE });

    const invalid = createHarness({
      GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ data: product({ discountType: "SURPRISE" }) });
      }),
    });
    await expect(
      invalid.service.getPublic(gatewayRequest(false), PRODUCT_ID),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("preserves omission in a partial bulk discount request", async () => {
    const applyDiscountBulk = jest.fn(
      (_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ updated: 2 });
      },
    );
    const { service } = createHarness({ ApplyDiscountBulk: applyDiscountBulk });

    await expect(
      service.applyDiscount(gatewayRequest(true), {
        discountActive: false,
      }),
    ).resolves.toEqual({ updated: 2 });
    expect(applyDiscountBulk.mock.calls[0]?.[0]).toEqual({
      discountActive: false,
    });
  });

  it("preserves omitted gallery sort while retaining explicit zero", async () => {
    const addImages = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ productId: PRODUCT_ID, images: [] });
    });
    const { service } = createHarness({ AddImages: addImages });
    const firstMediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const secondMediaId = "0e84b76b-ad9c-40d8-84f2-f93024ee840d";

    await service.addImages(gatewayRequest(true), PRODUCT_ID, {
      images: [{ mediaId: firstMediaId }, { mediaId: secondMediaId, sort: 0 }],
    });

    expect(addImages.mock.calls[0]?.[0]).toEqual({
      productId: PRODUCT_ID,
      images: [
        { url: "", mediaId: firstMediaId },
        { url: "", mediaId: secondMediaId, sort: 0 },
      ],
    });

    await expect(
      service.addImages(gatewayRequest(true), PRODUCT_ID, {
        images: [
          { mediaId: firstMediaId, url: "https://cdn.example/unsafe.jpg" },
        ],
      }),
    ).rejects.toThrow("gallery_media_id_required");
    expect(addImages).toHaveBeenCalledTimes(1);
  });

  it("rejects deleted public gallery rows and mismatched product IDs", async () => {
    const deleted = createHarness({
      ListGallery: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          productId: PRODUCT_ID,
          images: [
            {
              id: "image-1",
              url: "https://cdn/image.jpg",
              alt: "",
              sort: 0,
              deletedAt: "2026-08-15T00:00:00.000Z",
            },
          ],
        });
      }),
    });
    await expect(
      deleted.service.listGallery(gatewayRequest(false), PRODUCT_ID, true),
    ).rejects.toMatchObject({ status: 502 });

    const mismatch = createHarness({
      AdminListGallery: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({ productId: "another-product", images: [] });
      }),
    });
    await expect(
      mismatch.service.listGallery(gatewayRequest(true), PRODUCT_ID, false),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("requires Media-backed URLs on public gallery responses", async () => {
    const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const valid = createHarness({
      ListGallery: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          productId: PRODUCT_ID,
          images: [
            {
              id: "image-1",
              mediaId,
              url: `/api/v1/media/render/${mediaId}`,
              alt: "",
              sort: 0,
              deletedAt: "",
            },
          ],
        });
      }),
    });
    await expect(
      valid.service.listGallery(gatewayRequest(false), PRODUCT_ID, true),
    ).resolves.toMatchObject([{ mediaId }]);

    const legacy = createHarness({
      ListGallery: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          productId: PRODUCT_ID,
          images: [
            {
              id: "image-1",
              mediaId: "",
              url: "https://legacy.test/image.png",
              alt: "",
              sort: 0,
              deletedAt: "",
            },
          ],
        });
      }),
    });
    await expect(
      legacy.service.listGallery(gatewayRequest(false), PRODUCT_ID, true),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("preserves sparse variant patches and explicit zero/false override values", async () => {
    const updateVariant = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const deleteVariant = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ data: product() });
    });
    const { service } = createHarness({
      UpdateVariant: updateVariant,
      DeleteVariant: deleteVariant,
    });
    await service.updateVariant(gatewayRequest(true), PRODUCT_ID, "variant-1", {
      expectedVersion: 3,
      stockQuantity: 0,
      active: false,
      priceOverride: 0,
      sortOrder: 0,
    });
    expect(updateVariant.mock.calls[0]?.[0]).toEqual({
      productId: PRODUCT_ID,
      variantId: "variant-1",
      expectedVersion: 3,
      data: {
        options: {},
        replaceOptions: false,
        clearPriceOverride: false,
        stockQuantity: 0,
        active: false,
        priceOverride: 0,
        sortOrder: 0,
      },
    });
    await service.updateVariant(gatewayRequest(true), PRODUCT_ID, "variant-1", {
      expectedVersion: 4,
      clearPriceOverride: true,
      options: { Color: "Red" },
    });
    expect(updateVariant.mock.calls[1]?.[0]).toEqual({
      productId: PRODUCT_ID,
      variantId: "variant-1",
      expectedVersion: 4,
      data: {
        options: { Color: "Red" },
        replaceOptions: true,
        clearPriceOverride: true,
      },
    });
    await service.deleteVariant(
      gatewayRequest(true),
      PRODUCT_ID,
      "variant-1",
      5,
    );
    expect(deleteVariant.mock.calls[0]?.[0]).toEqual({
      productId: PRODUCT_ID,
      variantId: "variant-1",
      expectedVersion: 5,
    });
  });

  it.each([undefined, 0, 30])(
    "returns numeric/null variant overrides for public and admin reads: %s",
    async (priceOverride) => {
      const data = product({
        variants: [
          productv1.ProductVariant.create({
            id: "variant-1",
            productId: PRODUCT_ID,
            sku: "DESK-BLUE",
            options: { Color: "Blue" },
            price: priceOverride ?? 100,
            priceOverride,
            effectivePrice: priceOverride ?? 100,
            stockQuantity: 1,
            active: true,
            availability: "AVAILABLE",
          }),
        ],
      });
      const { service } = createHarness({
        GetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
          void _request;
          void _metadata;
          return of({ data });
        }),
        AdminGetProduct: jest.fn((_request: unknown, _metadata?: unknown) => {
          void _request;
          void _metadata;
          return of({ data });
        }),
      });
      for (const response of [
        await service.getPublic(gatewayRequest(false), PRODUCT_ID),
        await service.getAdmin(gatewayRequest(true), PRODUCT_ID),
      ]) {
        expect(response.variants[0].priceOverride).toBe(priceOverride ?? null);
        expect(response.variants[0]).toHaveProperty("priceOverride");
      }
    },
  );

  it("passes versioned variant creation and maps its public commercial fields", async () => {
    const createVariant = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        data: product({
          selectionMode: "VARIANT",
          variants: [
            productv1.ProductVariant.create({
              id: "variant-1",
              productId: PRODUCT_ID,
              sku: "DESK-BLUE",
              options: { Color: "Blue" },
              price: 120,
              priceOverride: 120,
              effectivePrice: 120,
              stockQuantity: 2,
              active: true,
              availability: "AVAILABLE",
              sortOrder: 0,
            }),
          ],
        }),
      });
    });
    const { service } = createHarness({ CreateVariant: createVariant });
    const result = await service.createVariant(
      gatewayRequest(true),
      PRODUCT_ID,
      {
        sku: "DESK-BLUE",
        options: { Color: "Blue" },
        stockQuantity: 2,
        priceOverride: 120,
        expectedVersion: 1,
      },
    );
    expect(createVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: PRODUCT_ID,
        expectedVersion: 1,
        data: expect.objectContaining({
          sku: "DESK-BLUE",
          options: { Color: "Blue" },
        }),
      }),
      expect.any(Metadata),
    );
    expect(result.selectionMode).toBe("VARIANT");
    expect(result.variants[0]).toMatchObject({
      sku: "DESK-BLUE",
      price: 120,
      priceOverride: 120,
    });
  });

  it("preserves omission versus decorative alt when adding gallery images", async () => {
    const add = jest.fn(
      (_request: productv1.AddImagesRequest, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of(productv1.GalleryResponse.create({ productId: PRODUCT_ID }));
      },
    );
    const { service } = createHarness({ AddImages: add });
    await service.addImages(gatewayRequest(true), PRODUCT_ID, {
      images: [{ mediaId: PRODUCT_ID }, { mediaId: PRODUCT_ID, alt: "" }],
    });
    expect(add.mock.calls[0]?.[0].images[0]).not.toHaveProperty("alt");
    expect(add.mock.calls[0]?.[0].images[1].alt).toBe("");
  });
  it("encodes thumbnail reset without materializing omitted text", async () => {
    const update = jest.fn(
      (_request: productv1.UpdateProductRequest, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          data: product({
            thumbnailTitle: "Inherited",
            thumbnailAlt: "",
            version: 2,
          }),
        });
      },
    );
    const { service } = createHarness({ UpdateProduct: update });
    await service.update(gatewayRequest(true), PRODUCT_ID, {
      expectedVersion: 1,
      thumbnailTitle: null,
      thumbnailAlt: "",
    });
    expect(update.mock.calls[0]?.[0].data).toMatchObject({
      clearThumbnailTitle: true,
      thumbnailAlt: "",
    });
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty("thumbnailTitle");
  });
});
