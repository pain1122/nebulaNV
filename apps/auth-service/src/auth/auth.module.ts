// apps/auth-service/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './grpc/grpc-auth.controller';
import { GrpcAuthService } from './grpc/grpc-auth.service';

// ✅ define the proto path here (don’t import from app.module)
export const USER_PROTO = require.resolve('@nebula/protos/user.proto');

@Module({
  imports: [
    // ConfigModule is already global (from app.module), but safe to import
    ConfigModule,

    // JWT for signing/verifying access tokens
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m' },
      }),
    }),

    // gRPC client to UserService (used by AuthService/GrpcAuthService)
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user', // must match proto package
            protoPath: USER_PROTO,
            url: cfg.get<string>('USER_GRPC_URL') ?? '127.0.0.1:50051',
            channelOptions: {
              'grpc.keepalive_time_ms': 10_000,
              'grpc.max_receive_message_length': -1,
              'grpc.max_send_message_length': -1,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, GrpcAuthService],
})
export class AuthModule {}
