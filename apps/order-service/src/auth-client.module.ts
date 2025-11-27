import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AUTH_SERVICE, AUTH_SERVICE_NAME } from "@nebula/grpc-auth";

const AUTH_PROTO = require.resolve("@nebula/protos/auth.proto");

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => {
          const url =
            cfg.get<string>("AUTH_GRPC_URL") ||
            "127.0.0.1:50051";

          return {
            transport: Transport.GRPC,
            options: {
              url,
              package: "auth",
              protoPath: AUTH_PROTO,
              loader: {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
              },
              channelOptions: {
                "grpc.keepalive_time_ms": 60_000,
                "grpc.keepalive_timeout_ms": 20_000,
                "grpc.keepalive_permit_without_calls": 1,
                "grpc.max_receive_message_length": -1,
                "grpc.max_send_message_length": -1,
              },
            },
          };
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class AuthClientModule {}
