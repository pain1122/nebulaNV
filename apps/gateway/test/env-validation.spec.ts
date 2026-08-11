import { envSchema } from "../src/config/env.validation";

describe("gateway environment validation", () => {
  it("applies the HTTP-only, size-limit, and rate-limit defaults", () => {
    const result = envSchema.validate({ NODE_ENV: "test" });

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: "test",
      GATEWAY_JSON_LIMIT_BYTES: 262_144,
      GATEWAY_RATE_LIMIT_TTL_MS: 60_000,
      GATEWAY_RATE_LIMIT_REQUESTS: 120,
    });
    expect(envSchema.describe().keys).not.toHaveProperty("GRPC_PORT");
    expect(envSchema.describe().keys).not.toHaveProperty("GATEWAY_GRPC_PORT");
  });

  it("accepts bounded overrides and rejects unsafe values", () => {
    const valid = envSchema.validate({
      GATEWAY_HTTP_PORT: "4102",
      GATEWAY_JSON_LIMIT_BYTES: "131072",
      GATEWAY_RATE_LIMIT_TTL_MS: "30000",
      GATEWAY_RATE_LIMIT_REQUESTS: "80",
    });

    expect(valid.error).toBeUndefined();
    expect(valid.value).toMatchObject({
      GATEWAY_HTTP_PORT: 4102,
      GATEWAY_JSON_LIMIT_BYTES: 131_072,
      GATEWAY_RATE_LIMIT_TTL_MS: 30_000,
      GATEWAY_RATE_LIMIT_REQUESTS: 80,
    });

    expect(
      envSchema.validate({ GATEWAY_JSON_LIMIT_BYTES: 1024 * 1024 + 1 }).error,
    ).toBeDefined();
    expect(
      envSchema.validate({ GATEWAY_RATE_LIMIT_REQUESTS: 0 }).error,
    ).toBeDefined();
    expect(envSchema.validate({ GATEWAY_HTTP_PORT: 0 }).error).toBeDefined();
  });
});
