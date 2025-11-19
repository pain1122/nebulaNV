import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import helmet from "helmet";
import compression from "compression";

const ORDER_PROTO = require.resolve("@nebula/protos/order.proto");

function getHttpPort(cfg: ConfigService): number {
  const p = cfg.get<string>("PORT") || cfg.get<string>("ORDER_HTTP_PORT") || "3005";
  return Number(p);
}

function getGrpcBind(cfg: ConfigService): string {
  const grpcPort = cfg.get<string>("GRPC_PORT");
  if (grpcPort) return `0.0.0.0:${grpcPort}`;
  return cfg.get<string>("ORDER_GRPC_URL") || "0.0.0.0:50056";
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const cfg = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
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

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "order",
      protoPath: ORDER_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();
  const httpPort = getHttpPort(cfg);
  await app.listen(httpPort, "0.0.0.0");

  // eslint-disable-next-line no-console
  console.log(`[order-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}

bootstrap();
