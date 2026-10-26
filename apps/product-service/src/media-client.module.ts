import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";

const MEDIA_PROTO = require.resolve("@nebula/protos/media.proto");
export const MEDIA_SERVICE = "MEDIA_SERVICE";

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: MEDIA_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: "media",
            protoPath: MEDIA_PROTO,
            url: cfg.get<string>("MEDIA_GRPC_URL") ?? "127.0.0.1:50058",
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MediaClientModule {}
