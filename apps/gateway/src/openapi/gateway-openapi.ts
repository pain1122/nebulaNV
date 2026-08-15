import type { INestApplication } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import { GATEWAY_HTTP_CONTROLLERS } from "../contracts/gateway-http-controllers";
import { GATEWAY_OPENAPI_EXTRA_MODELS } from "../contracts/openapi-envelope.dto";

@Module({ controllers: [...GATEWAY_HTTP_CONTROLLERS] })
export class GatewayOpenApiContractModule {}

const OPENAPI_CONFIG = new DocumentBuilder()
  .setTitle("Nebula External API")
  .setDescription("Versioned external API for registered Nebula clients.")
  .setVersion("1.0.0")
  .addBearerAuth(
    { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    "access-token",
  )
  .build();

export function createGatewayOpenApiDocument(
  app: INestApplication,
): OpenAPIObject {
  return SwaggerModule.createDocument(app, OPENAPI_CONFIG, {
    include: [GatewayOpenApiContractModule],
    extraModels: [...GATEWAY_OPENAPI_EXTRA_MODELS],
    operationIdFactory: (_controller, method) => method,
  });
}

function sortDocumentValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDocumentValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortDocumentValue(child)]),
  );
}

export function serializeGatewayOpenApiDocument(
  document: OpenAPIObject,
): string {
  return `${JSON.stringify(sortDocumentValue(document), null, 2)}\n`;
}

export async function generateGatewayOpenApiDocument(): Promise<OpenAPIObject> {
  const app = await NestFactory.create(GatewayOpenApiContractModule, {
    logger: false,
  });
  app.setGlobalPrefix("api/v1");
  try {
    return createGatewayOpenApiDocument(app);
  } finally {
    await app.close();
  }
}
