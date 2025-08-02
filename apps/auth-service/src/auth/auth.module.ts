import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './grpc/grpc-auth.controller';
import { GrpcAuthService } from './grpc/grpc-auth.service';

const USER_PROTO_PATH = require.resolve('@nebula/protos/user.proto');


@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // JWT setup
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: cfg.get('JWT_ACCESS_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),

    // UserService gRPC client
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: USER_PROTO_PATH,
            url: cfg.get<string>('USER_GRPC_URL') || 'localhost:50052',
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, GrpcAuthService],
})
export class AuthModule {}