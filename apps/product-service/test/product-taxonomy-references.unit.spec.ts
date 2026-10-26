import { BadRequestException } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import {
  Prisma,
  ProductSelectionMode,
  ProductStatus,
} from "../prisma/generated";
import { ProductServiceImpl } from "../src/product/product.service";
import { ProductStatusDto } from "../src/product/dto/product-input.dto";
import type { PrismaService } from "../src/prisma.service";

const productId = "344b307f-b1bf-4704-b342-670ef74dd613";
const categoryId = "11111111-1111-4111-8111-111111111111";
const brandId = "9b18be19-07c3-4a7e-8fba-24427a3a1ad3";
const tagA = "12270c83-0a3a-4a65-b51b-adff44880bd3";
const tagB = "861969f0-e5b9-45b9-b6cd-4d479574c3da";

function client(service: object): ClientGrpc {
  return { getService: jest.fn(() => service) } as unknown as ClientGrpc;
}

function harness(
  taxonomyResponse: (id: string) => unknown,
  options: {
    current?: Record<string, unknown>;
    gallery?: Array<{ mediaId: string | null; url: string }>;
  } = {},
) {
  const update = jest.fn().mockResolvedValue({
    id: productId,
    title: "Desk",
    slug: "desk",
    sku: "DESK",
    status: ProductStatus.DRAFT,
    selectionMode: ProductSelectionMode.BASE,
    price: new Prisma.Decimal(10),
    currency: "USD",
    categoryId,
    brandId,
    tagIds: [tagA, tagB],
    tags: [],
    trackInventory: false,
    stockQuantity: 0,
    version: 2,
    variants: [],
  });
  const getTaxonomy = jest.fn(({ id }: { id: string }) => taxonomyResponse(id));
  const service = new ProductServiceImpl(
    {
      product: {
        update,
        findUnique: jest.fn().mockResolvedValue({
          categoryId,
          currency: "USD",
          brandId: null,
          tagIds: [],
          tags: [],
          thumbnailUrl: null,
          thumbnailMediaId: null,
          ...options.current,
        }),
      },
      productGalleryImage: {
        findMany: jest.fn().mockResolvedValue(options.gallery ?? []),
      },
    } as unknown as PrismaService,
    client({ GetTaxonomy: getTaxonomy }),
    client(
      new Proxy(
        {},
        {
          get: (_target, method) =>
            method === "GetString"
              ? () => of({ found: true, value: "USD" })
              : jest.fn(),
        },
      ),
    ),
    client({}),
  );
  return { service, update, getTaxonomy };
}

function validTaxonomy(id: string) {
  return of({
    data: {
      id,
      scope: "product",
      kind:
        id === categoryId
          ? "category.default"
          : id === brandId
            ? "brand"
            : "tag",
      isHidden: false,
    },
  });
}

describe("Product Taxonomy references", () => {
  const previousServiceName = process.env.SVC_NAME;
  const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

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

  it("validates brand and tags before writing and stores tags in stable order", async () => {
    const { service, update, getTaxonomy } = harness((id) =>
      of({
        data: {
          id,
          scope: "product",
          kind: id === brandId ? "brand" : "tag",
          isHidden: false,
        },
      }),
    );
    await service.update(productId, { brandId, tagIds: [tagB, tagA] }, 1);
    expect(getTaxonomy).toHaveBeenCalledTimes(3);
    const updateCalls = update.mock.calls as unknown as unknown[][];
    const updateArgs = updateCalls[0]?.[0];
    expect(updateArgs).toMatchObject({
      data: { brandId, tagIds: [tagA, tagB] },
    });
  });

  it("rejects wrong scope, hidden records, and duplicate tags without writing", async () => {
    const { service, update } = harness((id) =>
      of({ data: { id, scope: "blog", kind: "brand", isHidden: false } }),
    );
    await expect(service.update(productId, { brandId }, 1)).rejects.toEqual(
      new BadRequestException("product_brand_invalid"),
    );
    await expect(
      service.update(productId, { tagIds: [tagA, tagA] }, 1),
    ).rejects.toEqual(new BadRequestException("product_tag_ids_invalid"));
    expect(update).not.toHaveBeenCalled();

    const hidden = harness((id) =>
      of({ data: { id, scope: "product", kind: "tag", isHidden: true } }),
    );
    await expect(
      hidden.service.update(productId, { tagIds: [tagA] }, 1),
    ).rejects.toEqual(new BadRequestException("product_tag_invalid"));
    expect(hidden.update).not.toHaveBeenCalled();
  });

  it("blocks re-publication after an existing tag becomes hidden", async () => {
    const { service, update } = harness(
      (id) =>
        of({
          data: {
            id,
            scope: "product",
            kind: id === categoryId ? "category.default" : "tag",
            isHidden: id === tagA,
          },
        }),
      { current: { tagIds: [tagA] } },
    );

    await expect(
      service.update(productId, { status: ProductStatusDto.ACTIVE }, 1),
    ).rejects.toEqual(new BadRequestException("product_tag_invalid"));
    expect(update).not.toHaveBeenCalled();
  });

  it("does not write when Taxonomy is unavailable", async () => {
    const { service, update } = harness(() =>
      throwError(() => ({
        code: status.UNAVAILABLE,
        details: "taxonomy_down",
      })),
    );
    await expect(service.update(productId, { brandId }, 1)).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects free-form tags and conflicting brand patch", async () => {
    const { service, update } = harness(() => of({}));
    await expect(
      service.update(productId, { tags: ["sale"] }, 1),
    ).rejects.toEqual(new BadRequestException("product_tag_ids_required"));
    await expect(
      service.update(productId, { brandId, clearBrand: true }, 1),
    ).rejects.toEqual(new BadRequestException("product_brand_patch_conflict"));
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks publication while legacy tags or gallery URLs remain", async () => {
    const tagged = harness(validTaxonomy, { current: { tags: ["old"] } });
    await expect(
      tagged.service.update(productId, { status: ProductStatusDto.ACTIVE }, 1),
    ).rejects.toEqual(
      new BadRequestException("product_legacy_tags_unresolved"),
    );
    expect(tagged.update).not.toHaveBeenCalled();

    const gallery = harness(validTaxonomy, {
      gallery: [{ mediaId: null, url: "https://legacy.example/image.jpg" }],
    });
    await expect(
      gallery.service.update(productId, { status: ProductStatusDto.ACTIVE }, 1),
    ).rejects.toEqual(
      new BadRequestException("product_legacy_gallery_unresolved"),
    );
    expect(gallery.update).not.toHaveBeenCalled();
  });

  it("allows publication when the same patch clears legacy tags", async () => {
    const { service, update } = harness(validTaxonomy, {
      current: { tags: ["old"] },
    });
    await service.update(
      productId,
      { status: ProductStatusDto.ACTIVE, tags: [] },
      1,
    );
    const updateCalls = update.mock.calls as unknown as unknown[][];
    const updateArgs = updateCalls[0]?.[0];
    expect(updateArgs).toMatchObject({
      data: { status: ProductStatus.ACTIVE, tags: [] },
    });
  });

  it("blocks re-publication when stored currency differs from Settings", async () => {
    const { service, update } = harness(validTaxonomy, {
      current: { currency: "EUR" },
    });

    await expect(
      service.update(productId, { status: ProductStatusDto.ACTIVE }, 1),
    ).rejects.toEqual(new BadRequestException("product_currency_mismatch"));
    expect(update).not.toHaveBeenCalled();
  });
});
