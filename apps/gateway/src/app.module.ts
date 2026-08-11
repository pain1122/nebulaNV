import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { createServiceLifecycleProvider } from "@packages/config";
import * as path from "node:path";
import { applicationRegistryProvider } from "./application/application-registry";
import { envSchema } from "./config/env.validation";
import { GatewayReadinessService } from "./gateway-readiness.service";
import { GatewayGrpcClientsModule } from "./downstream/gateway-grpc-clients.module";
import { HealthController } from "./health.controller";
import { gatewayRateLimitTracker } from "./http/rate-limit";
import { GatewayAuthResolver } from "./auth/gateway-auth-resolver";
import { GatewayBearerAuthGuard } from "./auth/gateway-bearer-auth.guard";
import { GatewayRedisService } from "./state/gateway-redis.service";

// Batch 4's contract-only OpenAPI module will consume this same list. Health is
// operational and intentionally remains outside the external API document.
export const GATEWAY_HTTP_CONTROLLERS = [] as const;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, "../../..", ".env"),
      ],
    }),
    GatewayGrpcClientsModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        getTracker: gatewayRateLimitTracker,
        throttlers: [
          {
            name: "gateway",
            ttl: config.getOrThrow<number>("GATEWAY_RATE_LIMIT_TTL_MS"),
            limit: config.getOrThrow<number>("GATEWAY_RATE_LIMIT_REQUESTS"),
          },
        ],
      }),
    }),
  ],
  controllers: [...GATEWAY_HTTP_CONTROLLERS, HealthController],
  providers: [
    createServiceLifecycleProvider("gateway"),
    applicationRegistryProvider,
    GatewayRedisService,
    GatewayReadinessService,
    GatewayAuthResolver,
    { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
