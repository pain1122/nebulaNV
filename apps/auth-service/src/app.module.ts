import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { APP_GUARD } from '@nestjs/core';
import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: ['apps/auth-service/.env', '.env'],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
