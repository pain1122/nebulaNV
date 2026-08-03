import { NestFactory } from "@nestjs/core";
import { AppModule, PRODUCT_PROTO } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import compression from "compression";
import { productv1 } from "@nebula/protos";
import {
  startSecuredGrpc,
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
} from "@nebula/grpc-auth";
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

const SERVICE_NAME = "product-service";
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
  // HTTP validation
  app.useGlobalPipes(createHttpValidationPipe());

  // HTTP security/perf
  app.use(createHttpSecurityHeadersMiddleware());
  app.use(compression());

  // CORS
  app.enableCors(
    createHttpCorsOptionsDelegate({
      origins: process.env.HTTP_CORS_ORIGINS,
    }),
  );

  // gRPC server
  const { httpPort, grpcUrl } = resolveServiceBind(process.env, {
    servicePrefix: "PRODUCT",
    defaultHttpPort: 3003,
    defaultGrpcPort: 50053,
  });
  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "product",
        protoPath: PRODUCT_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(
          productv1.ProductServiceService,
          productv1.ProductTaxonomyServiceService,
        ),
      },
    },
    { deferInitialization: true },
  );

  // ✅ Attach DI-managed guard so @Roles() is enforced on gRPC
  await startSecuredGrpc(app, micro);

  await app.listen(httpPort, "0.0.0.0");

  logServiceReady(logger, SERVICE_NAME);
}

void bootstrap().catch((error: unknown) => {
  logFatalStartup(logger, SERVICE_NAME, error);
  process.exitCode = 1;
});
