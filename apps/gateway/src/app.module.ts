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
import { GatewayAuthApiService } from "./auth/gateway-auth-api.service";
import { GatewayBrowserSessionService } from "./auth/browser-session";
import { GatewaySessionTransportGuard } from "./auth/gateway-session-transport.guard";
import { GatewayUserApiService } from "./user/gateway-user-api.service";
import { GatewaySettingsApiService } from "./settings/gateway-settings-api.service";
import { GatewayProductApiService } from "./product/gateway-product-api.service";
import { GatewayBlogApiService } from "./blog/gateway-blog-api.service";
import { GatewayTaxonomyApiService } from "./taxonomy/gateway-taxonomy-api.service";
import { GatewayOrderApiService } from "./order/gateway-order-api.service";
import { GatewayMediaApiService } from "./media/gateway-media-api.service";
import { GatewayMediaRenderProxy } from "./media/gateway-media-render.proxy";
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
    GatewayAuthApiService,
    GatewayBrowserSessionService,
    GatewayUserApiService,
    GatewaySettingsApiService,
    GatewayProductApiService,
    GatewayBlogApiService,
    GatewayTaxonomyApiService,
    GatewayOrderApiService,
    GatewayMediaApiService,
    GatewayMediaRenderProxy,
    { provide: APP_GUARD, useClass: GatewayBearerAuthGuard },
    { provide: APP_GUARD, useClass: GatewaySessionTransportGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: GatewayRoutePolicyInterceptor },
  ],
})
export class AppModule {}
