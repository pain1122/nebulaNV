import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("product input profiles", () => {
  it("rejects public lifecycle and deletion controls", () => {
    expect(
      validateGatewayInput("product-public-list", {
        query: { q: "desk", status: "DRAFT", includeDeleted: "true" },
      }),
    ).toEqual([
      { field: "query.includeDeleted", code: "unknown_field" },
      { field: "query.status", code: "unknown_field" },
    ]);
    expect(
      validateGatewayInput("product-admin-list", {
        query: { status: "DRAFT", includeDeleted: "true" },
      }),
    ).toEqual([]);
  });

  it("uses external content and rejects internal description", () => {
    expect(
      validateGatewayInput("product-write", {
        body: {
          title: "Desk",
          price: 100,
          content: "External description",
        },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("product-write", {
        body: {
          title: "Desk",
          price: 100,
          trackInventory: true,
          stockQuantity: 5,
        },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("product-write", {
        body: {
          title: "Desk",
          price: 100,
          description: "Internal field",
          expectedVersion: 1,
        },
      }),
    ).toEqual([
      { field: "body.description", code: "unknown_field" },
      { field: "body.expectedVersion", code: "unknown_field" },
    ]);
  });

  it("requires a product ID and at least one patch field", () => {
    const issues = validateGatewayInput("product-patch", {
      params: {},
      body: {},
    });
    expect(issues).toHaveLength(3);
    expect(issues).toContainEqual({
      field: "params.id",
      code: "required_field",
    });
    expect(issues).toContainEqual({
      field: expect.stringContaining("body.title|slug|sku"),
      code: "required_field",
    });
    expect(issues).toContainEqual({
      field: "body.expectedVersion",
      code: "required_field",
    });
    expect(
      validateGatewayInput("product-patch", {
        params: { id: "product-id" },
        body: { stockQuantity: 0, expectedVersion: 1 },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("product-patch", {
        params: { id: "product-id" },
        body: { expectedVersion: 1 },
      }),
    ).toEqual([
      {
        field: expect.stringContaining("body.title|slug|sku"),
        code: "required_field",
      },
    ]);
  });

  it("requires a bulk selector and bounds gallery collections", () => {
    expect(validateGatewayInput("product-bulk-discount", { body: {} })).toEqual(
      [
        {
          field:
            "body.discountType|discountValue|discountActive|discountStart|discountEnd",
          code: "required_field",
        },
        {
          field: "body.ids|categoryId|status|q",
          code: "required_field",
        },
      ],
    );
    expect(
      validateGatewayInput("gallery-add", {
        params: { id: "product-id" },
        body: { images: Array.from({ length: 51 }, () => ({})) },
      }),
    ).toEqual([{ field: "body.images", code: "too_many_items" }]);
    expect(
      validateGatewayInput("gallery-order", {
        params: { id: "product-id" },
        body: { orders: Array.from({ length: 201 }, () => ({})) },
      }),
    ).toEqual([{ field: "body.orders", code: "too_many_items" }]);
  });

  it("requires both product and image IDs for gallery removal", () => {
    expect(validateGatewayInput("gallery-remove", {})).toEqual([
      { field: "params.id", code: "required_field" },
      { field: "params.imageId", code: "required_field" },
    ]);
  });
});
