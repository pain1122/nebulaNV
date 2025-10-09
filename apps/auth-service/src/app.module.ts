import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as path from 'path';
import { envSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { APP_GUARD } from '@nestjs/core';
import { GrpcTokenAuthGuard, AUTH_SERVICE } from '@nebula/grpc-auth';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

export const USER_PROTO = require.resolve('@nebula/protos/user.proto');
export const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');
console.log('[Config] loaded env paths:', [
  path.resolve(process.cwd(), 'apps', 'auth-service', '.env'),
  path.resolve(process.cwd(), '.env'),
]);
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

    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
