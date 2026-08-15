import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("user input profiles", () => {
  it("requires at least one supported profile change", () => {
    const issues = validateGatewayInput("profile-update", { body: {} });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({
      field: "body.email|newPassword",
      code: "required_field",
    });
  });

  it("requires the current password when changing password", () => {
    expect(
      validateGatewayInput("profile-update", {
        body: { newPassword: "changed" },
      }),
    ).toEqual([
      { field: "body.currentPassword", code: "unsupported_combination" },
    ]);
  });

  it("allows an email update but rejects actor-controlled role fields", () => {
    expect(
      validateGatewayInput("profile-update", {
        body: { email: "changed@example.test" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("profile-update", {
        body: { email: "changed@example.test", role: "root-admin" },
      }),
    ).toEqual([{ field: "body.role", code: "unknown_field" }]);
  });
});
