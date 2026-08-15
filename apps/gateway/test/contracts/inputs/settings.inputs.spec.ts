import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("settings input profiles", () => {
  it("keeps public reads on the exact public key allowlist", () => {
    expect(
      validateGatewayInput("setting-public-key", {
        params: { ns: "pricing", key: "default_currency" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("setting-public-key", {
        params: { ns: "order", key: "cart_ttl_minutes" },
      }),
    ).toEqual([{ field: "params.key", code: "unsupported_value" }]);
  });

  it("allows selected admin settings without exposing trust configuration", () => {
    expect(
      validateGatewayInput("setting-admin-key", {
        params: { ns: "order", key: "cart_ttl_minutes" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("setting-admin-key", {
        params: { ns: "trust", key: "gateway_keys" },
      }),
    ).toEqual([{ field: "params.key", code: "unsupported_value" }]);
  });

  it("requires namespace, key, and value for an admin write", () => {
    expect(validateGatewayInput("setting-admin-write", {})).toEqual([
      { field: "body.value", code: "required_field" },
      { field: "params.key", code: "required_field" },
      { field: "params.ns", code: "required_field" },
    ]);
  });
});
