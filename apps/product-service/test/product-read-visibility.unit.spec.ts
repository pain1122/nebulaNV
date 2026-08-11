import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { IS_PUBLIC_KEY, ROLES_KEY } from "@nebula/grpc-auth";
import type { PrismaService } from "../src/prisma.service";
import { ProductStatus } from "../prisma/generated";
import { ProductController } from "../src/product/product.controller";
import { ListProductsRequestDto } from "../src/product/dto/product-input.dto";
import { ProductGrpcController } from "../src/product/grpc/product-grpc.controller";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
}

function productService(prisma: object) {
  const client = emptyClient();
  return new ProductServiceImpl(prisma as PrismaService, client, client);
}

function handler(
  name: keyof ProductGrpcController,
): (...args: never[]) => unknown {
  const value: unknown = Object.getOwnPropertyDescriptor(
    ProductGrpcController.prototype,
    name,
  )?.value;
  if (typeof value !== "function") throw new Error(`missing_${String(name)}`);
  return value as (...args: never[]) => unknown;
}

describe("Product public/admin read separation", () => {
  it("keeps public reads public and makes every broad read admin-only", () => {
    for (const name of ["get", "list", "listGalleryGrpc"] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBe(true);
    }
    for (const name of [
      "adminGet",
      "adminList",
      "adminListGalleryGrpc",
    ] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler(name))).toBeUndefined();
      expect(Reflect.getMetadata(ROLES_KEY, handler(name))).toEqual([
        "admin",
        "root-admin",
      ]);
    }
  });

  it("forces ACTIVE and non-deleted constraints on public get", async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = productService({ product: { findFirst } });

    await expect(service.getPublic("product-1")).rejects.toEqual(
      new NotFoundException("product_not_found"),
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
    });
  });

  it("forces ACTIVE/non-deleted list filters and ignores admin-only controls", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const transaction = jest.fn().mockResolvedValue([[], 0]);
    const service = productService({
      product: { findMany, count },
      $transaction: transaction,
    });

    await expect(
      service.listPublic({ q: "chair", page: 2, limit: 25 }),
    ).resolves.toEqual({ data: [], total: 0 });
    const expectedWhere = {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      OR: [
        { title: { contains: "chair", mode: "insensitive" } },
        { sku: { contains: "chair", mode: "insensitive" } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 25,
        take: 25,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it("keeps lifecycle/deletion controls on the distinct admin list", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = productService({
      product: { findMany, count },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    });

    await service.listAdmin({ status: "DRAFT", includeDeleted: true });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: ProductStatus.DRAFT } }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { status: ProductStatus.DRAFT },
    });
  });

  it("checks public product visibility before returning non-deleted gallery rows", async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: "product-1" });
    const galleryFindMany = jest.fn().mockResolvedValue([]);
    const service = productService({
      product: { findFirst },
      productGalleryImage: { findMany: galleryFindMany },
    });

    await expect(service.listPublicGallery("product-1")).resolves.toEqual([]);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(galleryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "product-1", deletedAt: null },
      }),
    );
  });

  it("does not query gallery rows when the public product is invisible", async () => {
    const galleryFindMany = jest.fn();
    const service = productService({
      product: { findFirst: jest.fn().mockResolvedValue(null) },
      productGalleryImage: { findMany: galleryFindMany },
    });

    await expect(service.listPublicGallery("draft-1")).rejects.toEqual(
      new NotFoundException("product_not_found"),
    );
    expect(galleryFindMany).not.toHaveBeenCalled();
  });

  it("preserves current authenticated-admin HTTP behavior during migration", async () => {
    const listPublic = jest.fn();
    const listAdmin = jest.fn();
    const getPublic = jest.fn();
    const getAdmin = jest.fn();
    const controller = new ProductController({
      listPublic,
      listAdmin,
      getPublic,
      getAdmin,
    } as unknown as ProductServiceImpl);

    const adminQuery = {
      status: "DRAFT",
      includeDeleted: true,
    } as ListProductsRequestDto;
    await controller.list(adminQuery, {});
    expect(listPublic).toHaveBeenCalledWith({
      q: "",
      categoryId: "",
      page: 1,
      limit: 20,
    });
    expect(listAdmin).not.toHaveBeenCalled();

    await controller.list(adminQuery, {
      user: { userId: "admin-1", role: "admin" },
    });
    expect(listAdmin).toHaveBeenCalledWith({
      q: "",
      categoryId: "",
      page: 1,
      limit: 20,
      status: ProductStatus.DRAFT,
      includeDeleted: true,
    });

    await controller.get("product-1", {});
    await controller.get("product-1", {
      user: { userId: "admin-1", role: "root-admin" },
    });
    expect(getPublic).toHaveBeenCalledWith("product-1");
    expect(getAdmin).toHaveBeenCalledWith("product-1");
  });
});
