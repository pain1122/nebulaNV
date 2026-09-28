import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import {
  Prisma,
  ProductSelectionMode,
  ProductStatus,
  type Product,
} from "../prisma/generated";
import { ProductServiceImpl } from "../src/product/product.service";

const product = {
  id: "product-1",
  slug: "shirt",
  title: "Shirt",
  sku: "SHIRT",
  status: ProductStatus.DRAFT,
  selectionMode: ProductSelectionMode.VARIANT,
  price: new Prisma.Decimal(100),
  currency: "USD",
  categoryId: "category-1",
  trackInventory: true,
  stockQuantity: 0,
  version: 1,
  deletedAt: null,
  variants: [],
} as unknown as Product & { variants: [] };

function harness(overrides: Record<string, unknown> = {}) {
  const create = jest.fn().mockResolvedValue({});
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const tx = {
    product: {
      findUnique: jest.fn().mockResolvedValue(product),
      updateMany,
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ ...product, version: 2 }),
    },
    productVariant: {
      count: jest.fn().mockResolvedValue(0),
      create,
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
  const prisma = {
    $transaction: (run: (client: typeof tx) => unknown) => run(tx),
  } as unknown as PrismaService;
  const client = {
    getService: jest.fn().mockReturnValue({}),
  } as unknown as ClientGrpc;
  return {
    service: new ProductServiceImpl(prisma, client, client),
    tx,
    create,
    updateMany,
  };
}

describe("Product variants", () => {
  it.each([1.234, 10_000_000_000_000_000])(
    "rejects a variant price override that cannot fit Decimal(18,2): %s",
    async (priceOverride) => {
      const { service, create } = harness();

      await expect(
        service.createVariant(
          "product-1",
          { sku: "SHIRT-BLUE-M", options: { Color: "Blue" }, priceOverride },
          1,
        ),
      ).rejects.toEqual(
        new BadRequestException("price must fit Decimal(18,2)"),
      );
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("creates a canonical combination and reserves its SKU under the product version", async () => {
    const { service, create, updateMany } = harness();
    const result = await service.createVariant(
      "product-1",
      {
        sku: " SHIRT-BLUE-M ",
        options: { Size: " M ", Color: " Blue " },
        stockQuantity: 3,
      },
      1,
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "product-1", version: 1 },
      data: { version: { increment: 1 } },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sku: "SHIRT-BLUE-M",
        options: { Color: "Blue", Size: "M" },
        optionKey: '[["color","blue"],["size","m"]]',
        stockQuantity: 3,
        skuReservation: { create: { sku: "SHIRT-BLUE-M" } },
      }),
    });
    expect(result.data.version).toBe(2);
  });

  it("rejects stale variant writes without creating a row", async () => {
    const { service, create } = harness({
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    await expect(
      service.createVariant(
        "product-1",
        { sku: "S", options: { Size: "M" } },
        1,
      ),
    ).rejects.toEqual(new ConflictException("product_version_conflict"));
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects duplicate option names after normalization", async () => {
    const { service, create } = harness();
    await expect(
      service.createVariant(
        "product-1",
        {
          sku: "S",
          options: { Color: "Blue", color: "Red" },
        },
        1,
      ),
    ).rejects.toEqual(new BadRequestException("variant_options_invalid"));
    expect(create).not.toHaveBeenCalled();
  });

  it("reports a persisted option-combination conflict", async () => {
    const { service, create } = harness();
    create.mockRejectedValue({
      code: "P2002",
      meta: { target: "ProductVariant_productId_optionKey_key" },
    });
    await expect(
      service.createVariant(
        "product-1",
        {
          sku: "SHIRT-BLUE-M",
          options: { Color: "Blue" },
        },
        1,
      ),
    ).rejects.toEqual(new ConflictException("variant_options_conflict"));
  });

  it("updates a variant SKU and stock through one parent-version mutation", async () => {
    const { service, tx, updateMany } = harness();
    tx.productVariant.findFirst.mockResolvedValue({
      id: "variant-1",
      productId: "product-1",
      sku: "SHIRT-BLUE-M",
      optionKey: '[["color","blue"]]',
    });
    await service.updateVariant(
      "product-1",
      "variant-1",
      {
        sku: "SHIRT-BLUE-L",
        stockQuantity: 0,
      },
      1,
    );
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "variant-1" },
      data: expect.objectContaining({
        sku: "SHIRT-BLUE-L",
        stockQuantity: 0,
        skuReservation: { update: { sku: "SHIRT-BLUE-L" } },
      }),
    });
  });

  it("soft-deletes a variant and releases its combination without releasing its SKU", async () => {
    const { service, tx } = harness();
    tx.productVariant.findFirst.mockResolvedValue({
      id: "variant-1",
      productId: "product-1",
      sku: "SHIRT-BLUE-M",
      optionKey: '[["color","blue"]]',
    });
    await service.deleteVariant("product-1", "variant-1", 1);
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: "variant-1" },
      data: {
        deletedAt: expect.any(Date),
        active: false,
        optionKey: '[["color","blue"]]#deleted:variant-1',
      },
    });
    expect(tx.productVariant.create).not.toHaveBeenCalled();
  });
});
