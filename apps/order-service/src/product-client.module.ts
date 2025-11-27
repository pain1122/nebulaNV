// apps/order-service/src/product-client.module.ts
import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PRODUCT_SERVICE as PRODUCT_SERVICE_TOKEN, PRODUCT_SERVICE_NAME } from "@nebula/grpc-auth";

// Shared ts-proto proto path
const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");

// Re-export token so existing imports still work:
//   import { PRODUCT_SERVICE } from "../product-client.module";
export const PRODUCT_SERVICE = PRODUCT_SERVICE_TOKEN;

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: PRODUCT_SERVICE,
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => {
          // Where to reach product-service
          const url =
            cfg.get<string>("PRODUCT_GRPC_URL") ||
            // sensible local default; adjust if your port differs
            "127.0.0.1:50053";

          return {
            transport: Transport.GRPC,
            options: {
              url,
              package: "product",           // <- package name in product.proto
              protoPath: PRODUCT_PROTO,
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
export class ProductClientModule {}
