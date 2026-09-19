import { BadRequestException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import {
  DiscountType,
  Prisma,
  ProductStatus,
  type Product,
} from "../prisma/generated";
import { DiscountTypeDto } from "../src/product/dto/product-input.dto";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
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
    price: new Prisma.Decimal("100.00"),
    currency: "USD",
    thumbnailUrl: null,
    categoryId: "category-1",
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
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function service(prisma: object): ProductServiceImpl {
  const client = emptyClient();
  return new ProductServiceImpl(prisma as PrismaService, client, client);
}

describe("product discount contract", () => {
  it("returns numeric prices and the explicit NONE state without a discount", async () => {
    const svc = service({
      product: {
        findUnique: jest.fn().mockResolvedValue(
          product({
            discountValue: new Prisma.Decimal(25),
            discountActive: true,
            discountStart: new Date("2020-01-01T00:00:00.000Z"),
            discountEnd: new Date("2999-01-01T00:00:00.000Z"),
          }),
        ),
      },
    });

    await expect(svc.getAdmin("product-1")).resolves.toMatchObject({
      data: {
        price: 100,
        discountType: DiscountTypeDto.NONE,
        discountValue: 0,
        discountActive: false,
        discountStart: "",
        discountEnd: "",
        effectivePrice: 100,
      },
    });
  });

  it.each([
    {
      name: "percentage",
      discountType: DiscountType.PERCENTAGE,
      discountValue: "12.345",
      expected: 87.66,
    },
    {
      name: "fixed",
      discountType: DiscountType.FIXED,
      discountValue: "12.34",
      expected: 87.66,
    },
    {
      name: "fixed larger than price",
      discountType: DiscountType.FIXED,
      discountValue: "120",
      expected: 0,
    },
  ])("calculates an active $name discount", async (testCase) => {
    const row = product({
      discountType: testCase.discountType,
      discountValue: new Prisma.Decimal(testCase.discountValue),
      discountActive: true,
    });
    const svc = service({
      product: { findUnique: jest.fn().mockResolvedValue(row) },
    });

    await expect(svc.getAdmin("product-1")).resolves.toMatchObject({
      data: { effectivePrice: testCase.expected },
    });
  });

  it.each([
    {
      name: "inactive",
      discountActive: false,
      discountStart: null,
      discountEnd: null,
    },
    {
      name: "not started",
      discountActive: true,
      discountStart: new Date("2999-01-01T00:00:00.000Z"),
      discountEnd: null,
    },
    {
      name: "expired",
      discountActive: true,
      discountStart: null,
      discountEnd: new Date("2000-01-01T00:00:00.000Z"),
    },
  ])("does not apply an $name discount", async (testCase) => {
    const svc = service({
      product: {
        findUnique: jest.fn().mockResolvedValue(
          product({
            discountType: DiscountType.PERCENTAGE,
            discountValue: new Prisma.Decimal(25),
            ...testCase,
          }),
        ),
      },
    });

    await expect(svc.getAdmin("product-1")).resolves.toMatchObject({
      data: { effectivePrice: 100 },
    });
  });

  it("clears the complete discount state when a patch selects NONE", async () => {
    const current = product({
      discountType: DiscountType.FIXED,
      discountValue: new Prisma.Decimal(15),
      discountActive: true,
      discountStart: new Date("2026-01-01T00:00:00.000Z"),
      discountEnd: new Date("2027-01-01T00:00:00.000Z"),
    });
    const update = jest
      .fn<Promise<Product>, [unknown]>()
      .mockResolvedValue(product());
    const svc = service({
      product: {
        findUnique: jest.fn().mockResolvedValue(current),
        update,
      },
    });

    await svc.update("product-1", { discountType: DiscountTypeDto.NONE });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: {
        discountType: null,
        discountValue: null,
        discountActive: false,
        discountStart: null,
        discountEnd: null,
      },
    });
  });

  it("treats transformed undefined discount properties as omitted", async () => {
    const findUnique = jest.fn();
    const update = jest.fn().mockResolvedValue(product({ title: "Updated" }));
    const svc = service({ product: { findUnique, update } });

    await expect(
      svc.update("product-1", {
        title: "Updated",
        discountType: undefined,
        discountValue: undefined,
        discountActive: undefined,
        discountStart: undefined,
        discountEnd: undefined,
      }),
    ).resolves.toMatchObject({ data: { title: "Updated" } });

    expect(findUnique).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("validates a one-sided window patch against the stored opposite date", async () => {
    const update = jest.fn();
    const svc = service({
      product: {
        findUnique: jest.fn().mockResolvedValue(
          product({
            discountType: DiscountType.FIXED,
            discountValue: new Prisma.Decimal(10),
            discountStart: new Date("2026-09-20T00:00:00.000Z"),
          }),
        ),
        update,
      },
    });

    await expect(
      svc.update("product-1", {
        discountEnd: "2026-09-19T00:00:00.000Z",
      }),
    ).rejects.toEqual(
      new BadRequestException("discountEnd must be >= discountStart"),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a percentage discount above 100", async () => {
    const update = jest.fn();
    const svc = service({
      product: {
        findUnique: jest.fn().mockResolvedValue(product()),
        update,
      },
    });

    await expect(
      svc.update("product-1", {
        discountType: DiscountTypeDto.PERCENTAGE,
        discountValue: 101,
      }),
    ).rejects.toEqual(
      new BadRequestException("percentage discountValue must be at most 100"),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("validates a partial bulk window against every selected product", async () => {
    const updateMany = jest.fn();
    const svc = service({
      product: {
        findMany: jest.fn().mockResolvedValue([
          product({
            discountType: DiscountType.FIXED,
            discountValue: new Prisma.Decimal(10),
            discountEnd: new Date("2026-09-19T00:00:00.000Z"),
          }),
        ]),
        updateMany,
      },
    });

    await expect(
      svc.applyDiscountBulk({
        discountStart: "2026-09-20T00:00:00.000Z",
      }),
    ).rejects.toEqual(
      new BadRequestException("discountEnd must be >= discountStart"),
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("clears every discount field in a bulk NONE operation", async () => {
    const findMany = jest.fn();
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const svc = service({ product: { findMany, updateMany } });

    await expect(
      svc.applyDiscountBulk({
        ids: ["product-1", "product-2"],
        discountType: DiscountTypeDto.NONE,
      }),
    ).resolves.toEqual({ updated: 2 });
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        id: { in: ["product-1", "product-2"] },
      },
      data: {
        discountType: null,
        discountValue: null,
        discountActive: false,
        discountStart: null,
        discountEnd: null,
      },
    });
  });
});
