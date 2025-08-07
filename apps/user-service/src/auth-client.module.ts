// apps/user-service/src/auth-client.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_SERVICE } from '@nebula/grpc-auth';

const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Global()
@Module({
  imports: [
    ConfigModule,                         // gives us ConfigService
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: AUTH_PROTO,
            url: cfg.get<string>('AUTH_GRPC_URL') ?? 'localhost:50052',
          },
        }),
      },
    ]),
  ],
  //  ⬇️  *do NOT* provide Reflector here – Nest supplies it automatically
  exports: [ClientsModule],               // exports AUTH_SERVICE
})
export class AuthClientModule {}
