import { status } from "@grpc/grpc-js";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getTaxonomy, type TaxonomyProxy } from "@nebula/clients";
import { of, throwError } from "rxjs";
import { TaxonomyService } from "../src/taxonomy/taxonomy.service";

jest.mock("@nebula/clients", () => ({
  getTaxonomy: jest.fn(),
}));

const mockedGetTaxonomy = getTaxonomy as jest.MockedFunction<
  typeof getTaxonomy
>;
const emptyClient = {} as ClientGrpc;

describe("blog taxonomy error translation", () => {
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
      mockedGetTaxonomy.mockReturnValue({
        GetTaxonomy: jest
          .fn()
          .mockReturnValue(throwError(() => ({ code, details }))),
      } as unknown as TaxonomyProxy);
      const service = new TaxonomyService(emptyClient);

      await expect(service.get("taxonomy-id")).rejects.toBeInstanceOf(
        exception,
      );
    },
  );

  it("preserves the blog-specific scope check", async () => {
    mockedGetTaxonomy.mockReturnValue({
      GetTaxonomy: jest.fn().mockReturnValue(
        of({
          data: {
            id: "product-taxonomy-id",
            scope: "product",
          },
        }),
      ),
    } as unknown as TaxonomyProxy);
    const service = new TaxonomyService(emptyClient);

    await expect(service.get("product-taxonomy-id")).rejects.toEqual(
      new BadRequestException("taxonomy_not_in_blog_scope"),
    );
  });
});
