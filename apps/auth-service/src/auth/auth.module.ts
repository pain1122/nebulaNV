import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_PROTO } from '../app.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGrpcController } from './grpc/grpc-auth.controller';
import { GrpcAuthService } from './grpc/grpc-auth.service';

@Module({
  imports: [
    // Load .env globally
    ConfigModule,

    // JWT setup
    JwtModule.registerAsync({
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: cfg.get<string>('JWT_ACCESS_EXPIRATION') ?? '15m',
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
            package: 'user',                              // must match protobufPackage
            protoPath: USER_PROTO,                        // same proto the server uses
            url: cfg.get('USER_GRPC_URL') ?? '127.0.0.1:50051',
            // 👇 ensure grpc-js gets a ClientOptions object
            channelOptions: {
              // you can leave it empty, or add safe defaults:
              'grpc.keepalive_time_ms': 10000,
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
