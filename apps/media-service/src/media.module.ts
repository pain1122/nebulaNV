import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { ClientsModule, Transport } from "@nestjs/microservices"
import * as path from "path"

import { MediaController } from "./media.controller"
import { MediaGrpcController } from "./grpc/media-grpc.controller"
import { MediaService } from "./media.service"
import { PrismaService } from "./prisma.service"
import { envSchema } from "./config/env.validation"

import { GrpcTokenAuthGuard } from "@nebula/grpc-auth"

const AUTH_PROTO = require.resolve("@nebula/protos/auth.proto")
export const MEDIA_PROTO = require.resolve("@nebula/protos/auth.proto")

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

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    ClientsModule.register([
      {
        name: "AUTH_SERVICE",
        transport: Transport.GRPC,
        options: {
          url: process.env.AUTH_GRPC_URL ?? "127.0.0.1:50052",
          protoPath: AUTH_PROTO,
          package: "auth", // IMPORTANT: must match `package ...;` in auth.proto
        },
      },
    ]),
  ],

  controllers: [MediaController, MediaGrpcController],

  providers: [
    PrismaService,
    MediaService,

    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GrpcTokenAuthGuard },
  ],
})
export class MediaModule {}
