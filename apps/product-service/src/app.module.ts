import {Module} from "@nestjs/common"
import {ConfigModule} from "@nestjs/config"
import {ProductModule} from "./product/product.module"
import {CategoryModule} from "./category/category.module"
import {envSchema} from "./config/env.validation"
import {APP_GUARD, Reflector} from "@nestjs/core"
import {GrpcTokenAuthGuard} from "@nebula/grpc-auth"
import {SettingsClientModule} from "./settings-client.module"
import {AuthClientModule} from "./auth-client.module"
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
export const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto")

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    ProductModule,
    CategoryModule,
    SettingsClientModule,
    AuthClientModule,
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
