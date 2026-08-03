import { Metadata } from "@grpc/grpc-js";
import { media, taxonomy } from "@nebula/protos";
import { digestGrpcS2SRequest, invokeGrpcUnary } from "../src/s2s";
import { grpcS2SProtoLoaderOptions } from "../src/grpc-security";
import { grpcValidationException } from "../src/grpc-error.util";

describe("gRPC unary invocation", () => {
  it("preserves omitted fields for application DTO validation", () => {
    expect(grpcS2SProtoLoaderOptions()).toEqual({ defaults: false });
  });

  it("maps nested validation failures to safe gRPC field paths", () => {
    const error = grpcValidationException([
      {
        property: "data",
        children: [{ property: "title", constraints: { isString: "ignored" } }],
      },
    ]);

    expect(error.getError()).toEqual({
      code: 3,
      message: "validation_failed:data.title",
    });
  });

  it("omits absent call options so Nest can append a valid callback", () => {
    const calls: unknown[][] = [];
    const method = (...args: unknown[]) => calls.push(args);
    const metadata = new Metadata();

    invokeGrpcUnary(method, { id: "request" }, metadata);

    expect(calls).toEqual([[{ id: "request" }, metadata]]);
  });

  it("preserves explicitly supplied call options", () => {
    const calls: unknown[][] = [];
    const method = (...args: unknown[]) => calls.push(args);
    const metadata = new Metadata();
    const options = { deadline: Date.now() + 1_000 };

    invokeGrpcUnary(method, { id: "request" }, metadata, options);

    expect(calls).toEqual([[{ id: "request" }, metadata, options]]);
  });

  it("hashes omitted and explicit proto3 defaults identically", () => {
    type Request = { value?: string };
    const definition = {
      path: "/test.TestService/Canonical",
      requestStream: false,
      requestSerialize: (request: Request) =>
        request.value === undefined
          ? Buffer.from([0x0a, 0x00])
          : request.value === ""
            ? Buffer.alloc(0)
            : Buffer.from(request.value, "utf8"),
      requestDeserialize: (bytes: Buffer): Request => ({
        value: bytes.length > 2 ? bytes.toString("utf8") : "",
      }),
    };

    expect(digestGrpcS2SRequest(definition, {})).toBe(
      digestGrpcS2SRequest(definition, { value: "" }),
    );
  });

  it("materializes generated scalar defaults before hashing partial requests", () => {
    const partial = { take: 20 };
    const complete = media.ListReq.create(partial);

    expect(digestGrpcS2SRequest(media.MediaServiceService.list, partial)).toBe(
      digestGrpcS2SRequest(media.MediaServiceService.list, complete),
    );
  });

  it("materializes nested generated defaults before hashing", () => {
    const partial = {
      data: {
        scope: "product",
        kind: "category",
        slug: "test",
        title: "Test",
      },
    };
    const complete = taxonomy.CreateTaxonomyRequest.create(partial);

    expect(
      digestGrpcS2SRequest(
        taxonomy.TaxonomyServiceService.createTaxonomy,
        partial,
      ),
    ).toBe(
      digestGrpcS2SRequest(
        taxonomy.TaxonomyServiceService.createTaxonomy,
        complete,
      ),
    );
  });
});
