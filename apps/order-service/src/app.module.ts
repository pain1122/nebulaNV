// apps/order-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import * as path from "path";

import { envSchema } from "./config/env.validation";
import { OrderModule } from "./order/order.module";
import { SettingsClientModule } from "./settings-client.module";
import { AuthClientModule } from "./auth-client.module";
import { ProductClientModule } from "./product-client.module";
import { GRPC_SECURITY_PROVIDERS, GrpcTokenAuthGuard } from "@nebula/grpc-auth";
import { HealthController } from "./health.controller";
import { createServiceLifecycleProvider } from "@packages/config";

// Safe proto resolution – we won't actually use this until order.proto exists
export const ORDER_PROTO: string = (() => {
  try {
    return require.resolve("@nebula/protos/order.proto");
  } catch {
    return "";
  }
})();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: [
        // service-local .env (dist-safe)
        path.resolve(__dirname, "../.env"),
        // root .env
        path.resolve(__dirname, "../../..", ".env"),
      ],
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // feature module
    OrderModule,

    // gRPC clients
    SettingsClientModule,
    AuthClientModule,
    ProductClientModule,
  ],
  controllers: [HealthController],
  providers: [
    createServiceLifecycleProvider("order-service"),
    ...GRPC_SECURITY_PROVIDERS,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
