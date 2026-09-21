import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";

function emptyClient(): ClientGrpc {
  return { getService: jest.fn().mockReturnValue({}) } as unknown as ClientGrpc;
}

describe("product gallery ordering", () => {
  it("appends omitted sorts after active rows and preserves explicit zero", async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: "product-1" }),
      },
      productGalleryImage: {
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 4 }),
        createMany,
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const client = emptyClient();
    const service = new ProductServiceImpl(prisma, client, client);

    await service.addImages("product-1", [
      { url: "https://cdn.example/append.jpg" },
      { url: "https://cdn.example/first.jpg", sort: 0 },
    ]);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          productId: "product-1",
          url: "https://cdn.example/append.jpg",
          alt: null,
          sortOrder: 5,
        },
        {
          productId: "product-1",
          url: "https://cdn.example/first.jpg",
          alt: null,
          sortOrder: 0,
        },
      ],
    });
  });
});
