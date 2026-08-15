import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("taxonomy input profiles", () => {
  it("requires kind for public taxonomy lists", () => {
    expect(validateGatewayInput("taxonomy-list", { query: {} })).toEqual([
      { field: "query.kind", code: "required_field" },
    ]);
    expect(
      validateGatewayInput("taxonomy-list", {
        query: { kind: "category", parentId: "parent-id" },
      }),
    ).toEqual([]);
  });

  it("requires kind, slug, and title when creating a taxonomy", () => {
    expect(validateGatewayInput("taxonomy-write", { body: {} })).toEqual([
      { field: "body.kind", code: "required_field" },
      { field: "body.slug", code: "required_field" },
      { field: "body.title", code: "required_field" },
    ]);
  });

  it("prevents patch requests from changing taxonomy kind", () => {
    expect(
      validateGatewayInput("taxonomy-patch", {
        params: { id: "taxonomy-id" },
        body: { kind: "tag", title: "Updated" },
      }),
    ).toEqual([{ field: "body.kind", code: "unknown_field" }]);
    expect(
      validateGatewayInput("taxonomy-patch", { body: { title: "Updated" } }),
    ).toEqual([{ field: "params.id", code: "required_field" }]);
  });
});
