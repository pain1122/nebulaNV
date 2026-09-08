import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { tenantauthorityv1 } from "@nebula/protos";
import {
  grpcS2SProtoLoaderOptions,
  grpcS2SServerChannelOptions,
  startSecuredGrpc,
} from "@nebula/grpc-auth";
import {
  createHttpCorsOptionsDelegate,
  createHttpRequestLoggingMiddleware,
  createHttpSecurityHeadersMiddleware,
  createHttpValidationPipe,
  logFatalStartup,
  logServiceReady,
  resolveServiceBind,
  serviceLogLevels,
} from "@packages/config";
import { AppModule } from "./app.module";

const SERVICE_NAME = "tenant-authority-service";
export const TENANT_AUTHORITY_PROTO = require.resolve(
  "@nebula/protos/tenant_authority.proto",
);
const logger = new Logger(SERVICE_NAME);

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
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
    servicePrefix: "TENANT_AUTHORITY",
    defaultHttpPort: 3011,
    defaultGrpcPort: 50059,
  });
  const micro = app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: "tenant_authority.v1",
        protoPath: TENANT_AUTHORITY_PROTO,
        loader: grpcS2SProtoLoaderOptions(),
        url: grpcUrl,
        channelOptions: grpcS2SServerChannelOptions(
          tenantauthorityv1.TenantAuthorityServiceService,
        ),
      },
    },
    { deferInitialization: true },
  );
  await startSecuredGrpc(app, micro);
  await app.listen(httpPort);
  logServiceReady(logger, SERVICE_NAME);
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    logFatalStartup(logger, SERVICE_NAME, error);
    process.exitCode = 1;
  });
}
