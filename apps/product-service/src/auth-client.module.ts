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
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: AUTH_PROTO,
            url: cfg.get<string>('AUTH_GRPC_URL') ?? '127.0.0.1:50052',
            // Keep the TCP+HTTP2 channel healthy and tolerant
            channelOptions: {
              'grpc.keepalive_time_ms': 60_000,            // ping every 60s
              'grpc.keepalive_timeout_ms': 20_000,         // wait 20s for ack
              'grpc.keepalive_permit_without_calls': 1,    // allow pings when idle
              'grpc.max_receive_message_length': -1,       // unlimited (dev-friendly)
              'grpc.max_send_message_length': -1,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AuthClientModule {}
