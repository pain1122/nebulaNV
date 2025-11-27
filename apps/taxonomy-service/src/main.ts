// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule, TAXONOMY_PROTO } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import helmet from "helmet";
import compression from "compression";
import { GrpcTokenAuthGuard } from "@nebula/grpc-auth";

function getHttpPort(cfg: ConfigService): number {
  const p =
    cfg.get<string>("PORT") ||
    cfg.get<string>("TAXONOMY_HTTP_PORT") ||
    "3006";
  return Number(p);
}

function getGrpcBind(cfg: ConfigService): string {
  const grpcPort =
    cfg.get<string>("GRPC_PORT") ||
    cfg.get<string>("TAXONOMY_GRPC_PORT") ||
    "50057";
  const host = cfg.get<string>("TAXONOMY_GRPC_HOST") || "0.0.0.0";
  return `${host}:${grpcPort}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const grpcUrl = getGrpcBind(cfg);

  const micro = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: grpcUrl,
      // this must match the `package` in taxonomy.proto
      package: "taxonomy", // or "taxonomy.v1" if that’s what you used
      protoPath: TAXONOMY_PROTO,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  micro.useGlobalGuards(app.get(GrpcTokenAuthGuard));

  await app.startAllMicroservices();

  const httpPort = getHttpPort(cfg);
  await app.listen(httpPort, "0.0.0.0");

  // eslint-disable-next-line no-console
  console.log(
    `[taxonomy-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`,
  );
}

bootstrap();
