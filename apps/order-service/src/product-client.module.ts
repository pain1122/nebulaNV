import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";

const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");
export const PRODUCT_SERVICE = "PRODUCT_SERVICE";

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: PRODUCT_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: "product", // 👈 make sure this matches your product.proto package
            protoPath: PRODUCT_PROTO,
            url: cfg.get<string>("PRODUCT_GRPC_URL") ?? "127.0.0.1:50053",
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
export class ProductClientModule {}
