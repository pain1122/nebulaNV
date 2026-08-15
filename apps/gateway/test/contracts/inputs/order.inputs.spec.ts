import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("order input profiles", () => {
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
      { field: "body.status", code: "required_field" },
      { field: "params.id", code: "required_field" },
    ]);
  });
});
