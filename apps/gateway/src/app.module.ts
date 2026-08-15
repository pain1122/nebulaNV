import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
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
import { GatewayIdempotencyService } from "./state/gateway-idempotency.service";
import { GatewayRoutePolicyInterceptor } from "./http/gateway-route-policy";
import { GATEWAY_HTTP_CONTROLLERS } from "./contracts/gateway-http-controllers";

export { GATEWAY_HTTP_CONTROLLERS } from "./contracts/gateway-http-controllers";

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
    GatewayIdempotencyService,
    GatewayReadinessService,
    GatewayAuthResolver,
    { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
  ],
})
export class AppModule {}
