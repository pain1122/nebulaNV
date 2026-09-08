import { readFileSync } from "node:fs";
import * as path from "node:path";
import { envSchema } from "../src/config/env.validation";
import {
  TEST_APPLICATION_REGISTRY_JSON,
  TEST_GATEWAY_GRPC_TARGETS,
  TEST_GATEWAY_OUTBOUND_KEYS,
  TEST_MEDIA_RENDER_HTTP_URL,
} from "./application-fixture";

function validEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    GATEWAY_APPLICATION_REGISTRY_JSON: TEST_APPLICATION_REGISTRY_JSON,
    GATEWAY_OUTBOUND_KEYS: TEST_GATEWAY_OUTBOUND_KEYS,
    GATEWAY_REDIS_URL: "redis://127.0.0.1:6379/0",
    MEDIA_RENDER_HTTP_URL: TEST_MEDIA_RENDER_HTTP_URL,
    ...TEST_GATEWAY_GRPC_TARGETS,
    ...overrides,
  };
}

function readEnvironmentExample(filePath: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const SERVICE_ENV_EXAMPLES = {
  "auth-service": "../../auth-service/.env.example",
  "user-service": "../../user-service/.env.example",
  "product-service": "../../product-service/.env.example",
  "settings-service": "../../settings-service/.env.example",
  "blog-service": "../../blog-service/.env.example",
  "order-service": "../../order-service/.env.example",
  "taxonomy-service": "../../taxonomy-service/.env.example",
  "media-service": "../../media-service/.env.example",
} as const;

describe("gateway environment validation", () => {
  it("keeps the service-local environment example aligned with startup", () => {
    const example = readEnvironmentExample(
      path.resolve(__dirname, "../.env.example"),
    );

    const result = envSchema.validate(example);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: "development",
      GATEWAY_HTTP_PORT: 3002,
      GATEWAY_JSON_LIMIT_BYTES: 262_144,
      GATEWAY_RATE_LIMIT_TTL_MS: 60_000,
      GATEWAY_RATE_LIMIT_REQUESTS: 120,
      GATEWAY_READINESS_TIMEOUT_MS: 1_500,
      GATEWAY_IDEMPOTENCY_TTL_SECONDS: 86_400,
      GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 60,
      GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: 524_288,
      MEDIA_RENDER_HTTP_URL: TEST_MEDIA_RENDER_HTTP_URL,
    });
  });

  it("keeps every development gateway key aligned with its receiver", () => {
    const gatewayExample = readEnvironmentExample(
      path.resolve(__dirname, "../.env.example"),
    );
    const rootExample = readEnvironmentExample(
      path.resolve(__dirname, "../../../.env.example"),
    );
    const outbound = JSON.parse(gatewayExample.GATEWAY_OUTBOUND_KEYS) as Record<
      string,
      unknown
    >;

    expect(rootExample.GATEWAY_OUTBOUND_KEYS).toBe(
      gatewayExample.GATEWAY_OUTBOUND_KEYS,
    );
    for (const key of [
      "GATEWAY_IDEMPOTENCY_TTL_SECONDS",
      "GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS",
      "GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES",
      "MEDIA_RENDER_HTTP_URL",
    ]) {
      expect(rootExample[key]).toBe(gatewayExample[key]);
    }
    for (const [target, relativePath] of Object.entries(SERVICE_ENV_EXAMPLES)) {
      const receiver = readEnvironmentExample(
        path.resolve(__dirname, relativePath),
      );
      const inbound = JSON.parse(receiver.GATEWAY_INBOUND_KEYS) as {
        gateway: { current: unknown };
      };
      expect(outbound[target]).toEqual(inbound.gateway.current);
    }
  });

  it("applies the HTTP-only, size-limit, and rate-limit defaults", () => {
    const result = envSchema.validate(
      validEnvironment({
        NODE_ENV: "test",
      }),
    );

    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: "test",
      GATEWAY_JSON_LIMIT_BYTES: 262_144,
      GATEWAY_RATE_LIMIT_TTL_MS: 60_000,
      GATEWAY_RATE_LIMIT_REQUESTS: 120,
      GATEWAY_READINESS_TIMEOUT_MS: 1_500,
      GATEWAY_IDEMPOTENCY_TTL_SECONDS: 86_400,
      GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 60,
      GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: 524_288,
      GATEWAY_APPLICATION_REGISTRY_JSON: TEST_APPLICATION_REGISTRY_JSON,
    });
    expect(envSchema.describe().keys).not.toHaveProperty("GRPC_PORT");
    expect(envSchema.describe().keys).not.toHaveProperty("GATEWAY_GRPC_PORT");
  });

  it("accepts bounded overrides and rejects unsafe values", () => {
    const valid = envSchema.validate(
      validEnvironment({
        GATEWAY_HTTP_PORT: "4102",
        GATEWAY_JSON_LIMIT_BYTES: "131072",
        GATEWAY_RATE_LIMIT_TTL_MS: "30000",
        GATEWAY_RATE_LIMIT_REQUESTS: "80",
        GATEWAY_READINESS_TIMEOUT_MS: "2000",
        GATEWAY_IDEMPOTENCY_TTL_SECONDS: "3600",
        GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: "30",
        GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: "262144",
      }),
    );

    expect(valid.error).toBeUndefined();
    expect(valid.value).toMatchObject({
      GATEWAY_HTTP_PORT: 4102,
      GATEWAY_JSON_LIMIT_BYTES: 131_072,
      GATEWAY_RATE_LIMIT_TTL_MS: 30_000,
      GATEWAY_RATE_LIMIT_REQUESTS: 80,
      GATEWAY_READINESS_TIMEOUT_MS: 2_000,
      GATEWAY_IDEMPOTENCY_TTL_SECONDS: 3_600,
      GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 30,
      GATEWAY_IDEMPOTENCY_MAX_RESPONSE_BYTES: 262_144,
    });

    expect(
      envSchema.validate(
        validEnvironment({
          GATEWAY_JSON_LIMIT_BYTES: 1024 * 1024 + 1,
        }),
      ).error,
    ).toBeDefined();
    for (const MEDIA_RENDER_HTTP_URL of [
      "https://media-service:3007",
      "http://media-service:3007/path",
      "http://user:pass@media-service:3007",
      "http://media-service:3007?target=other",
      "http://media-service",
    ]) {
      expect(
        envSchema.validate(
          validEnvironment({ MEDIA_RENDER_HTTP_URL }),
        ).error,
      ).toBeDefined();
    }
    expect(
      envSchema.validate(
        validEnvironment({ GATEWAY_IDEMPOTENCY_TTL_SECONDS: 59 }),
      ).error,
    ).toBeDefined();
    expect(
      envSchema.validate(
        validEnvironment({ GATEWAY_IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS: 4 }),
      ).error,
    ).toBeDefined();
    expect(
      envSchema.validate(
        validEnvironment({
          GATEWAY_RATE_LIMIT_REQUESTS: 0,
        }),
      ).error,
    ).toBeDefined();
    expect(
      envSchema.validate(
        validEnvironment({
          GATEWAY_HTTP_PORT: 0,
        }),
      ).error,
    ).toBeDefined();
    expect(
      envSchema.validate(
        validEnvironment({
          GATEWAY_REDIS_URL: "https://redis.example.test",
        }),
      ).error,
    ).toBeDefined();
  });

  it("requires an explicit registry value in development, test, and production", () => {
    for (const NODE_ENV of ["development", "test", "production"]) {
      expect(
        envSchema.validate({
          NODE_ENV,
          GATEWAY_OUTBOUND_KEYS: TEST_GATEWAY_OUTBOUND_KEYS,
        }).error,
      ).toBeDefined();
    }
  });

  it("requires an exact outbound gateway trust map", () => {
    expect(
      envSchema.validate({
        GATEWAY_APPLICATION_REGISTRY_JSON: TEST_APPLICATION_REGISTRY_JSON,
      }).error,
    ).toBeDefined();

    const incomplete = JSON.parse(TEST_GATEWAY_OUTBOUND_KEYS) as Record<
      string,
      unknown
    >;
    delete incomplete["media-service"];
    expect(
      envSchema.validate(
        validEnvironment({
          GATEWAY_OUTBOUND_KEYS: JSON.stringify(incomplete),
        }),
      ).error,
    ).toBeDefined();
  });

  it("requires every fixed downstream host:port target", () => {
    const missing = { ...TEST_GATEWAY_GRPC_TARGETS };
    delete (missing as Partial<typeof missing>).MEDIA_GRPC_URL;
    expect(
      envSchema.validate(
        validEnvironment({ MEDIA_GRPC_URL: undefined, ...missing }),
      ).error,
    ).toBeDefined();
    expect(
      envSchema.validate(
        validEnvironment({ AUTH_GRPC_URL: "https://auth-service:50052" }),
      ).error,
    ).toBeDefined();
  });
});
