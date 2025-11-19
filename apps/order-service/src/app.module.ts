// apps/order-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, Reflector } from "@nestjs/core";
import * as path from "path";

import { envSchema } from "./config/env.validation";
import { OrderModule } from "./order/order.module";
import { SettingsClientModule } from "./settings-client.module";
import { AuthClientModule } from "./auth-client.module";
import { ProductClientModule } from "./product-client.module";
import { GrpcTokenAuthGuard } from "@nebula/grpc-auth";

// Safe proto resolution – we won't actually use this until order.proto exists
export const ORDER_PROTO: string =
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    ProductClientModule
  ],
  providers: [
    Reflector,
    GrpcTokenAuthGuard,
    // global guards: auth first, then throttler
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
