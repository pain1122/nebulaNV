import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as path from 'path';

import { envSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';

import { GrpcTokenAuthGuard, AUTH_SERVICE } from '@nebula/grpc-auth';

export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');
export const USER_PROTO = require.resolve('@nebula/protos/user.proto');

@Module({
  imports: [
    // Load per-service .env, then repo root .env (works in dist)
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, '../.env'), // apps/auth-service/.env
        path.resolve(__dirname, '../../..', '.env'), // repo root .env
      ],
    }),

    // Basic API rate limiting
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // gRPC client pointing to this service (used by GrpcTokenAuthGuard → ValidateToken)
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: AUTH_PROTO,
            url: config.get<string>('AUTH_GRPC_URL') ?? '127.0.0.1:50052',
          },
        }),
      },
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: USER_PROTO,
            url: config.get<string>('USER_GRPC_URL') ?? '127.0.0.1:50051',
          },
        }),
      },
    ]),

    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
