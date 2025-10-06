// apps/user-service/src/auth-client.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AUTH_SERVICE } from '@nebula/grpc-auth';

const AUTH_PROTO = require.resolve('@nebula/protos/auth.proto');

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => {
          const url = cfg.get<string>('AUTH_GRPC_URL') ?? '127.0.0.1:50052';
          console.log(`[GRPC CLIENT] AUTH_SERVICE url=${url} package=auth`);
          return {
            transport: Transport.GRPC,
            options: {
              package: 'auth',
              protoPath: AUTH_PROTO,
              url: cfg.get<string>('AUTH_GRPC_URL') ?? '127.0.0.1:50052',
            },
          };
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AuthClientModule {}
