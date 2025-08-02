import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GrpcAuthService } from './grpc/grpc-auth.service';
import { AuthGrpcController } from './grpc/grpc-auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtStrategy } from './jwt/jwt.strategy';
const USER_PROTO = require.resolve('@nebula/protos/user.proto');


@Module({
  imports: [
    /* 1️⃣ make config global or import here */
    ConfigModule,

    /* 2️⃣  GRPC client provider  —— now at top‑level */
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
            url: cfg.get<string>('USER_SERVICE_URL', '0.0.0.0:50051'),
          },
        }),
      },
    ]),

    /* 3️⃣  JWT setup (unchanged, but no nesting) */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_ACCESS_EXPIRATION') },
      }),
    }),
  ],

  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, PrismaService, JwtStrategy, GrpcAuthService],
  exports: [AuthService],
})
export class AuthModule {}
