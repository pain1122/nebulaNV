import * as Joi from "joi";
import { gatewayOutboundEnvSchema } from "../src/env.validation";
import {
  assertGatewayOutboundRuntimeConfiguration,
  GATEWAY_OUTBOUND_TARGETS,
} from "../src/tokens";

function keyFor(target: string, index: number) {
  return {
    id: `gateway-${target}-${index}`,
    secret: `test-only-gateway-${target}-${index}-secret-00000001`,
  };
}

function validKeys(): Record<string, ReturnType<typeof keyFor>> {
  return Object.fromEntries(
    GATEWAY_OUTBOUND_TARGETS.map((target, index) => [
      target,
      keyFor(target, index),
    ]),
  );
}

describe("outbound-only gateway trust configuration", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it("accepts exact pairwise coverage without receiver-only configuration", () => {
    const schema = Joi.object(gatewayOutboundEnvSchema());
    const result = schema.validate({
      GATEWAY_OUTBOUND_KEYS: JSON.stringify(validKeys()),
    });

    expect(result.error).toBeUndefined();
    expect(result.value.S2S_SIGNATURE_HEADER).toBe("x-s2s-signature");
    expect(schema.describe().keys).toEqual({
      S2S_SIGNATURE_HEADER: expect.any(Object),
      GATEWAY_OUTBOUND_KEYS: expect.any(Object),
    });
  });

  it("rejects missing and undeclared targets", () => {
    const schema = Joi.object(gatewayOutboundEnvSchema());
    const missing = validKeys();
    delete missing["media-service"];
    const unexpected = {
      ...validKeys(),
      "undeclared-service": keyFor("undeclared-service", 99),
    };

    expect(
      schema.validate({
        GATEWAY_OUTBOUND_KEYS: JSON.stringify(missing),
      }).error,
    ).toBeDefined();
    expect(
      schema.validate({
        GATEWAY_OUTBOUND_KEYS: JSON.stringify(unexpected),
      }).error,
    ).toBeDefined();
  });

  it("rejects reuse of one secret across pairwise targets", () => {
    const schema = Joi.object(gatewayOutboundEnvSchema());
    const keys = validKeys();
    keys["user-service"].secret = keys["auth-service"].secret;

    expect(
      schema.validate({
        GATEWAY_OUTBOUND_KEYS: JSON.stringify(keys),
      }).error,
    ).toBeDefined();
  });

  it("repeats exact validation at runtime without inbound or replay state", () => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify(validKeys());
    process.env.S2S_SIGNATURE_HEADER = "x-s2s-signature";
    delete process.env.S2S_OUTBOUND_KEYS;
    delete process.env.S2S_INBOUND_KEYS;
    delete process.env.GATEWAY_INBOUND_KEYS;
    delete process.env.S2S_REPLAY_STORE;

    expect(() => assertGatewayOutboundRuntimeConfiguration()).not.toThrow();
  });

  it("fails runtime validation before a call when target coverage drifts", () => {
    const keys = validKeys();
    delete keys["auth-service"];
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify(keys);

    expect(() => assertGatewayOutboundRuntimeConfiguration()).toThrow(
      "GATEWAY_OUTBOUND_KEYS_missing_targets_auth-service",
    );
  });
});
