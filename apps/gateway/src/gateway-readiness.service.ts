import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClientGrpc } from "@nestjs/microservices";
import { AUTH_SERVICE } from "@nebula/grpc-auth";
import type { HealthCheckStatus, HealthProbe } from "@packages/config";
import type { ApplicationRegistry } from "./application/application.contracts";
import { APPLICATION_REGISTRY } from "./application/application-registry";
import { GatewayRedisService } from "./state/gateway-redis.service";

type ReadyGrpcClient = {
  waitForReady(deadline: Date, callback: (error?: Error) => void): void;
};

type OwnedGrpcClient = ClientGrpc & {
  getClientByServiceName<T>(serviceName: string): T;
};

@Injectable()
export class GatewayReadinessService {
  constructor(
    @Inject(APPLICATION_REGISTRY)
    private readonly applicationRegistry: ApplicationRegistry,
    @Inject(AUTH_SERVICE) private readonly authClient: OwnedGrpcClient,
    private readonly gatewayRedis: GatewayRedisService,
    private readonly config: ConfigService,
  ) {}

  probes(): readonly HealthProbe[] {
    return [
      {
        name: "configuration",
        check: (): HealthCheckStatus => "ok",
      },
      {
        name: "applicationRegistry",
        check: async (): Promise<void> => this.applicationRegistry.readiness(),
      },
      {
        name: "authTransport",
        check: async (): Promise<void> => this.authTransportReadiness(),
      },
      {
        name: "gatewayRedis",
        check: async (): Promise<void> => this.gatewayRedis.readiness(),
      },
    ];
  }

  private async authTransportReadiness(): Promise<void> {
    const client =
      this.authClient.getClientByServiceName<ReadyGrpcClient>("AuthService");
    const timeoutMs = this.config.getOrThrow<number>(
      "GATEWAY_READINESS_TIMEOUT_MS",
    );
    await new Promise<void>((resolve, reject) => {
      client.waitForReady(new Date(Date.now() + timeoutMs), (error) => {
        if (error) reject(new Error("gateway_auth_transport_not_ready"));
        else resolve();
      });
    });
  }
}
