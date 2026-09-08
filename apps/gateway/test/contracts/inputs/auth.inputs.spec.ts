import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("auth input profiles", () => {
  it("requires the exact registration and login credentials", () => {
    expect(validateGatewayInput("auth-register", { body: {} })).toEqual([
      { field: "body.email", code: "required_field" },
      { field: "body.password", code: "required_field" },
    ]);
    expect(
      validateGatewayInput("auth-login", {
        body: { identifier: "person@example.test", password: "safe" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("auth-login", {
        body: {
          identifier: "person@example.test",
          password: "safe",
          role: "root-admin",
        },
      }),
    ).toEqual([{ field: "body.role", code: "unknown_field" }]);
  });

  it("allows native refresh material only for the mobile profile", () => {
    expect(
      validateGatewayInput("auth-refresh", {
        applicationProfile: "mobile",
        body: {},
      }),
    ).toEqual([{ field: "body.refreshToken", code: "required_field" }]);
    expect(
      validateGatewayInput("auth-refresh", {
        applicationProfile: "mobile",
        body: { refreshToken: "opaque" },
      }),
    ).toEqual([]);

    for (const applicationProfile of ["storefront-web", "admin-web"] as const) {
      expect(
        validateGatewayInput("auth-refresh", {
          applicationProfile,
          body: { refreshToken: "opaque" },
        }),
      ).toEqual([
        { field: "body.refreshToken", code: "unsupported_combination" },
      ]);
    }
  });

  it("keeps logout controls bounded by application profile", () => {
    expect(
      validateGatewayInput("auth-logout", {
        applicationProfile: "mobile",
        body: { allDevices: false },
      }),
    ).toEqual([
      { field: "body.refreshToken|allDevices", code: "required_field" },
    ]);
    expect(
      validateGatewayInput("auth-logout", {
        applicationProfile: "mobile",
        body: { allDevices: true, refreshToken: "opaque" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("auth-logout", {
        applicationProfile: "storefront-web",
        body: { allDevices: true, refreshToken: "opaque" },
      }),
    ).toEqual([
      { field: "body.refreshToken", code: "unsupported_combination" },
    ]);
  });
});
