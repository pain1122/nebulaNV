import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { envSchema } from './config/env.validation';
import { GrpcTokenAuthGuard, AUTH_SERVICE } from '@nebula/grpc-auth';
import { UserModule } from './user/user.module';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as path from 'path';

export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO  = require.resolve('@nebula/protos/auth.proto');

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

    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: AUTH_PROTO,
            url: config.get<string>('AUTH_GRPC_URL') || '127.0.0.1:50052',
          },
        }),
      },
    ]),

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