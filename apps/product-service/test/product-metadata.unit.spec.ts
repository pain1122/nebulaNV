import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { of } from "rxjs";
import type { MediaProxy } from "@nebula/clients";
import type { ClientGrpc } from "@nestjs/microservices";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";

function harness(count = 1, existing = true) {
  const updateMany = jest
    .fn<Promise<{ count: number }>, [Record<string, unknown>]>()
    .mockResolvedValue({ count });
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: "product" }]),
    productGalleryImage: {
      updateMany,
      findFirst: jest.fn().mockResolvedValue(existing ? { id: "image" } : null),
    },
  };
  const transaction = jest.fn((callback: (arg: typeof tx) => unknown) =>
    Promise.resolve(callback(tx)),
  );
  const empty = {
    getService: jest.fn().mockReturnValue({}),
  } as unknown as ClientGrpc;
  const service = new ProductServiceImpl(
    { $transaction: transaction } as unknown as PrismaService,
    empty,
    empty,
    empty,
  );
  jest.spyOn(service, "listAdminGallery").mockResolvedValue([]);
  return { service, updateMany, transaction };
}
describe("Product contextual metadata", () => {
  it("resets title inheritance but preserves decorative alt under its own revision", async () => {
    const { service, updateMany } = harness();
    await service.updateImageMetadata("product", "image", {
      expectedVersion: 1,
      clearTitle: true,
      alt: "",
    });
    expect(updateMany.mock.calls[0][0]).toEqual({
      where: {
        id: "image",
        productId: "product",
        deletedAt: null,
        metadataVersion: 1,
      },
      data: { title: null, alt: "", metadataVersion: { increment: 1 } },
    });
  });
  it.each([
    [true, ConflictException],
    [false, NotFoundException],
  ] as const)(
    "distinguishes a stale edit from a missing entry",
    async (existing, error) => {
      await expect(
        harness(0, existing).service.updateImageMetadata("product", "image", {
          expectedVersion: 1,
          title: "x",
        }),
      ).rejects.toBeInstanceOf(error);
    },
  );
  it.each([
    {},
    { alt: "bad\ntext" },
    { title: "x", clearTitle: true },
    { alt: "a".repeat(181) },
  ])("rejects invalid contextual text: %j", async (patch) => {
    const { service, transaction } = harness();
    await expect(
      service.updateImageMetadata("product", "image", {
        expectedVersion: 1,
        ...patch,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("resolves inherited and explicit text without copying defaults into stored rows", async () => {
    const { service } = harness();
    const descriptions = jest
      .spyOn(
        service as unknown as {
          descriptions: () => Promise<{ title: string; defaultAlt: string }>;
        },
        "descriptions",
      )
      .mockResolvedValue({ title: "Media title", defaultAlt: "Media alt" });
    const read = service as unknown as {
      describeGallery: (
        rows: Array<{
          mediaId: string;
          alt: string | null;
          title: string | null;
        }>,
      ) => Promise<
        Array<{
          alt: string;
          title: string;
          altOverride?: string;
          titleOverride?: string;
        }>
      >;
    };
    const rows = [
      { mediaId: "media", alt: null, title: null },
      { mediaId: "media", alt: "", title: "Product title" },
    ];
    const result = await read.describeGallery(rows);
    expect(result[0]).toMatchObject({
      alt: "Media alt",
      title: "Media title",
      altOverride: undefined,
      titleOverride: undefined,
    });
    expect(result[1]).toMatchObject({
      alt: "",
      title: "Product title",
      altOverride: "",
      titleOverride: "Product title",
    });
    expect(rows[0]).toEqual({ mediaId: "media", alt: null, title: null });
    descriptions.mockResolvedValue({
      title: "New title",
      defaultAlt: "New alt",
    });
    expect((await read.describeGallery(rows))[0].alt).toBe("New alt");
  });

  it("coalesces shared Media references within a read and refreshes defaults on the next read", async () => {
    const { service } = harness();
    const resolve = jest.fn(() =>
      of({
        mediaId: "media",
        role: "GALLERY",
        renderPath: "/api/v1/media/render/media",
        title: "Default title",
        defaultAlt: "Default alt",
      }),
    );
    const internals = service as unknown as {
      media: () => MediaProxy;
      describeGallery: (
        rows: Array<{ mediaId: string; alt: null; title: null }>,
      ) => Promise<Array<{ alt: string }>>;
    };
    jest.spyOn(internals, "media").mockReturnValue({
      ResolveProductReference: resolve,
    } as unknown as MediaProxy);
    const rows = [
      { mediaId: "media", alt: null, title: null },
      { mediaId: "media", alt: null, title: null },
    ];
    expect(
      (await internals.describeGallery(rows)).map((row) => row.alt),
    ).toEqual(["Default alt", "Default alt"]);
    expect(resolve).toHaveBeenCalledTimes(1);
    await internals.describeGallery(rows);
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});
