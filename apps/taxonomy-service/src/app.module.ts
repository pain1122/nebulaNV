// apps/taxonomy-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, Reflector } from "@nestjs/core";
import * as path from "path";

import { envSchema } from "./config/env.validation";
import { HealthController } from "./health.controller";
import { AuthClientModule } from "./auth-client.module";
import { SettingsClientModule } from "./settings-client.module";
import { GrpcTokenAuthGuard } from "@nebula/grpc-auth";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";

export const TAXONOMY_PROTO = require.resolve("@nebula/protos/taxonomy.proto");

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
    TaxonomyModule,

    // gRPC clients
    AuthClientModule,
    SettingsClientModule,
  ],
  controllers: [HealthController],
  providers: [
    Reflector,
    GrpcTokenAuthGuard,
    // global guards: auth first, then throttler
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
