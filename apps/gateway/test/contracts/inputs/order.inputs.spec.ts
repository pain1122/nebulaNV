import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("order input profiles", () => {
  it("bounds demo commands to path identities and explicit version/outcome bodies", () => {
    expect(
      validateGatewayInput("demo-payment-start", {
        params: { id: "order" },
        body: { expectedVersion: 1 },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("demo-payment-outcome", {
        params: { id: "order", attemptId: "attempt" },
        body: { expectedVersion: 2, outcome: "UNKNOWN" },
      }),
    ).toEqual([]);
    expect(validateGatewayInput("demo-payment-outcome", {})).toEqual([
      { field: "body.expectedVersion", code: "required_field" },
      { field: "body.outcome", code: "required_field" },
      { field: "params.attemptId", code: "required_field" },
      { field: "params.id", code: "required_field" },
    ]);
    for (const field of [
      "userId",
      "role",
      "amount",
      "currency",
      "attemptId",
      "status",
      "idempotencyKey",
    ])
      expect(
        validateGatewayInput("demo-payment-start", {
          params: { id: "order" },
          body: { expectedVersion: 1, [field]: "forged" },
        }),
      ).toEqual([{ field: `body.${field}`, code: "unknown_field" }]);
  });
  it("permits bounded admin filters without allowing them on personal reads", () => {
    expect(
      validateGatewayInput("order-admin-list", {
        query: {
          status: "PENDING",
          userId: "customer",
          page: "1",
          limit: "20",
        },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("order-admin-list", { query: { sort: "id" } }),
    ).toEqual([{ field: "query.sort", code: "unknown_field" }]);
  });
  it("accepts optional variant identity but rejects caller commercial and ownership authority", () => {
    expect(
      validateGatewayInput("cart-add", {
        body: { productId: "product", variantId: "variant", quantity: 1 },
      }),
    ).toEqual([]);
    for (const field of [
      "userId",
      "price",
      "unitPrice",
      "currency",
      "total",
      "status",
      "selectedOptions",
      "siteId",
      "applicationId",
    ]) {
      expect(
        validateGatewayInput("cart-add", {
          body: { productId: "product", quantity: 1, [field]: "forged" },
        }),
      ).toEqual([{ field: `body.${field}`, code: "unknown_field" }]);
    }
  });
  it("requires product and quantity for cart additions", () => {
    expect(validateGatewayInput("cart-add", { body: {} })).toEqual([
      { field: "body.productId", code: "required_field" },
      { field: "body.quantity", code: "required_field" },
    ]);
  });

  it("requires cart item identity and quantity on update", () => {
    expect(validateGatewayInput("cart-update", {})).toEqual([
      { field: "body.quantity", code: "required_field" },
      { field: "params.id", code: "required_field" },
    ]);
  });

  it("does not accept caller-selected identity on checkout or order lists", () => {
    expect(
      validateGatewayInput("checkout", {
        body: { note: "Leave at door", userId: "another-user" },
      }),
    ).toEqual([{ field: "body.userId", code: "unknown_field" }]);
    expect(
      validateGatewayInput("order-list", {
        query: { status: "PAID", userId: "another-user" },
      }),
    ).toEqual([{ field: "query.userId", code: "unknown_field" }]);
  });

  it("requires order identity and status for administrative status changes", () => {
    expect(validateGatewayInput("order-status", {})).toEqual([
      { field: "body.expectedVersion", code: "required_field" },
      { field: "body.status", code: "required_field" },
      { field: "params.id", code: "required_field" },
    ]);
  });
});
