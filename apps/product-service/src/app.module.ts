import {Module} from "@nestjs/common"
import {ConfigModule} from "@nestjs/config"
import {ThrottlerModule, ThrottlerGuard} from "@nestjs/throttler"
import {APP_GUARD, Reflector} from "@nestjs/core"
import * as path from 'path';
import {envSchema} from "./config/env.validation"
import {ProductModule} from "./product/product.module"
import {CategoryModule} from "./category/category.module"
import {SettingsClientModule} from "./settings-client.module"
import {AuthClientModule} from "./auth-client.module"
import {GrpcTokenAuthGuard} from "@nebula/grpc-auth"

export const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto")

@Module({
  imports: [
    // Read the same way as user-service
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, '../.env'),                     // app-specific .env
        path.resolve(__dirname, '../../..', '.env'),            // root-level .env (three levels up)
      ],
      expandVariables: true,
    }),

    ThrottlerModule.forRoot([{ttl: 60_000, limit: 120}]),

    ProductModule,
    CategoryModule,
    SettingsClientModule,
    AuthClientModule,
  ],
  providers: [Reflector, {provide: APP_GUARD, useClass: ThrottlerGuard}, {provide: APP_GUARD, useClass: GrpcTokenAuthGuard}],
})
export class AppModule {}
