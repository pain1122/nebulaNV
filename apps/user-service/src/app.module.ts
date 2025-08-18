// apps/user-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';

import { AuthClientModule } from './auth-client.module';
import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';

import { UserModule } from './user/user.module';
import { PrismaService } from './prisma.service';


export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/user-service/.env', '.env'],
      expandVariables: true,
    }),
    AuthClientModule,         // <— brings AUTH_SERVICE *and* Reflector
    UserModule,
  ],
  providers: [
    Reflector,
    PrismaService,
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },   // global guard
  ],
})
export class AppModule {}
