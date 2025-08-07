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
            package: 'user',
            protoPath: USER_PROTO,
            url: cfg.get<string>('USER_GRPC_URL') || 'localhost:50051',
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, GrpcAuthService],
})
export class AuthModule {}