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
import { GatewayAuthApiService } from "../auth/gateway-auth-api.service";
import { GatewayBrowserSessionService } from "../auth/browser-session";
import { GatewayUserApiService } from "../user/gateway-user-api.service";
import { GatewaySettingsApiService } from "../settings/gateway-settings-api.service";
import { GatewayProductApiService } from "../product/gateway-product-api.service";
import { GatewayBlogApiService } from "../blog/gateway-blog-api.service";
import { GatewayTaxonomyApiService } from "../taxonomy/gateway-taxonomy-api.service";
import { GatewayOrderApiService } from "../order/gateway-order-api.service";
import { GatewayMediaApiService } from "../media/gateway-media-api.service";
import { GatewayMediaRenderProxy } from "../media/gateway-media-render.proxy";

function failOnOpenApiCall(): never {
  throw new Error("gateway_openapi_adapter_called");
}

const OPENAPI_AUTH_ADAPTER = Object.freeze({
  register: failOnOpenApiCall,
  login: failOnOpenApiCall,
  refresh: failOnOpenApiCall,
  logout: failOnOpenApiCall,
  profile: failOnOpenApiCall,
});

type OpenApiParameterIdentity = Readonly<{
  $ref?: string;
  in?: string;
  name?: string;
}>;

const OPENAPI_BROWSER_SESSION = Object.freeze({
  isBrowser: failOnOpenApiCall,
  refreshTokenForRefresh: failOnOpenApiCall,
  refreshTokenForLogout: failOnOpenApiCall,
  setRefreshCookie: failOnOpenApiCall,
  clearRefreshCookie: failOnOpenApiCall,
});

const OPENAPI_USER_ADAPTER = Object.freeze({
  get: failOnOpenApiCall,
  update: failOnOpenApiCall,
  list: failOnOpenApiCall,
});

const OPENAPI_SETTINGS_ADAPTER = Object.freeze({
  get: failOnOpenApiCall,
  set: failOnOpenApiCall,
  delete: failOnOpenApiCall,
});

const OPENAPI_PRODUCT_ADAPTER = Object.freeze({
  listPublic: failOnOpenApiCall,
  getPublic: failOnOpenApiCall,
  listAdmin: failOnOpenApiCall,
  getAdmin: failOnOpenApiCall,
  create: failOnOpenApiCall,
  update: failOnOpenApiCall,
  mutateById: failOnOpenApiCall,
  applyDiscount: failOnOpenApiCall,
  listGallery: failOnOpenApiCall,
  addImages: failOnOpenApiCall,
  reorderImages: failOnOpenApiCall,
  removeImage: failOnOpenApiCall,
});

const OPENAPI_BLOG_ADAPTER = Object.freeze({
  list: failOnOpenApiCall,
  get: failOnOpenApiCall,
  create: failOnOpenApiCall,
  update: failOnOpenApiCall,
  delete: failOnOpenApiCall,
});

const OPENAPI_TAXONOMY_ADAPTER = Object.freeze({
  list: failOnOpenApiCall,
  get: failOnOpenApiCall,
  create: failOnOpenApiCall,
  update: failOnOpenApiCall,
  delete: failOnOpenApiCall,
});

const OPENAPI_ORDER_ADAPTER = Object.freeze({
  getCart: failOnOpenApiCall,
  addToCart: failOnOpenApiCall,
  updateCartItem: failOnOpenApiCall,
  removeCartItem: failOnOpenApiCall,
  checkout: failOnOpenApiCall,
  list: failOnOpenApiCall,
  get: failOnOpenApiCall,
  updateStatus: failOnOpenApiCall,
});

const OPENAPI_MEDIA_ADAPTER = Object.freeze({
  get: failOnOpenApiCall,
  list: failOnOpenApiCall,
  listOwned: failOnOpenApiCall,
  presign: failOnOpenApiCall,
  finalize: failOnOpenApiCall,
  readUrl: failOnOpenApiCall,
  readOwnedUrl: failOnOpenApiCall,
  deleteLane: failOnOpenApiCall,
  previewPublicDelete: failOnOpenApiCall,
  confirmPublicDelete: failOnOpenApiCall,
});

const OPENAPI_MEDIA_RENDER_ADAPTER = Object.freeze({
  open: failOnOpenApiCall,
});

@Module({
  controllers: [...GATEWAY_HTTP_CONTROLLERS],
  providers: [
    { provide: GatewayAuthApiService, useValue: OPENAPI_AUTH_ADAPTER },
    { provide: GatewayBrowserSessionService, useValue: OPENAPI_BROWSER_SESSION },
    { provide: GatewayUserApiService, useValue: OPENAPI_USER_ADAPTER },
    { provide: GatewaySettingsApiService, useValue: OPENAPI_SETTINGS_ADAPTER },
    { provide: GatewayProductApiService, useValue: OPENAPI_PRODUCT_ADAPTER },
    { provide: GatewayBlogApiService, useValue: OPENAPI_BLOG_ADAPTER },
    { provide: GatewayTaxonomyApiService, useValue: OPENAPI_TAXONOMY_ADAPTER },
    { provide: GatewayOrderApiService, useValue: OPENAPI_ORDER_ADAPTER },
    { provide: GatewayMediaApiService, useValue: OPENAPI_MEDIA_ADAPTER },
    { provide: GatewayMediaRenderProxy, useValue: OPENAPI_MEDIA_RENDER_ADAPTER },
  ],
})
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
  const document = SwaggerModule.createDocument(app, OPENAPI_CONFIG, {
    include: [GatewayOpenApiContractModule],
    extraModels: [...GATEWAY_OPENAPI_EXTRA_MODELS],
    operationIdFactory: (_controller, method) => method,
  });

  // Nest Swagger reflects @Query() DTOs and also expands the explicit
  // manifest-owned ApiQuery metadata. Keep the explicit entry (which carries
  // the stricter enum/range schema) while enforcing OpenAPI's unique
  // (location, name) parameter rule.
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (
        !operation ||
        typeof operation !== "object" ||
        !("responses" in operation) ||
        !Array.isArray(operation.parameters)
      ) {
        continue;
      }

      const seen = new Set<string>();
      operation.parameters = operation.parameters.filter(
        (parameter: OpenApiParameterIdentity) => {
          const key = parameter.$ref
            ? `$ref:${parameter.$ref}`
            : `${parameter.in}:${parameter.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        },
      );
    }
  }

  return document;
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
    abortOnError: false,
  });
  app.setGlobalPrefix("api/v1");
  try {
    return createGatewayOpenApiDocument(app);
  } finally {
    await app.close();
  }
}
