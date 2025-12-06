import {Module} from "@nestjs/common"
import {ConfigModule} from "@nestjs/config"
import {ThrottlerModule, ThrottlerGuard} from "@nestjs/throttler"
import {APP_GUARD, Reflector} from "@nestjs/core"
import * as path from "path"
import {envSchema} from "./config/env.validation"
import {ProductModule} from "./product/product.module"
import {TaxonomyModule} from "./taxonomy/taxonomy.module"
import {SettingsClientModule} from "./settings-client.module"
import {TaxonomyClientModule} from "./taxonomy-client.module"
import {AuthClientModule} from "./auth-client.module"
import {GrpcTokenAuthGuard} from "@nebula/grpc-auth"
import {DefaultProductTaxonomyInitializer} from "./default-product-taxonomy.initializer"

export const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto")

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: [path.resolve(__dirname, "../.env"), path.resolve(__dirname, "../../..", ".env")],
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([{ttl: 60_000, limit: 120}]),

    ProductModule,
    TaxonomyModule,
    SettingsClientModule,
    AuthClientModule,
    TaxonomyClientModule,
  ],
  providers: [
    Reflector,
    GrpcTokenAuthGuard,
    {provide: APP_GUARD, useClass: GrpcTokenAuthGuard},
    {provide: APP_GUARD, useClass: ThrottlerGuard},
    DefaultProductTaxonomyInitializer
  ],
})
export class AppModule {}
