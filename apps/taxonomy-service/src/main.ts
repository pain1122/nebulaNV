// src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule, TAXONOMY_PROTO } from "./app.module";
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
import { taxonomy } from "@nebula/protos";
import {
  startSecuredGrpc,
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
} from "@nebula/grpc-auth";

const SERVICE_NAME = "taxonomy-service";
const logger = new Logger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
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
    servicePrefix: "TAXONOMY",
    defaultHttpPort: 3006,
    defaultGrpcPort: 50057,
  });

  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "taxonomy",
        protoPath: TAXONOMY_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(
          taxonomy.TaxonomyServiceService,
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
