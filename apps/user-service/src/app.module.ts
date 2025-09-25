import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { envSchema } from './config/env.validation';

import { AuthClientModule } from './auth-client.module';
import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';

import { UserModule } from './user/user.module';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';


export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: ['apps/user-service/.env', '.env'],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthClientModule,        
    UserModule,
  ],
  controllers: [HealthController],
  providers: [
    Reflector,          
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
