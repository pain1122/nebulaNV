import { NestFactory } from "@nestjs/core";
import { AppModule, BLOG_PROTO } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import helmet from "helmet";
import compression from "compression";
import { GrpcTokenAuthGuard } from "@nebula/grpc-auth";

function getHttpPort(cfg: ConfigService): number {
  const p = cfg.get<string>("PORT") || cfg.get<string>("BLOG_HTTP_PORT") || "3004";
  return Number(p);
}

function getGrpcBind(cfg: ConfigService): string {
  const grpcPort = cfg.get<string>("GRPC_PORT");
  if (grpcPort) return `0.0.0.0:${grpcPort}`;
  return cfg.get<string>("BLOG_GRPC_URL") || "0.0.0.0:50055";
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const cfg = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());

  app.enableCors({
    origin: [/^https?:\/\/localhost(:\d+)?$/],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-gateway-sign"],
    maxAge: 600,
  });

  const grpcUrl = getGrpcBind(cfg);
  const micro = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: { package: "blog", protoPath: BLOG_PROTO, url: grpcUrl },
  });

  micro.useGlobalGuards(app.get(GrpcTokenAuthGuard)); // for future gRPC endpoints

  await app.startAllMicroservices();

  const httpPort = getHttpPort(cfg);
  await app.listen(httpPort, "0.0.0.0");
  console.log(`[blog-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}

bootstrap();
