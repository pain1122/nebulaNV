import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "@nestjs/common";
import { MediaModule, MEDIA_PROTO } from "./media.module";
import { media } from "@nebula/protos";
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

const SERVICE_NAME = "media-service";
const logger = new Logger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(MediaModule, {
    logger: serviceLogLevels(),
  }); // optional HTTP (health)
  app.enableShutdownHooks();
  app.use(
    createHttpRequestLoggingMiddleware(logger, {
      serviceName: SERVICE_NAME,
    }),
  );
  app.useGlobalPipes(createHttpValidationPipe());
  app.use(createHttpSecurityHeadersMiddleware());
  app.enableCors(
    createHttpCorsOptionsDelegate({
      origins: process.env.HTTP_CORS_ORIGINS,
      publicRenderPaths: ["/media/render"],
    }),
  );

  const { httpPort, grpcUrl } = resolveServiceBind(process.env, {
    servicePrefix: "MEDIA",
    defaultHttpPort: 3007,
    defaultGrpcPort: 50058,
  });
  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "media",
        protoPath: MEDIA_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(media.MediaServiceService),
      },
    },
    { deferInitialization: true },
  );
  await startSecuredGrpc(app, micro);

  await app.listen(httpPort);

  logServiceReady(logger, SERVICE_NAME);
}
void bootstrap().catch((error: unknown) => {
  logFatalStartup(logger, SERVICE_NAME, error);
  process.exitCode = 1;
});
