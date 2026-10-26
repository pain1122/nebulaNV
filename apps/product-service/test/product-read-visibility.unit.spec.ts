import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import { IS_PUBLIC_KEY, ROLES_KEY } from "@nebula/grpc-auth";
import type { PrismaService } from "../src/prisma.service";
import { ProductStatus, ProductSelectionMode } from "../prisma/generated";
import { ProductController } from "../src/product/product.controller";
import { ListProductsRequestDto } from "../src/product/dto/product-input.dto";
import { ProductGrpcController } from "../src/product/grpc/product-grpc.controller";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
}

function referenceClient(method: string, handler: jest.Mock): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue(
      new Proxy(
        {},
        {
          get: (_target, key) => (key === method ? handler : jest.fn()),
        },
      ),
    ),
  } as unknown as ClientGrpc;
}

function productService(
  prisma: object,
  taxonomy = emptyClient(),
  media = emptyClient(),
  settings = referenceClient(
    "GetString",
    jest.fn().mockReturnValue(of({ found: true, value: "USD" })),
  ),
) {
  return new ProductServiceImpl(
    prisma as PrismaService,
    taxonomy,
    settings,
    media,
  );
}

const availabilityWhere = {
  OR: [
    {
      selectionMode: ProductSelectionMode.BASE,
      OR: [{ trackInventory: false }, { stockQuantity: { gt: 0 } }],
    },
    {
      selectionMode: ProductSelectionMode.VARIANT,
      OR: [
        {
          trackInventory: false,
          variants: { some: { active: true, deletedAt: null } },
        },
        {
          trackInventory: true,
          variants: {
            some: { active: true, deletedAt: null, stockQuantity: { gt: 0 } },
          },
        },
      ],
    },
  ],
};

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
        ...availabilityWhere,
      },
      include: {
        variants: {
          where: { active: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
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
      AND: [availabilityWhere],
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
    const findFirst = jest
      .fn()
      .mockResolvedValue({ id: "product-1", currency: "USD" });
    const categoryId = "11111111-1111-4111-8111-111111111111";
    const galleryFindMany = jest.fn().mockResolvedValue([]);
    const service = productService(
      {
        product: {
          findFirst,
          findUnique: jest.fn().mockResolvedValue({
            categoryId,
            currency: "USD",
            brandId: null,
            tagIds: [],
            tags: [],
            thumbnailUrl: null,
            thumbnailMediaId: null,
          }),
        },
        productGalleryImage: { findMany: galleryFindMany },
      },
      referenceClient(
        "GetTaxonomy",
        jest.fn().mockReturnValue(
          of({
            data: {
              id: categoryId,
              scope: "product",
              kind: "category.default",
              isHidden: false,
            },
          }),
        ),
      ),
    );

    await expect(service.listPublicGallery("product-1")).resolves.toEqual([]);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        ...availabilityWhere,
      },
      select: { id: true, currency: true },
    });
    expect(galleryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          productId: "product-1",
          deletedAt: null,
          mediaId: { not: null },
        },
      }),
    );
  });

  it("fails closed when a linked Taxonomy record becomes hidden", async () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    const service = productService(
      {
        product: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "product-1", currency: "USD" }),
          findUnique: jest.fn().mockResolvedValue({
            categoryId,
            currency: "USD",
            brandId: null,
            tagIds: [],
            tags: [],
            thumbnailUrl: null,
            thumbnailMediaId: null,
          }),
        },
      },
      referenceClient(
        "GetTaxonomy",
        jest.fn().mockReturnValue(
          of({
            data: {
              id: categoryId,
              scope: "product",
              kind: "category.default",
              isHidden: true,
            },
          }),
        ),
      ),
    );

    await expect(service.getPublic("product-1")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("does not return a partial catalogue page when a linked record is invalid", async () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    const service = productService(
      {
        product: {
          findMany: jest.fn(),
          count: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            categoryId,
            currency: "USD",
            brandId: null,
            tagIds: [],
            tags: [],
            thumbnailUrl: null,
            thumbnailMediaId: null,
          }),
        },
        $transaction: jest
          .fn()
          .mockResolvedValue([[{ id: "product-1", currency: "USD" }], 1]),
      },
      referenceClient(
        "GetTaxonomy",
        jest
          .fn()
          .mockReturnValue(
            of({ data: { id: categoryId, scope: "product", kind: "tag" } }),
          ),
      ),
    );

    await expect(service.listPublic({})).rejects.toMatchObject({ status: 503 });
  });

  it("fails closed when a linked thumbnail becomes blocked", async () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    const mediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
    const service = productService(
      {
        product: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "product-1", currency: "USD" }),
          findUnique: jest.fn().mockResolvedValue({
            categoryId,
            currency: "USD",
            brandId: null,
            tagIds: [],
            tags: [],
            thumbnailUrl: null,
            thumbnailMediaId: mediaId,
          }),
        },
      },
      referenceClient(
        "GetTaxonomy",
        jest.fn().mockReturnValue(
          of({
            data: {
              id: categoryId,
              scope: "product",
              kind: "category.default",
              isHidden: false,
            },
          }),
        ),
      ),
      referenceClient(
        "ResolveProductReference",
        jest.fn().mockReturnValue(
          throwError(() => ({
            code: status.PERMISSION_DENIED,
            details: "media_not_eligible",
          })),
        ),
      ),
    );

    await expect(service.getPublic("product-1")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("does not advertise a Product after the shop currency changes", async () => {
    const service = productService(
      {
        product: {
          findFirst: jest.fn().mockResolvedValue({
            id: "product-1",
            currency: "USD",
          }),
        },
      },
      emptyClient(),
      emptyClient(),
      referenceClient(
        "GetString",
        jest.fn().mockReturnValue(of({ found: true, value: "EUR" })),
      ),
    );

    await expect(service.getPublic("product-1")).rejects.toMatchObject({
      status: 503,
    });
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
