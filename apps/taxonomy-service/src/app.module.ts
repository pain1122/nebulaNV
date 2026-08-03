// apps/taxonomy-service/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import * as path from "path";

import { envSchema } from "./config/env.validation";
import { HealthController } from "./health.controller";
import { AuthClientModule } from "./auth-client.module";
import { SettingsClientModule } from "./settings-client.module";
import { GRPC_SECURITY_PROVIDERS, GrpcTokenAuthGuard } from "@nebula/grpc-auth";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { createServiceLifecycleProvider } from "@packages/config";

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
    createServiceLifecycleProvider("taxonomy-service"),
    ...GRPC_SECURITY_PROVIDERS,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
