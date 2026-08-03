import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import * as path from "path";
import { envSchema } from "./config/env.validation";
import { ProductModule } from "./product/product.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { SettingsClientModule } from "./settings-client.module";
import { TaxonomyClientModule } from "./taxonomy-client.module";
import { AuthClientModule } from "./auth-client.module";
import { GRPC_SECURITY_PROVIDERS, GrpcTokenAuthGuard } from "@nebula/grpc-auth";
import { DefaultProductTaxonomyInitializer } from "./default-product-taxonomy.initializer";
import { HealthController } from "./health.controller";
import { createServiceLifecycleProvider } from "@packages/config";

export const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, "../../..", ".env"),
      ],
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    ProductModule,
    TaxonomyModule,
    SettingsClientModule,
    AuthClientModule,
    TaxonomyClientModule,
  ],
  controllers: [HealthController],
  providers: [
    createServiceLifecycleProvider("product-service"),
    ...GRPC_SECURITY_PROVIDERS,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: GrpcTokenAuthGuard },
    DefaultProductTaxonomyInitializer,
  ],
})
export class AppModule {}
