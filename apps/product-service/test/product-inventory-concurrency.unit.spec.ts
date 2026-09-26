import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import { Prisma, ProductStatus, type Product } from "../prisma/generated";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
}

function service(prisma: object): ProductServiceImpl {
  const client = emptyClient();
  return new ProductServiceImpl(prisma as PrismaService, client, client);
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "desk",
    title: "Desk",
    description: "",
    excerpt: null,
    sku: "DESK-1",
    status: ProductStatus.ACTIVE,
    price: new Prisma.Decimal(100),
    currency: "USD",
    categoryId: "11111111-1111-4111-8111-111111111111",
    thumbnailUrl: null,
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

describe("product inventory and optimistic concurrency", () => {
  it("rejects contradictory untracked stock before persistence", async () => {
    const create = jest.fn();
    const svc = service({ product: { create } });

    await expect(
      svc.create({
        title: "Desk",
        price: 100,
        trackInventory: false,
        stockQuantity: 2,
      }),
    ).rejects.toEqual(new BadRequestException("product_inventory_invalid"));
    expect(create).not.toHaveBeenCalled();
  });

  it("atomically applies inventory changes at the expected version", async () => {
    const findUnique = jest.fn().mockResolvedValue(product());
    const update = jest
      .fn<Promise<Product>, [Prisma.ProductUpdateArgs]>()
      .mockResolvedValue(
        product({ trackInventory: true, stockQuantity: 5, version: 2 }),
      );
    const svc = service({ product: { findUnique, update } });

    await expect(
      svc.update("product-1", { trackInventory: true, stockQuantity: 5 }, 1),
    ).resolves.toMatchObject({
      data: {
        trackInventory: true,
        stockQuantity: 5,
        availability: "AVAILABLE",
        version: 2,
      },
    });
    expect(update).toHaveBeenCalledTimes(1);
    const updateCall = update.mock.calls[0]?.[0];
    expect(updateCall?.where).toEqual({ id: "product-1", version: 1 });
    expect(updateCall?.data).toMatchObject({
      trackInventory: true,
      stockQuantity: 5,
      version: { increment: 1 },
    });
  });

  it("validates an inventory patch against the stored state", async () => {
    const update = jest.fn();
    const svc = service({
      product: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            product({ trackInventory: true, stockQuantity: 5 }),
          ),
        update,
      },
    });

    await expect(
      svc.update("product-1", { trackInventory: false }, 1),
    ).rejects.toEqual(new BadRequestException("product_inventory_invalid"));
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a stable conflict when an existing row has a newer version", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: "product-1" });
    const svc = service({
      product: {
        update: jest.fn().mockRejectedValue({ code: "P2025" }),
        findUnique,
      },
    });

    await expect(
      svc.update("product-1", { title: "Changed" }, 1),
    ).rejects.toEqual(new ConflictException("product_version_conflict"));
  });

  it("derives an explicit out-of-stock admin response", async () => {
    const svc = service({
      product: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            product({ trackInventory: true, stockQuantity: 0 }),
          ),
      },
    });

    await expect(svc.getAdmin("product-1")).resolves.toMatchObject({
      data: { availability: "OUT_OF_STOCK" },
    });
  });
});
