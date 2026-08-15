import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("blog input profiles", () => {
  it("keeps public list filters explicit", () => {
    expect(
      validateGatewayInput("blog-list", {
        query: { q: "release", tag: "news", page: "1", limit: "20" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("blog-list", {
        query: { status: "DRAFT", includeDeleted: "true" },
      }),
    ).toEqual([
      { field: "query.includeDeleted", code: "unknown_field" },
      { field: "query.status", code: "unknown_field" },
    ]);
  });

  it("allows slug on create but not on patch", () => {
    expect(
      validateGatewayInput("blog-write", {
        body: { title: "Post", slug: "post", body: "Content" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("blog-patch", {
        params: { id: "post-id" },
        body: { slug: "replacement" },
      }),
    ).toEqual([{ field: "body.slug", code: "unknown_field" }]);
  });

  it("requires the post ID on patch", () => {
    expect(
      validateGatewayInput("blog-patch", { body: { title: "Updated" } }),
    ).toEqual([{ field: "params.id", code: "required_field" }]);
  });
});
