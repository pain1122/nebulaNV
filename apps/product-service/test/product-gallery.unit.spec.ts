import { BadRequestException } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of } from "rxjs";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";
import { ProductGrpcController } from "../src/product/grpc/product-grpc.controller";

const firstMediaId = "dd90a288-ecdd-4b1b-91b7-b57773425019";
const secondMediaId = "0e84b76b-ad9c-40d8-84f2-f93024ee840d";

function client(service: object): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue(service),
  } as unknown as ClientGrpc;
}

describe("product gallery ordering", () => {
  const previousServiceName = process.env.SVC_NAME;
  const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

  beforeAll(() => {
    process.env.SVC_NAME = "product-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "media-service": {
        id: "product-media-test-v1",
        secret: "test-product-to-media-key-000000000001",
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

  it("appends omitted sorts after active rows and preserves explicit zero", async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      product: { findUnique: jest.fn().mockResolvedValue({ id: "product-1" }) },
      productGalleryImage: {
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 4 }),
        createMany,
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const empty = client({});
    const resolve = jest.fn(({ id }: { id: string }) =>
      of({
        mediaId: id,
        role: "GALLERY",
        renderPath: `/api/v1/media/render/${id}`,
      }),
    );
    const service = new ProductServiceImpl(
      prisma,
      empty,
      empty,
      client(
        new Proxy(
          {},
          {
            get: (_target, method) =>
              method === "ResolveProductReference" ? resolve : jest.fn(),
          },
        ),
      ),
    );

    await service.addImages("product-1", [
      { mediaId: firstMediaId },
      { mediaId: secondMediaId, sort: 0 },
    ]);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          productId: "product-1",
          url: "",
          mediaId: firstMediaId,
          alt: null,
          title: null,
          sortOrder: 5,
        },
        {
          productId: "product-1",
          url: "",
          mediaId: secondMediaId,
          alt: null,
          title: null,
          sortOrder: 0,
        },
      ],
    });
    expect(resolve).toHaveBeenCalledTimes(2);

    await expect(
      service.addImages("product-1", [
        { url: "https://cdn.example/legacy.jpg" },
      ]),
    ).rejects.toEqual(new BadRequestException("gallery_media_id_required"));
    expect(createMany).toHaveBeenCalledTimes(1);
  });
});

describe("Product gallery response URLs", () => {
  it("suppresses a stored provider URL and derives paths only from Media IDs", async () => {
    const rows = [
      {
        id: "legacy-image",
        mediaId: null,
        url: "https://provider.test/legacy.jpg",
        alt: "legacy",
        sortOrder: 0,
        deletedAt: null,
      },
      {
        id: "media-image",
        mediaId: firstMediaId,
        url: "https://provider.test/stale.jpg",
        alt: "front",
        sortOrder: 1,
        deletedAt: null,
      },
    ];
    const service = {
      listAdminGallery: jest.fn().mockResolvedValue(rows),
    } as unknown as ProductServiceImpl;
    const controller = new ProductGrpcController(service);
    const response = await controller.adminListGalleryGrpc({
      productId: "product-1",
    });
    expect(response.images).toEqual([
      expect.objectContaining({
        id: "legacy-image",
        mediaId: "",
        url: "",
        sort: 0,
      }),
      expect.objectContaining({
        id: "media-image",
        mediaId: firstMediaId,
        url: `/api/v1/media/render/${firstMediaId}`,
        sort: 1,
      }),
    ]);
    expect(rows[0].url).toBe("https://provider.test/legacy.jpg");
  });
});
