import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  ApplicationRegistryConfigurationError,
  applicationRegistryProvider,
} from "../src/application/application-registry";
import { GatewayReadinessService } from "../src/gateway-readiness.service";
import {
  TEST_APPLICATION_REGISTRY_JSON,
  TEST_GATEWAY_GRPC_TARGETS,
  TEST_GATEWAY_OUTBOUND_KEYS,
} from "./application-fixture";

describe("gateway application module", () => {
  let moduleRef: TestingModule;
  let AppModule: typeof import("../src/app.module").AppModule;
  let GATEWAY_HTTP_CONTROLLERS: typeof import("../src/app.module").GATEWAY_HTTP_CONTROLLERS;
  let bootstrap: typeof import("../src/main").bootstrap;
  let assertGatewayStartupConfiguration: typeof import("../src/main").assertGatewayStartupConfiguration;
  const originalRegistry = process.env.GATEWAY_APPLICATION_REGISTRY_JSON;
  const originalGatewayKeys = process.env.GATEWAY_OUTBOUND_KEYS;
  const originalGatewayRedisUrl = process.env.GATEWAY_REDIS_URL;
  const originalGrpcTargets = Object.fromEntries(
    Object.keys(TEST_GATEWAY_GRPC_TARGETS).map((name) => [
      name,
      process.env[name],
    ]),
  );

  beforeAll(async () => {
    process.env.GATEWAY_APPLICATION_REGISTRY_JSON =
      TEST_APPLICATION_REGISTRY_JSON;
    process.env.GATEWAY_OUTBOUND_KEYS = TEST_GATEWAY_OUTBOUND_KEYS;
    process.env.GATEWAY_REDIS_URL = "redis://127.0.0.1:6379/0";
    Object.assign(process.env, TEST_GATEWAY_GRPC_TARGETS);
    ({ AppModule, GATEWAY_HTTP_CONTROLLERS } = await import(
      "../src/app.module"
    ));
    ({ bootstrap, assertGatewayStartupConfiguration } = await import(
      "../src/main"
    ));
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  afterAll(() => {
    if (originalRegistry === undefined) {
      delete process.env.GATEWAY_APPLICATION_REGISTRY_JSON;
    } else {
      process.env.GATEWAY_APPLICATION_REGISTRY_JSON = originalRegistry;
    }
    if (originalGatewayKeys === undefined) {
      delete process.env.GATEWAY_OUTBOUND_KEYS;
    } else {
      process.env.GATEWAY_OUTBOUND_KEYS = originalGatewayKeys;
    }
    if (originalGatewayRedisUrl === undefined) {
      delete process.env.GATEWAY_REDIS_URL;
    } else {
      process.env.GATEWAY_REDIS_URL = originalGatewayRedisUrl;
    }
    for (const [name, value] of Object.entries(originalGrpcTargets)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("boots its dependency-free foundation with validated defaults", async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(ConfigService).get("GATEWAY_JSON_LIMIT_BYTES")).toBe(
      262_144,
    );
    expect(moduleRef.get(GatewayReadinessService).probes()).toHaveLength(4);
    expect(GATEWAY_HTTP_CONTROLLERS).toEqual([]);
    const { GATEWAY_GRPC_CLIENT_TARGETS } = await import(
      "../src/downstream/gateway-grpc-clients.module"
    );
    expect(GATEWAY_GRPC_CLIENT_TARGETS).toHaveLength(8);
    expect(GATEWAY_GRPC_CLIENT_TARGETS.map((target) => target.envName)).toEqual(
      Object.keys(TEST_GATEWAY_GRPC_TARGETS),
    );
  });

  it("exports the real bootstrap without starting a listener when imported", () => {
    expect(bootstrap).toEqual(expect.any(Function));
  });

  it("repeats outbound trust validation before opening the listener", () => {
    expect(() => assertGatewayStartupConfiguration()).not.toThrow();

    delete process.env.GATEWAY_OUTBOUND_KEYS;
    expect(() => assertGatewayStartupConfiguration()).toThrow(
      "GATEWAY_OUTBOUND_KEYS_missing_targets",
    );
    process.env.GATEWAY_OUTBOUND_KEYS = TEST_GATEWAY_OUTBOUND_KEYS;
  });

  it("fails startup when the required registry cannot be parsed", async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: (name: string): string =>
                name === "NODE_ENV" ? "test" : "not-json",
            },
          },
          applicationRegistryProvider,
        ],
      }).compile(),
    ).rejects.toThrow(ApplicationRegistryConfigurationError);
  });
});
