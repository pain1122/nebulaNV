import { Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { productv1 } from "@nebula/protos";
import { AUTHORIZATION_HEADER, X_REQUEST_ID_HEADER } from "@nebula/grpc-auth";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayProductApiService } from "../src/product/gateway-product-api.service";
import { GatewayProductStatus } from "../src/product/product-api.dto";

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
  } as GatewayHttpRequest;
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
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    ...overrides,
  });
}

function createHarness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const raw = {
    CreateProduct: overrides.CreateProduct ?? unused,
    UpdateProduct: overrides.UpdateProduct ?? unused,
    GetProduct: overrides.GetProduct ?? unused,
    ListProducts: overrides.ListProducts ?? unused,
    AdminGetProduct: overrides.AdminGetProduct ?? unused,
    AdminListProducts: overrides.AdminListProducts ?? unused,
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
  const client = { getService: jest.fn(() => raw) } as unknown as ClientGrpc;
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
    const listProducts = jest.fn(() => of({ data: [product()], total: 1 }));
    const adminListProducts = jest.fn();
    const { service } = createHarness({
      ListProducts: listProducts,
      AdminListProducts: adminListProducts,
    });

    await expect(
      service.listPublic(gatewayRequest(false), { page: 1, limit: 20 }),
    ).resolves.toMatchObject({ total: 1 });
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
      ListProducts: jest.fn(() =>
        of({
          data: [product({ status: GatewayProductStatus.DRAFT })],
          total: 1,
        }),
      ),
    });
    await expect(
      widened.service.listPublic(gatewayRequest(false), {}),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("preserves omission for optional public and admin list fields", async () => {
    const listProducts = jest.fn(() => of({ data: [], total: 0 }));
    const adminListProducts = jest.fn(() => of({ data: [], total: 0 }));
    const { service } = createHarness({
      ListProducts: listProducts,
      AdminListProducts: adminListProducts,
    });

    await service.listPublic(gatewayRequest(false), {});
    await service.listAdmin(gatewayRequest(true), {});

    expect(listProducts.mock.calls[0]?.[0]).toEqual({});
    expect(adminListProducts.mock.calls[0]?.[0]).toEqual({});
  });

  it("maps external content and preserves a sparse update patch", async () => {
    const createProduct = jest.fn(() => of({ data: product() }));
    const updateProduct = jest.fn(() => of({ data: product() }));
    const { service } = createHarness({
      CreateProduct: createProduct,
      UpdateProduct: updateProduct,
    });

    await service.create(gatewayRequest(true), {
      title: "Desk",
      content: "Solid oak",
    });
    expect(createProduct.mock.calls[0]?.[0]).toMatchObject({
      data: { title: "Desk", description: "Solid oak" },
    });

    await service.update(gatewayRequest(true), PRODUCT_ID, {
      content: "Updated",
      promoActive: false,
    });
    const patch = updateProduct.mock.calls[0]?.[0] as {
      id: string;
      data: Record<string, unknown>;
    };
    expect(patch.id).toBe(PRODUCT_ID);
    expect(patch.data).toEqual({ description: "Updated", promoActive: false });

    const metadata = updateProduct.mock.calls[0]?.[1] as Metadata;
    expect(metadata.get(AUTHORIZATION_HEADER)).toEqual([
      "Bearer verified-admin-token",
    ]);
    expect(metadata.get(X_REQUEST_ID_HEADER)).toEqual([
      requestContext.requestId,
    ]);
  });

  it("rejects deleted public gallery rows and mismatched product IDs", async () => {
    const deleted = createHarness({
      ListGallery: jest.fn(() =>
        of({
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
        }),
      ),
    });
    await expect(
      deleted.service.listGallery(gatewayRequest(false), PRODUCT_ID, true),
    ).rejects.toMatchObject({ status: 502 });

    const mismatch = createHarness({
      AdminListGallery: jest.fn(() =>
        of({ productId: "another-product", images: [] }),
      ),
    });
    await expect(
      mismatch.service.listGallery(gatewayRequest(true), PRODUCT_ID, false),
    ).rejects.toMatchObject({ status: 502 });
  });
});
