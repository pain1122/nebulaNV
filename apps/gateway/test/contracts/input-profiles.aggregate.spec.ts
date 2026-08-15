import {
  GATEWAY_INPUT_PROFILES,
  validateGatewayInput,
} from "../../src/contracts/input-profiles";
import {
  assertUniqueInputProfileNames,
  profile,
} from "../../src/contracts/inputs/input-profile.core";

describe("gateway input-profile aggregate", () => {
  it("assembles all 41 unique frozen profiles", () => {
    expect(Object.keys(GATEWAY_INPUT_PROFILES)).toHaveLength(41);
    expect(Object.isFrozen(GATEWAY_INPUT_PROFILES)).toBe(true);

    for (const definition of Object.values(GATEWAY_INPUT_PROFILES)) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.body)).toBe(true);
      expect(Object.isFrozen(definition.query)).toBe(true);
      expect(Object.isFrozen(definition.params)).toBe(true);
      expect(Object.isFrozen(definition.rules)).toBe(true);
    }
  });

  it("rejects duplicate profile names across domain groups", () => {
    expect(() =>
      assertUniqueInputProfileNames([
        { duplicate: profile() },
        { duplicate: profile() },
      ]),
    ).toThrow("gateway_input_profile_duplicate:duplicate");
  });

  it("rejects non-object containers and returns stable sorted issues", () => {
    expect(
      validateGatewayInput("auth-register", {
        body: [],
        query: { extra: "value" },
      }),
    ).toEqual([
      { field: "body", code: "invalid_container" },
      { field: "body.email", code: "required_field" },
      { field: "body.password", code: "required_field" },
      { field: "query.extra", code: "unknown_field" },
    ]);
  });
});
