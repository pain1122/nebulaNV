import "reflect-metadata";
import type { ClientGrpc } from "@nestjs/microservices";
import { loadSync, type ServiceDefinition } from "@grpc/proto-loader";
import { of } from "rxjs";
import { TaxonomyService } from "../src/taxonomy/taxonomy.service";

const definition = loadSync(require.resolve("@nebula/protos/taxonomy.proto"), {
  defaults: false,
})["taxonomy.TaxonomyService"] as ServiceDefinition;
const listCodec = definition.ListTaxonomies;

function decodeResponse(value: object) {
  return listCodec.responseDeserialize(listCodec.responseSerialize(value));
}

function service(response: object) {
  const list = jest.fn().mockReturnValue(of(response));
  const client = {
    getService: jest.fn().mockReturnValue({ ListTaxonomies: list }),
  } as unknown as ClientGrpc;
  return new TaxonomyService(client);
}

describe("Product taxonomy list protobuf response defaults", () => {
  it("returns an empty collection when protobuf omits the repeated field", async () => {
    const decoded = decodeResponse({ data: [], page: 1, limit: 100, total: 0 });
    expect(decoded).not.toHaveProperty("data");
    expect(decoded).toHaveProperty("total", 0);

    const result = await service(decoded).list("category.default", {
      q: "missing-demo-taxonomy",
      limit: 100,
    });

    expect(result).toEqual({ data: [], page: 1, limit: 100, total: 0 });
    // Product's gRPC controller maps this collection before serialization.
    expect(result.data.map((item) => item.id)).toEqual([]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("keeps a nonzero total for an empty page beyond the last result", async () => {
    const decoded = decodeResponse({ data: [], page: 2, limit: 100, total: 1 });
    expect(
      await service(decoded).list("category.default", { page: 2 }),
    ).toEqual({
      data: [],
      page: 2,
      limit: 100,
      total: 1,
    });
  });

  it("preserves populated responses and pagination", async () => {
    const decoded = decodeResponse({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          scope: "product",
          kind: "category.default",
          slug: "collection",
          title: "Collection",
        },
      ],
      page: 1,
      limit: 100,
      total: 1,
    });
    expect(await service(decoded).list("category.default")).toEqual(decoded);
  });
});
