import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
}

function service(prisma: object): ProductServiceImpl {
  const client = emptyClient();
  return new ProductServiceImpl(prisma as PrismaService, client, client);
}

const missingRecord = { code: "P2025" };

describe("product destructive-operation errors", () => {
  it.each([
    {
      operation: "soft delete",
      invoke: (svc: ProductServiceImpl) => svc.softDelete("missing-product"),
      prisma: {
        product: { update: jest.fn().mockRejectedValue(missingRecord) },
      },
    },
    {
      operation: "restore",
      invoke: (svc: ProductServiceImpl) => svc.restore("missing-product"),
      prisma: {
        product: { update: jest.fn().mockRejectedValue(missingRecord) },
      },
    },
    {
      operation: "hard delete",
      invoke: (svc: ProductServiceImpl) => svc.hardDelete("missing-product"),
      prisma: {
        product: { delete: jest.fn().mockRejectedValue(missingRecord) },
      },
    },
  ])("maps a missing Product during $operation", async ({ invoke, prisma }) => {
    await expect(invoke(service(prisma))).rejects.toEqual(
      new NotFoundException("product_not_found"),
    );
  });

  it("returns a stable conflict when hard delete is blocked by dependents", async () => {
    const remove = jest.fn().mockRejectedValue({
      code: "P2003",
      meta: { field_name: "ProductGalleryImage_productId_fkey" },
    });

    await expect(
      service({ product: { delete: remove } }).hardDelete("product-1"),
    ).rejects.toEqual(new ConflictException("product_has_dependents"));
    expect(remove).toHaveBeenCalledWith({ where: { id: "product-1" } });
  });

  it("rejects an admin gallery read for a missing Product", async () => {
    const findMany = jest.fn();
    const svc = service({
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      productGalleryImage: { findMany },
    });

    await expect(svc.listAdminGallery("missing-product")).rejects.toEqual(
      new NotFoundException("product_not_found"),
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it("checks the Product before an empty gallery reorder", async () => {
    const findMany = jest.fn();
    const svc = service({
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      productGalleryImage: { findMany },
    });

    await expect(svc.reorderImages("missing-product", [])).rejects.toEqual(
      new NotFoundException("product_not_found"),
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it("distinguishes a missing Product from a missing gallery image", async () => {
    const findImage = jest.fn();
    const svc = service({
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      productGalleryImage: { findUnique: findImage },
    });

    await expect(
      svc.removeImage("missing-product", "missing-image"),
    ).rejects.toEqual(new NotFoundException("product_not_found"));
    expect(findImage).not.toHaveBeenCalled();
  });

  it("maps a gallery-image deletion race to image_not_found", async () => {
    const svc = service({
      product: { findUnique: jest.fn().mockResolvedValue({ id: "product-1" }) },
      productGalleryImage: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "image-1", productId: "product-1" }),
        delete: jest.fn().mockRejectedValue(missingRecord),
      },
    });

    await expect(svc.removeImage("product-1", "image-1", true)).rejects.toEqual(
      new NotFoundException("image_not_found"),
    );
  });
});
