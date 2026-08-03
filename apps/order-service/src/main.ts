import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import {
  createHttpRequestLoggingMiddleware,
  createHttpCorsOptionsDelegate,
  createHttpSecurityHeadersMiddleware,
  createHttpValidationPipe,
  logFatalStartup,
  logServiceReady,
  resolveServiceBind,
  serviceLogLevels,
} from "@packages/config";
import compression from "compression";
import { orderv1 } from "@nebula/protos";
import {
  startSecuredGrpc,
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
} from "@nebula/grpc-auth";

const ORDER_PROTO = require.resolve("@nebula/protos/order.proto");
const SERVICE_NAME = "order-service";
const logger = new Logger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    logger: serviceLogLevels(),
  });
  app.enableShutdownHooks();

  app.use(
    createHttpRequestLoggingMiddleware(logger, {
      serviceName: SERVICE_NAME,
    }),
  );
  app.useGlobalPipes(createHttpValidationPipe());
  app.use(createHttpSecurityHeadersMiddleware());
  app.use(compression());
  app.enableCors(
    createHttpCorsOptionsDelegate({
      origins: process.env.HTTP_CORS_ORIGINS,
    }),
  );

  const { httpPort, grpcUrl } = resolveServiceBind(process.env, {
    servicePrefix: "ORDER",
    defaultHttpPort: 3005,
    defaultGrpcPort: 50056,
  });

  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "order",
        protoPath: ORDER_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(
          orderv1.OrderServiceService,
        ),
      },
    },
    { deferInitialization: true },
  );
  await startSecuredGrpc(app, micro);
  await app.listen(httpPort, "0.0.0.0");

  logServiceReady(logger, SERVICE_NAME);
}

void bootstrap().catch((error: unknown) => {
  logFatalStartup(logger, SERVICE_NAME, error);
  process.exitCode = 1;
});
