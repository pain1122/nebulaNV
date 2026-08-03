import * as Joi from "joi";
import { s2sEnvSchema } from "../src/env.validation";
import { assertS2SRuntimeConfiguration } from "../src/tokens";

const serviceSecret = "test-only-service-edge-secret-000001";
const gatewaySecret = "test-only-gateway-edge-secret-000001";

function validConfig() {
  return {
    SVC_NAME: "auth-service",
    S2S_OUTBOUND_KEYS: "{}",
    S2S_INBOUND_KEYS: JSON.stringify({
      "user-service": {
        current: { id: "user-auth-v1", secret: serviceSecret },
      },
    }),
    GATEWAY_INBOUND_KEYS: JSON.stringify({
      gateway: {
        current: { id: "gateway-auth-v1", secret: gatewaySecret },
      },
    }),
  };
}

function applyRuntimeEnv(overrides: NodeJS.ProcessEnv = {}): void {
  Object.assign(process.env, validConfig(), {
    NODE_ENV: "test",
    PUBLIC_MODE: "OPTIONAL_AUTH",
    S2S_SIGNATURE_HEADER: "x-s2s-signature",
    S2S_MAX_CLOCK_SKEW_MS: "30000",
    S2S_REPLAY_STORE: "memory",
    GATEWAY_OUTBOUND_KEYS: "{}",
    ...overrides,
  });
}

describe("fail-closed S2S configuration", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("accepts the canonical service startup shape", () => {
    const schema = Joi.object(s2sEnvSchema("auth-service"));
    const result = schema.validate(validConfig(), { allowUnknown: true });

    expect(result.error).toBeUndefined();
    expect(result.value.PUBLIC_MODE).toBe("OPTIONAL_AUTH");
    expect(result.value.S2S_REPLAY_STORE).toBe("redis");
  });

  it("does not accept a legacy shared secret in place of trust maps", () => {
    const schema = Joi.object(s2sEnvSchema("auth-service"));
    const result = schema.validate(
      { SVC_NAME: "auth-service", GATEWAY_SECRET: gatewaySecret },
      { allowUnknown: true },
    );

    expect(result.error).toBeDefined();
  });

  it("rejects malformed trust bundles and the wrong service identity", () => {
    const schema = Joi.object(s2sEnvSchema("auth-service"));
    const malformed = schema.validate({
      ...validConfig(),
      S2S_INBOUND_KEYS: "not-json",
    });
    const wrongService = schema.validate({
      ...validConfig(),
      SVC_NAME: "user-service",
    });

    expect(malformed.error).toBeDefined();
    expect(wrongService.error).toBeDefined();
  });

  it("rejects service/gateway key reuse", () => {
    applyRuntimeEnv({
      GATEWAY_INBOUND_KEYS: JSON.stringify({
        gateway: {
          current: { id: "gateway-auth-v1", secret: serviceSecret },
        },
      }),
    });

    expect(() => assertS2SRuntimeConfiguration()).toThrow(
      "gateway_and_service_s2s_secrets_must_be_distinct",
    );
  });

  it("forbids an in-memory replay store in production", () => {
    applyRuntimeEnv({ NODE_ENV: "production", S2S_REPLAY_STORE: "memory" });

    expect(() => assertS2SRuntimeConfiguration()).toThrow(
      "memory_s2s_replay_store_forbidden_in_production",
    );
  });
});
