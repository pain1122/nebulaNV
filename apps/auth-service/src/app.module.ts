import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.validation';

import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';

export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema, envFilePath: ['apps/auth-service/.env', '.env'],expandVariables: true, }),
    AuthModule,
  ],
  controllers: [HealthController]
})
export class AppModule {}
