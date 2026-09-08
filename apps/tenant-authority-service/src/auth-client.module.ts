import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AUTH_SERVICE } from "@nebula/grpc-auth";

const AUTH_PROTO = require.resolve("@nebula/protos/auth.proto");

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: "auth",
            protoPath: AUTH_PROTO,
            url: config.getOrThrow<string>("AUTH_GRPC_URL"),
            channelOptions: {
              "grpc.keepalive_time_ms": 60_000,
              "grpc.keepalive_timeout_ms": 20_000,
              "grpc.keepalive_permit_without_calls": 1,
              "grpc.max_receive_message_length": -1,
              "grpc.max_send_message_length": -1,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AuthClientModule {}
