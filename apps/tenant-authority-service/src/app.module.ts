import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { GRPC_SECURITY_PROVIDERS, GrpcTokenAuthGuard } from "@nebula/grpc-auth";
import { createServiceLifecycleProvider } from "@packages/config";
import * as path from "node:path";
import { AuthClientModule } from "./auth-client.module";
import { AuthorityModule } from "./authority/authority.module";
import { envSchema } from "./config/env.validation";
import { HealthController } from "./health.controller";

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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthClientModule,
    AuthorityModule,
  ],
  controllers: [HealthController],
  providers: [
    createServiceLifecycleProvider("tenant-authority-service"),
    ...GRPC_SECURITY_PROVIDERS,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
