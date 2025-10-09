import {Module} from "@nestjs/common"
import {ConfigModule} from "@nestjs/config"
import {SettingsController} from "./settings.controller"
import {SettingsGrpcController} from "./grpc/settings-grpc.controller"
import {PrismaService} from "./prisma.service"
import {envSchema} from "./config/env.validation"
import {SettingsService} from "./settings.service"
export const SETTINGS_PROTO = require.resolve("@nebula/protos/settings.proto")
import {S2SGuard} from "@nebula/grpc-auth"
import {APP_GUARD} from "@nestjs/core"
import {ThrottlerModule, ThrottlerGuard} from "@nestjs/throttler"
import * as path from 'path';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, '../.env'),                     // app-specific .env
        path.resolve(__dirname, '../../..', '.env'),            // root-level .env (three levels up)
      ],
    }),
    // include throttling only if you serve HTTP endpoints in this service
    ThrottlerModule.forRoot([{ttl: 60_000, limit: 120}]),
  ],
  controllers: [SettingsController, SettingsGrpcController],
  providers: [
    PrismaService,
    SettingsService,
    // global guards
    {provide: APP_GUARD, useClass: ThrottlerGuard}, // harmless for gRPC; protects HTTP if present
    {provide: APP_GUARD, useClass: S2SGuard}, // verifies signed internal/gateway calls
  ],
})
export class SettingsModule {}
