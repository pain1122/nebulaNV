import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SETTINGS_SERVICE as SETTINGS_SERVICE_TOKEN } from "@nebula/grpc-auth";

const SETTINGS_PROTO = require.resolve("@nebula/protos/settings.proto");
export const SETTINGS_SERVICE = SETTINGS_SERVICE_TOKEN;

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: SETTINGS_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => {
          const url =
            cfg.get<string>("SETTINGS_GRPC_URL") ||
            "127.0.0.1:50052";

          return {
            transport: Transport.GRPC,
            options: {
              url,
              package: "settings",
              protoPath: SETTINGS_PROTO,
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
export class SettingsClientModule {}
