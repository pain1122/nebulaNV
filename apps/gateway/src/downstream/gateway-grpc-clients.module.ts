import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import {
  AUTH_SERVICE,
  BLOG_SERVICE,
  MEDIA_SERVICE,
  ORDER_SERVICE,
  PRODUCT_SERVICE,
  SETTINGS_SERVICE,
  TAXONOMY_SERVICE,
  USER_SERVICE,
} from "@nebula/grpc-auth";

export const GATEWAY_GRPC_CLIENT_TARGETS = Object.freeze([
  {
    token: AUTH_SERVICE,
    envName: "AUTH_GRPC_URL",
    packageName: "auth",
    protoPath: require.resolve("@nebula/protos/auth.proto"),
  },
  {
    token: USER_SERVICE,
    envName: "USER_GRPC_URL",
    packageName: "user",
    protoPath: require.resolve("@nebula/protos/user.proto"),
  },
  {
    token: PRODUCT_SERVICE,
    envName: "PRODUCT_GRPC_URL",
    packageName: "product",
    protoPath: require.resolve("@nebula/protos/product.proto"),
  },
  {
    token: SETTINGS_SERVICE,
    envName: "SETTINGS_GRPC_URL",
    packageName: "settings",
    protoPath: require.resolve("@nebula/protos/settings.proto"),
  },
  {
    token: BLOG_SERVICE,
    envName: "BLOG_GRPC_URL",
    packageName: "blog",
    protoPath: require.resolve("@nebula/protos/blog.proto"),
  },
  {
    token: ORDER_SERVICE,
    envName: "ORDER_GRPC_URL",
    packageName: "order",
    protoPath: require.resolve("@nebula/protos/order.proto"),
  },
  {
    token: TAXONOMY_SERVICE,
    envName: "TAXONOMY_GRPC_URL",
    packageName: "taxonomy",
    protoPath: require.resolve("@nebula/protos/taxonomy.proto"),
  },
  {
    token: MEDIA_SERVICE,
    envName: "MEDIA_GRPC_URL",
    packageName: "media",
    protoPath: require.resolve("@nebula/protos/media.proto"),
  },
] as const);

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync(
      GATEWAY_GRPC_CLIENT_TARGETS.map((target) => ({
        name: target.token,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.getOrThrow<string>(target.envName),
            package: target.packageName,
            protoPath: target.protoPath,
            loader: {
              keepCase: false,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
      })),
    ),
  ],
  exports: [ClientsModule],
})
export class GatewayGrpcClientsModule {}
