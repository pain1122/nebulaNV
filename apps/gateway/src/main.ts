import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { assertGatewayOutboundRuntimeConfiguration } from "@nebula/grpc-auth";
import {
  logFatalStartup,
  logServiceReady,
  resolveHttpOnlyBind,
  serviceLogLevels,
} from "@packages/config";
import type { ApplicationRegistry } from "./application/application.contracts";
import { APPLICATION_REGISTRY } from "./application/application-registry";
import { AppModule } from "./app.module";
import { GATEWAY_DEFAULT_HTTP_PORT } from "./config/env.validation";
import { configureGatewayHttp } from "./http/configure-http";

const SERVICE_NAME = "gateway";
const logger = new Logger(SERVICE_NAME);

export function assertGatewayStartupConfiguration(): void {
  assertGatewayOutboundRuntimeConfiguration();
}

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: serviceLogLevels(),
  });
  const config = app.get(ConfigService);
  assertGatewayStartupConfiguration();

  configureGatewayHttp(app, {
    applicationRegistry: app.get<ApplicationRegistry>(APPLICATION_REGISTRY),
    jsonLimitBytes: config.getOrThrow<number>("GATEWAY_JSON_LIMIT_BYTES"),
    logger,
    nodeEnv: config.get<string>("NODE_ENV"),
  });

  const { httpPort } = resolveHttpOnlyBind(process.env, {
    servicePrefix: "GATEWAY",
    defaultHttpPort: GATEWAY_DEFAULT_HTTP_PORT,
  });
  await app.listen(httpPort);
  logServiceReady(logger, SERVICE_NAME);
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    logFatalStartup(logger, SERVICE_NAME, error);
    process.exitCode = 1;
  });
}
