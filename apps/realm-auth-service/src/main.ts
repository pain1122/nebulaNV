import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  createHttpRequestLoggingMiddleware,
  createHttpSecurityHeadersMiddleware,
  logFatalStartup,
  logServiceReady,
  resolveHttpOnlyBind,
  serviceLogLevels,
} from "@packages/config";
import { AppModule } from "./app.module";
import { realmAuthDeployment } from "./config/realm-deployments";

const SERVICE_NAME = "realm-auth-service";
const logger = new Logger(SERVICE_NAME);

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: serviceLogLevels(),
  });
  app.enableShutdownHooks();
  app.use(
    createHttpRequestLoggingMiddleware(logger, { serviceName: SERVICE_NAME }),
  );
  app.use(createHttpSecurityHeadersMiddleware());
  const deployment = realmAuthDeployment(process.env.REALM_AUTH_DEPLOYMENT);
  const { httpPort } = resolveHttpOnlyBind(process.env, {
    servicePrefix: "REALM_AUTH",
    defaultHttpPort: deployment.defaultHttpPort,
  });
  await app.listen(httpPort);
  logServiceReady(
    logger,
    `${SERVICE_NAME}:${process.env.REALM_AUTH_DEPLOYMENT}`,
  );
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    logFatalStartup(logger, SERVICE_NAME, error);
    process.exitCode = 1;
  });
}
