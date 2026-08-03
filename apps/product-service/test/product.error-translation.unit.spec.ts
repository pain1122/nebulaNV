import { Metadata, status } from "@grpc/grpc-js";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { throwError } from "rxjs";
import type { PrismaService } from "../src/prisma.service";
import { ProductServiceImpl } from "../src/product/product.service";
import { TaxonomyService } from "../src/taxonomy/taxonomy.service";

const MISSING_ID = "00000000-0000-0000-0000-000000000000";
const previousServiceName = process.env.SVC_NAME;
const previousOutboundKeys = process.env.S2S_OUTBOUND_KEYS;

function taxonomyClient(error: unknown): ClientGrpc {
  return {
    getService: jest.fn().mockReturnValue({
      GetTaxonomy: jest.fn().mockReturnValue(throwError(() => error)),
    }),
  } as unknown as ClientGrpc;
}

describe("product taxonomy error translation", () => {
  beforeAll(() => {
    process.env.SVC_NAME = "product-service";
    process.env.S2S_OUTBOUND_KEYS = JSON.stringify({
      "taxonomy-service": {
        id: "product-taxonomy-test-v1",
        secret: "test-product-to-taxonomy-key-000000000001",
      },
    });
  });

  afterAll(() => {
    if (previousServiceName === undefined) {
      delete process.env.SVC_NAME;
    } else {
      process.env.SVC_NAME = previousServiceName;
    }

    if (previousOutboundKeys === undefined) {
      delete process.env.S2S_OUTBOUND_KEYS;
    } else {
      process.env.S2S_OUTBOUND_KEYS = previousOutboundKeys;
    }
  });

  it.each([
    {
      code: status.NOT_FOUND,
      details: "taxonomy_not_found",
      exception: NotFoundException,
    },
    {
      code: status.UNAVAILABLE,
      details: "taxonomy_unavailable",
      exception: ServiceUnavailableException,
    },
  ])(
    "maps downstream gRPC status $code for the HTTP facade",
    async ({ code, details, exception }) => {
      const service = new TaxonomyService(taxonomyClient({ code, details }));

      await expect(service.get(MISSING_ID)).rejects.toBeInstanceOf(exception);
    },
  );

  it("keeps a missing category as invalid product input", async () => {
    const prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const settingsClient = {
      getService: jest.fn().mockReturnValue({}),
    } as unknown as ClientGrpc;
    const client = taxonomyClient({
      code: status.NOT_FOUND,
      details: "taxonomy_not_found",
    });
    const service = new ProductServiceImpl(prisma, client, settingsClient);

    await expect(
      service.create({
        title: "Chair",
        price: 10,
        categoryId: MISSING_ID,
      }),
    ).rejects.toEqual(
      new BadRequestException(`Category ${MISSING_ID} does not exist`),
    );

    const raw = client.getService<{
      GetTaxonomy: jest.Mock;
    }>("TaxonomyService");
    expect(raw.GetTaxonomy).toHaveBeenCalledWith(
      { id: MISSING_ID },
      expect.any(Metadata),
    );
  });

  it("maps a missing product update target to not found", async () => {
    const prisma = {
      product: {
        update: jest.fn().mockRejectedValue({ code: "P2025" }),
      },
    } as unknown as PrismaService;
    const emptyClient = {
      getService: jest.fn().mockReturnValue({}),
    } as unknown as ClientGrpc;
    const service = new ProductServiceImpl(prisma, emptyClient, emptyClient);

    await expect(
      service.update(MISSING_ID, { title: "Missing product" }),
    ).rejects.toEqual(new NotFoundException("product_not_found"));
  });
});
