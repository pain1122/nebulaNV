import type { INestApplication } from "@nestjs/common";
import { RequestMethod } from "@nestjs/common";
import { json } from "express";
import {
  createHttpRequestLoggingMiddleware,
  createHttpSecurityHeadersMiddleware,
  createHttpValidationPipe,
  type StructuredLogger,
} from "@packages/config";
import type { ApplicationRegistry } from "../application/application.contracts";
import {
  createGatewayApplicationContextMiddleware,
  createGatewayCorsOptionsDelegate,
} from "./application-context";

export const GATEWAY_API_PREFIX = "api/v1";

export interface ConfigureGatewayHttpOptions {
  applicationRegistry: ApplicationRegistry;
  jsonLimitBytes: number;
  logger: StructuredLogger;
  nodeEnv?: string;
}

export function configureGatewayHttp(
  app: INestApplication,
  options: ConfigureGatewayHttpOptions,
): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix(GATEWAY_API_PREFIX, {
    exclude: [
      { path: "health", method: RequestMethod.ALL },
      { path: "health/{*path}", method: RequestMethod.ALL },
    ],
  });
  app.use(
    createHttpRequestLoggingMiddleware(options.logger, {
      serviceName: "gateway",
    }),
  );
  app.use(createHttpSecurityHeadersMiddleware(options.nodeEnv));
  app.enableCors(createGatewayCorsOptionsDelegate(options.applicationRegistry));
  app.use(
    createGatewayApplicationContextMiddleware(options.applicationRegistry),
  );
  app.use(
    json({
      limit: options.jsonLimitBytes,
      strict: true,
      type: ["application/json", "application/*+json"],
    }),
  );
  app.useGlobalPipes(createHttpValidationPipe());
}
