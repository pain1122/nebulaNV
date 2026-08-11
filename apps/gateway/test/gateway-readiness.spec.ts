import { ConfigService } from "@nestjs/config";
import type { ClientGrpc } from "@nestjs/microservices";
import type { ApplicationRegistry } from "../src/application/application.contracts";
import { GatewayReadinessService } from "../src/gateway-readiness.service";
import type { GatewayRedisService } from "../src/state/gateway-redis.service";

describe("gateway readiness dependencies", () => {
  it("checks only the frozen critical matrix without a synthetic Auth RPC", async () => {
    const waitForReady = jest.fn(
      (_deadline: Date, callback: (error?: Error) => void) => callback(),
    );
    const getClientByServiceName = jest.fn().mockReturnValue({ waitForReady });
    const authClient = {
      getClientByServiceName,
      getService: jest.fn(),
    } as unknown as ClientGrpc & {
      getClientByServiceName<T>(serviceName: string): T;
    };
    const registry = {
      readiness: jest.fn().mockResolvedValue(undefined),
    } as unknown as ApplicationRegistry;
    const redis = {
      readiness: jest.fn().mockResolvedValue(undefined),
    } as unknown as GatewayRedisService;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(1_500),
    } as unknown as ConfigService;
    const service = new GatewayReadinessService(
      registry,
      authClient,
      redis,
      config,
    );

    const probes = service.probes();
    expect(probes.map((probe) => probe.name)).toEqual([
      "configuration",
      "applicationRegistry",
      "authTransport",
      "gatewayRedis",
    ]);
    await Promise.all(probes.map((probe) => probe.check()));

    expect(registry.readiness).toHaveBeenCalledTimes(1);
    expect(getClientByServiceName).toHaveBeenCalledWith("AuthService");
    expect(waitForReady).toHaveBeenCalledTimes(1);
    expect(authClient.getService).not.toHaveBeenCalled();
    expect(redis.readiness).toHaveBeenCalledTimes(1);
  });

  it("surfaces Auth channel readiness failure to the sanitized health owner", async () => {
    const authClient = {
      getClientByServiceName: jest.fn().mockReturnValue({
        waitForReady: (_deadline: Date, callback: (error?: Error) => void) =>
          callback(new Error("private transport detail")),
      }),
    } as unknown as ClientGrpc & {
      getClientByServiceName<T>(serviceName: string): T;
    };
    const service = new GatewayReadinessService(
      { readiness: jest.fn() } as unknown as ApplicationRegistry,
      authClient,
      { readiness: jest.fn() } as unknown as GatewayRedisService,
      {
        getOrThrow: jest.fn().mockReturnValue(100),
      } as unknown as ConfigService,
    );
    const authProbe = service
      .probes()
      .find((probe) => probe.name === "authTransport");

    await expect(authProbe?.check()).rejects.toThrow(
      "gateway_auth_transport_not_ready",
    );
  });
});
