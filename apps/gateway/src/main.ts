import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  logFatalStartup,
  logServiceReady,
  resolveHttpOnlyBind,
  serviceLogLevels,
} from "@packages/config";
import { AppModule } from "./app.module";
import { GATEWAY_DEFAULT_HTTP_PORT } from "./config/env.validation";
import { configureGatewayHttp } from "./http/configure-http";

const SERVICE_NAME = "gateway";
const logger = new Logger(SERVICE_NAME);

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: serviceLogLevels(),
  });
  const config = app.get(ConfigService);

  configureGatewayHttp(app, {
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
