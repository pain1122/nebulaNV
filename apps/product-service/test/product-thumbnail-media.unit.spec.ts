import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import {
  Prisma,
  ProductSelectionMode,
  ProductStatus,
} from "../prisma/generated";
import { ProductServiceImpl } from "../src/product/product.service";
import type { PrismaService } from "../src/prisma.service";

const productId = "344b307f-b1bf-4704-b342-670ef74dd613";
const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
const renderPath = `/api/v1/media/render/${mediaId}`;

function client(service: object): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue(service),
  } as unknown as ClientGrpc;
}

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: productId,
    title: "Chair",
    slug: "chair",
    sku: "CHAIR",
    status: ProductStatus.ACTIVE,
    selectionMode: ProductSelectionMode.BASE,
    price: new Prisma.Decimal(10),
    currency: "USD",
    categoryId: "11111111-1111-4111-8111-111111111111",
    brandId: null,
    tagIds: [],
    tags: [],
    thumbnailUrl: null,
    thumbnailMediaId: null,
    trackInventory: false,
    stockQuantity: 0,
    version: 1,
    deletedAt: null,
    variants: [],
    ...overrides,
  };
}

function harness(response = of({ mediaId, role: "THUMBNAIL", renderPath })) {
  const update = jest
    .fn()
    .mockResolvedValue(product({ thumbnailMediaId: mediaId, version: 2 }));
  const findFirst = jest.fn().mockResolvedValue(product());
  const findUnique = jest.fn().mockResolvedValue(product());
  const createMany = jest.fn().mockResolvedValue({ count: 1 });
  const prisma = {
    product: {
      update,
      findFirst,
      findUnique,
    },
    productGalleryImage: {
      findFirst: jest.fn().mockResolvedValue(null),
      createMany,
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
  const resolve = jest.fn().mockReturnValue(response);
  const mediaClient = client(
    new Proxy(
      {},
      {
        get: (_target, method) =>
          method === "ResolveProductReference" ? resolve : jest.fn(),
      },
    ),
  );
  const settingsClient = client(
    new Proxy(
      {},
      {
        get: (_target, method) =>
          method === "GetString"
            ? () => of({ found: true, value: "USD" })
            : jest.fn(),
      },
    ),
  );
  const taxonomyClient = client(
    new Proxy(
      {},
      {
        get: (_target, method) =>
          method === "GetTaxonomy"
            ? ({ id }: { id: string }) =>
                of({
                  data: {
                    id,
                    scope: "product",
                    kind: "category.default",
                    isHidden: false,
                  },
                })
            : jest.fn(),
      },
    ),
  );
  return {
    service: new ProductServiceImpl(
      prisma,
      taxonomyClient,
      settingsClient,
      mediaClient,
    ),
    update,
    findFirst,
    findUnique,
    resolve,
    createMany,
  };
}

describe("Product thumbnail Media authority", () => {
  const oldEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...oldEnv,
      SVC_NAME: "product-service",
      S2S_OUTBOUND_KEYS: JSON.stringify({
        "taxonomy-service": {
          id: "product-taxonomy-test-v1",
          secret: "test-product-to-taxonomy-key-000000000001",
        },
        "settings-service": {
          id: "product-settings-test-v1",
          secret: "test-product-to-settings-key-000000000001",
        },
        "media-service": {
          id: "product-media-test-v1",
          secret: "test-product-to-media-key-000000000001",
        },
      }),
    };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it("stores a Media ID only after the Media-owned resolver approves it", async () => {
    const { service, update, resolve } = harness();

    await expect(
      service.update(productId, { thumbnailMediaId: mediaId }, 1),
    ).resolves.toMatchObject({
      data: { thumbnailMediaId: mediaId, thumbnailUrl: renderPath },
    });
    expect(resolve).toHaveBeenCalledWith(
      { id: mediaId, role: "THUMBNAIL" },
      expect.anything(),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnailMediaId: mediaId,
          thumbnailUrl: null,
        }),
      }),
    );
  });

  it("does not write when Media is missing", async () => {
    const { service, update } = harness(
      throwError(() => ({
        code: status.NOT_FOUND,
        details: "media_not_found",
      })),
    );

    await expect(
      service.update(productId, { thumbnailMediaId: mediaId }, 1),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not write a thumbnail or gallery row when Media is unavailable", async () => {
    const { service, update, createMany } = harness(
      throwError(() => ({
        code: status.UNAVAILABLE,
        details: "media_unavailable",
      })),
    );

    await expect(
      service.update(productId, { thumbnailMediaId: mediaId }, 1),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      service.addImages(productId, [{ mediaId }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(update).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("denies an inconsistent Media resolver response", async () => {
    const { service, update } = harness(
      of({ mediaId: productId, role: "THUMBNAIL", renderPath }),
    );

    await expect(
      service.update(productId, { thumbnailMediaId: mediaId }, 1),
    ).rejects.toEqual(
      new ServiceUnavailableException("product_media_resolution_invalid"),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a new raw URL and denies a legacy URL on public reads", async () => {
    const { service, update, findFirst, findUnique } = harness();
    await expect(
      service.update(
        productId,
        { thumbnailUrl: "https://other.test/a.png" },
        1,
      ),
    ).rejects.toEqual(new BadRequestException("thumbnail_media_id_required"));
    expect(update).not.toHaveBeenCalled();

    findFirst.mockResolvedValue(
      product({ thumbnailUrl: "https://legacy.test/a.png" }),
    );
    findUnique.mockResolvedValue(
      product({ thumbnailUrl: "https://legacy.test/a.png" }),
    );
    await expect(service.getPublic(productId)).rejects.toMatchObject({
      status: 503,
    });
  });

  it.each(
    ["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"].flatMap((field) =>
      ["https://provider.test/asset", "", null].map((value) => ({
        field,
        value,
      })),
    ),
  )(
    "rejects $field=$value before owner reads or writes",
    async ({ field, value }) => {
      const { service, findUnique, update, resolve } = harness();
      await expect(
        service.create({ title: "Chair", price: 10, [field]: value }),
      ).rejects.toEqual(
        new BadRequestException("product_deferred_media_url_disabled"),
      );
      await expect(
        service.update(productId, { [field]: value }, 1),
      ).rejects.toEqual(
        new BadRequestException("product_deferred_media_url_disabled"),
      );
      expect(findUnique).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(resolve).not.toHaveBeenCalled();
    },
  );

  it("suppresses stored legacy URLs in admin Product responses", async () => {
    const { service, findUnique } = harness();
    findUnique.mockResolvedValue(
      product({
        thumbnailUrl: "https://provider.test/legacy.jpg",
        model3dUrl: "https://provider.test/model.glb",
        model3dPosterUrl: "https://provider.test/poster.jpg",
        vrPlanImageUrl: "https://provider.test/plan.jpg",
      }),
    );
    const response = await service.getAdmin(productId);
    expect(response.data.thumbnailUrl).toBe("");
    for (const field of ["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"]) {
      expect(response.data).not.toHaveProperty(field);
    }
  });

  it("validates gallery Media IDs before inserting any row", async () => {
    const { service, resolve, createMany } = harness(
      of({ mediaId, role: "GALLERY", renderPath }),
    );

    await service.addImages(productId, [{ mediaId, alt: "front" }]);
    expect(resolve).toHaveBeenCalledWith(
      { id: mediaId, role: "GALLERY" },
      expect.anything(),
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          productId,
          mediaId,
          url: "",
          alt: "front",
          title: null,
          sortOrder: 0,
        },
      ],
    });

    const missing = harness(
      throwError(() => ({
        code: status.NOT_FOUND,
        details: "media_not_found",
      })),
    );
    await expect(
      missing.service.addImages(productId, [{ mediaId }]),
    ).rejects.toThrow();
    expect(missing.createMany).not.toHaveBeenCalled();
  });
});
