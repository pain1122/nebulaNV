import * as Joi from "joi";
import {
  bcryptEnvSchema,
  grpcTargetEnvSchema,
  jwtAccessVerificationEnvSchema,
  resolveServiceBind,
  runtimeEnvSchema,
  serviceBindEnvSchema,
} from "../src/env.validation";

describe("shared environment validation primitives", () => {
  const schema = Joi.object({
    ...runtimeEnvSchema,
    ...serviceBindEnvSchema("example"),
    ...grpcTargetEnvSchema("AUTH_GRPC_URL"),
    ...bcryptEnvSchema,
    ...jwtAccessVerificationEnvSchema,
  });

  it("validates runtime, ports, gRPC targets, bcrypt, and optional JWT verification", () => {
    const valid = schema.validate({
      NODE_ENV: "production",
      EXAMPLE_HTTP_PORT: "3100",
      EXAMPLE_GRPC_PORT: "50051",
      AUTH_GRPC_URL: "auth-service:50052",
      BCRYPT_ROUNDS: "12",
      JWT_ACCESS_SECRET: "a".repeat(32),
    });

    expect(valid.error).toBeUndefined();
    expect(valid.value).toMatchObject({
      NODE_ENV: "production",
      EXAMPLE_HTTP_PORT: 3100,
      EXAMPLE_GRPC_PORT: 50051,
      BCRYPT_ROUNDS: 12,
    });

    expect(schema.validate({ PORT: "0" }).error).toBeDefined();
    expect(
      schema.validate({ AUTH_GRPC_URL: "http://auth-service:50052" }).error,
    ).toBeDefined();
    expect(schema.validate({ BCRYPT_ROUNDS: "7" }).error).toBeDefined();
    expect(
      schema.validate({ JWT_ACCESS_SECRET: "too-short" }).error,
    ).toBeDefined();
  });

  it("uses service-specific bind values before generic values", () => {
    expect(
      resolveServiceBind(
        {
          EXAMPLE_HTTP_PORT: "4100",
          PORT: "3100",
          EXAMPLE_GRPC_PORT: "5100",
          GRPC_PORT: "50051",
          EXAMPLE_GRPC_HOST: "127.0.0.1",
          GRPC_HOST: "0.0.0.0",
        },
        {
          servicePrefix: "example",
          defaultHttpPort: 3000,
          defaultGrpcPort: 50000,
        },
      ),
    ).toEqual({
      httpPort: 4100,
      grpcHost: "127.0.0.1",
      grpcPort: 5100,
      grpcUrl: "127.0.0.1:5100",
    });
  });

  it("falls back to generic bind values and then service defaults", () => {
    expect(
      resolveServiceBind(
        { PORT: "3100", GRPC_PORT: "50051" },
        {
          servicePrefix: "example",
          defaultHttpPort: 3000,
          defaultGrpcPort: 50000,
        },
      ),
    ).toMatchObject({
      httpPort: 3100,
      grpcPort: 50051,
      grpcUrl: "0.0.0.0:50051",
    });

    expect(
      resolveServiceBind(
        {},
        {
          servicePrefix: "example",
          defaultHttpPort: 3000,
          defaultGrpcPort: 50000,
        },
      ),
    ).toMatchObject({
      httpPort: 3000,
      grpcPort: 50000,
      grpcUrl: "0.0.0.0:50000",
    });
  });
});
