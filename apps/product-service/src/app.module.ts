import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { envSchema } from './config/env.validation';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { GrpcTokenAuthGuard } from '@nebula/grpc-auth';
import { SettingsClientModule } from './settings-client.module';
import { AuthClientModule } from './auth-client.module';
export const PRODUCT_PROTO = require.resolve('@nebula/protos/product.proto');

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }), AuthClientModule, ProductModule, CategoryModule, SettingsClientModule],
  providers: [
    Reflector,              // required by the guard for @Roles()
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class AppModule {}
