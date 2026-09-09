import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { createServiceLifecycleProvider } from "@packages/config";
import * as path from "node:path";
import { envSchema } from "./config/env.validation";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { RealmAuthRedisService } from "./realm-auth-redis.service";
import { RealmBoundaryService } from "./realm-boundary.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationSchema: envSchema,
      envFilePath: [
        path.resolve(__dirname, "../.env"),
        path.resolve(__dirname, "../../..", ".env"),
      ],
    }),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    RealmBoundaryService,
    RealmAuthRedisService,
    createServiceLifecycleProvider("realm-auth-service"),
  ],
})
export class AppModule {}
