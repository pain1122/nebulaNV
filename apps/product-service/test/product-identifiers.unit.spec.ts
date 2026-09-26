import { ConflictException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of } from "rxjs";
import type { PrismaService } from "../src/prisma.service";
import { Prisma, ProductStatus, type Product } from "../prisma/generated";
import { ProductServiceImpl } from "../src/product/product.service";

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const previousServiceName = process.env.SVC_NAME;
const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

function client(service: object): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue(service),
  } as unknown as ClientGrpc;
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "desk-chair",
    title: "Desk Chair",
    description: "",
    excerpt: null,
    sku: "SKU-DESK-CHAIR",
    status: ProductStatus.DRAFT,
    price: new Prisma.Decimal(100),
    currency: "USD",
    thumbnailUrl: null,
    categoryId: CATEGORY_ID,
    discountType: null,
    discountValue: null,
    discountActive: false,
    discountStart: null,
    discountEnd: null,
    model3dUrl: null,
    model3dFormat: null,
    model3dLiveView: false,
    model3dPosterUrl: null,
    vrPlanImageUrl: null,
    vrEnabled: false,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    customSchema: null,
    noindex: false,
    isFeatured: false,
    featureSort: 0,
    promoTitle: null,
    promoBadge: null,
    promoActive: false,
    promoStart: null,
    promoEnd: null,
    tags: [],
    complementaryIds: [],
    trackInventory: false,
    stockQuantity: 0,
    version: 1,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function service(create: jest.Mock, update = jest.fn()): ProductServiceImpl {
  return new ProductServiceImpl(
    { product: { create, update } } as unknown as PrismaService,
    client({
      GetTaxonomy: jest.fn().mockReturnValue(
        of({
          data: {
            id: CATEGORY_ID,
            scope: "product",
            kind: "category.default",
          },
        }),
      ),
    }),
    client({
      GetString: jest.fn().mockReturnValue(of({ value: "USD", found: true })),
    }),
  );
}

const uniqueConflict = (field: "slug" | "sku") => ({
  code: "P2002",
  meta: { target: [field] },
});

describe("product identifier conflicts", () => {
  beforeAll(() => {
    process.env.SVC_NAME = "product-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "taxonomy-service": {
        id: "product-taxonomy-test-v1",
        secret: "test-product-to-taxonomy-key-000000000001",
      },
      "settings-service": {
        id: "product-settings-test-v1",
        secret: "test-product-to-settings-key-000000000001",
      },
    });
  });

  afterAll(() => {
    if (previousServiceName === undefined) delete process.env.SVC_NAME;
    else process.env.SVC_NAME = previousServiceName;

    if (previousOutboundKeys === undefined)
      delete process.env.S2S_OUTBOUND_KEYS;
    else process.env.S2S_OUTBOUND_KEYS = previousOutboundKeys;
  });

  it("retries a generated slug collision with a deterministic suffix", async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce(uniqueConflict("slug"))
      .mockResolvedValueOnce(
        product({ slug: "desk-chair-2", sku: "SKU-DESK-CHAIR-2" }),
      );

    await expect(
      service(create).create({
        title: "Desk Chair",
        price: 100,
        categoryId: CATEGORY_ID,
      }),
    ).resolves.toMatchObject({
      data: { slug: "desk-chair-2", sku: "SKU-DESK-CHAIR-2" },
    });

    expect(create.mock.calls.map(([call]) => call.data)).toEqual([
      expect.objectContaining({
        slug: "desk-chair",
        sku: "SKU-DESK-CHAIR",
      }),
      expect.objectContaining({
        slug: "desk-chair-2",
        sku: "SKU-DESK-CHAIR-2",
      }),
    ]);
  });

  it("retries a generated SKU collision without changing the slug", async () => {
    const create = jest
      .fn()
      .mockRejectedValueOnce(uniqueConflict("sku"))
      .mockResolvedValueOnce(product({ sku: "SKU-DESK-CHAIR-2" }));

    await service(create).create({
      title: "Desk Chair",
      price: 100,
      categoryId: CATEGORY_ID,
    });

    expect(create.mock.calls.map(([call]) => call.data)).toEqual([
      expect.objectContaining({
        slug: "desk-chair",
        sku: "SKU-DESK-CHAIR",
      }),
      expect.objectContaining({
        slug: "desk-chair",
        sku: "SKU-DESK-CHAIR-2",
      }),
    ]);
  });

  it.each([
    {
      field: "slug" as const,
      input: { slug: "reserved-slug" },
      message: "product_slug_conflict",
    },
    {
      field: "sku" as const,
      input: { sku: "RESERVED-SKU" },
      message: "product_sku_conflict",
    },
  ])(
    "returns a stable conflict for an explicit duplicate $field",
    async ({ field, input, message }) => {
      const create = jest.fn().mockRejectedValue(uniqueConflict(field));

      await expect(
        service(create).create({
          title: "Desk Chair",
          price: 100,
          categoryId: CATEGORY_ID,
          ...input,
        }),
      ).rejects.toEqual(new ConflictException(message));
      expect(create).toHaveBeenCalledTimes(1);
    },
  );

  it("normalizes patched slugs and trims patched SKUs", async () => {
    const update = jest
      .fn()
      .mockResolvedValue(product({ slug: "cafe-table", sku: "CAFE-TABLE-1" }));

    await service(jest.fn(), update).update(
      "product-1",
      {
        slug: "  Café Table  ",
        sku: "  CAFE-TABLE-1  ",
      },
      1,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "cafe-table",
          sku: "CAFE-TABLE-1",
        }),
      }),
    );
  });

  it("maps a duplicate identifier on update to the same conflict contract", async () => {
    const update = jest.fn().mockRejectedValue(uniqueConflict("slug"));

    await expect(
      service(jest.fn(), update).update(
        "product-1",
        { slug: "reserved-slug" },
        1,
      ),
    ).rejects.toEqual(new ConflictException("product_slug_conflict"));
  });
});
