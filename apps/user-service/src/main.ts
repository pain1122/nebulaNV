import { NestFactory } from '@nestjs/core';
import { AppModule, USER_PROTO } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { userv1 } from '@nebula/protos';
import {
  startSecuredGrpc,
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
} from '@nebula/grpc-auth';
import {
  createHttpRequestLoggingMiddleware,
  createHttpCorsOptionsDelegate,
  createHttpSecurityHeadersMiddleware,
  createHttpValidationPipe,
  logFatalStartup,
  logServiceReady,
  resolveServiceBind,
  serviceLogLevels,
} from '@packages/config';

const SERVICE_NAME = 'user-service';
const logger = new Logger(SERVICE_NAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: serviceLogLevels(),
  });
  app.enableShutdownHooks();
  const { httpPort, grpcUrl } = resolveServiceBind(process.env, {
    servicePrefix: 'USER',
    defaultHttpPort: 3100,
    defaultGrpcPort: 50051,
  });

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
    }),
  );

  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: USER_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(userv1.UserServiceService),
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
