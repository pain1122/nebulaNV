import { NestFactory } from '@nestjs/core';
import { AppModule, AUTH_PROTO } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
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
import { authv1 } from '@nebula/protos';
import {
  startSecuredGrpc,
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
} from '@nebula/grpc-auth';

const SERVICE_NAME = 'auth-service';
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
  app.enableCors(
    createHttpCorsOptionsDelegate({
      origins: process.env.HTTP_CORS_ORIGINS,
    }),
  );

  const { httpPort, grpcUrl } = resolveServiceBind(process.env, {
    servicePrefix: 'AUTH',
    defaultHttpPort: 3001,
    defaultGrpcPort: 50052,
  });

  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: AUTH_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(authv1.AuthServiceService),
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
