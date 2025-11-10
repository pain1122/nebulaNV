import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { SettingsController } from './settings.controller';
import { SettingsGrpcController } from './grpc/settings-grpc.controller';
import { PrismaService } from './prisma.service';
import { envSchema } from './config/env.validation';
import { SettingsService } from './settings.service';

export const SETTINGS_PROTO = require.resolve('@nebula/protos/settings.proto');
const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../..', '.env'),
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // ✅ same shape user-service uses (package list MUST match your proto)
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: process.env.AUTH_GRPC_URL ?? '127.0.0.1:50052',
          protoPath: AUTH_PROTO,
          package: 'auth',
        },
      },
    ]),
  ],
  controllers: [SettingsController, SettingsGrpcController],
  providers: [
    PrismaService,
    SettingsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class SettingsModule {}
