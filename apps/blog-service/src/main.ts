import { NestFactory } from "@nestjs/core";
import { AppModule, BLOG_PROTO } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import compression from "compression";
import { blogv1 } from "@nebula/protos";
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

const SERVICE_NAME = "blog-service";
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
    servicePrefix: "BLOG",
    defaultHttpPort: 3004,
    defaultGrpcPort: 50055,
  });
  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "blog",
        protoPath: BLOG_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(
          blogv1.BlogServiceService,
          blogv1.BlogTaxonomyServiceService,
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
