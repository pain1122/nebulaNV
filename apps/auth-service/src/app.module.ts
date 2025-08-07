import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['apps/auth-service/.env', '.env'],expandVariables: true, }),
    AuthModule,
  ],
})
export class AppModule {}
