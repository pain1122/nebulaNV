import {
  HttpCode,
  RequestMethod,
  RequestMapping,
  applyDecorators,
  type Type,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  GatewayCollectionEnvelopeDto,
  GatewayErrorEnvelopeDto,
  GatewayItemEnvelopeDto,
  GATEWAY_OPENAPI_EXTRA_MODELS,
} from "./openapi-envelope.dto";
import {
  gatewayRoutePolicy,
  type GatewayHttpMethod,
  type GatewayRoutePolicy,
} from "./route-policy";
import { GatewayRoutePolicyRef } from "../http/gateway-route-policy";

const REQUEST_METHOD: Readonly<Record<GatewayHttpMethod, RequestMethod>> = {
  GET: RequestMethod.GET,
  POST: RequestMethod.POST,
  PUT: RequestMethod.PUT,
  PATCH: RequestMethod.PATCH,
  DELETE: RequestMethod.DELETE,
};

const UUID_PATH_INPUTS = new Set([
  "uuid-id",
  "product-patch",
  "gallery-admin-list",
  "gallery-add",
  "gallery-order",
  "gallery-remove",
  "blog-patch",
  "taxonomy-patch",
  "cart-update",
  "order-status",
  "media-read-url",
  "media-owned-read-url",
  "media-render",
]);

function runtimePath(policy: GatewayRoutePolicy): string {
  return policy.path.replace(/^\/api\/v1\/?/, "");
}

export type GatewayApiRouteDocumentation = Readonly<{
  requestType?: Type<unknown>;
  requestRequired?: boolean;
  queryType?: Type<unknown>;
  responseType?: Type<unknown>;
  refreshCookie?: "set" | "clear";
}>;

function successSchema(
  policy: GatewayRoutePolicy,
  responseType?: Type<unknown>,
): Record<string, unknown> {
  if (policy.response === "stream") {
    return { type: "string", format: "binary" };
  }
  if (responseType && policy.response !== "collection") {
    return {
      allOf: [
        { $ref: getSchemaPath(GatewayItemEnvelopeDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(responseType) },
          },
        },
      ],
    };
  }
  if (responseType && policy.response === "collection") {
    return {
      allOf: [
        { $ref: getSchemaPath(GatewayCollectionEnvelopeDto) },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: getSchemaPath(responseType) },
            },
          },
        },
      ],
    };
  }
  return {
    $ref: getSchemaPath(
      policy.response === "collection"
        ? GatewayCollectionEnvelopeDto
        : GatewayItemEnvelopeDto,
    ),
  };
}

function operationId(policy: GatewayRoutePolicy): string {
  return policy.id.replace(/[^A-Za-z0-9_]/g, "_");
}

function errorResponses(): MethodDecorator[] {
  return [400, 401, 403, 404, 409, 429, 500, 502, 503, 504].map((status) =>
    ApiResponse({
      status,
      schema: { $ref: getSchemaPath(GatewayErrorEnvelopeDto) },
    }),
  );
}

/**
 * Binds runtime method/path, auth/application/retry policy, and OpenAPI
 * operation metadata to one manifest ID.
 */
export function GatewayApiRoute(
  routeId: string,
  documentation: GatewayApiRouteDocumentation = {},
): MethodDecorator {
  const policy = gatewayRoutePolicy(routeId);
  const routeModels = [
    ...GATEWAY_OPENAPI_EXTRA_MODELS,
    ...(documentation.requestType ? [documentation.requestType] : []),
    ...(documentation.queryType ? [documentation.queryType] : []),
    ...(documentation.responseType ? [documentation.responseType] : []),
  ];
  const decorators: MethodDecorator[] = [
    RequestMapping({
      method: REQUEST_METHOD[policy.method],
      path: runtimePath(policy),
    }),
    HttpCode(policy.successStatus),
    GatewayRoutePolicyRef(routeId),
    ApiExtraModels(...routeModels),
    ApiOperation({ operationId: operationId(policy), summary: policy.id }),
    ApiHeader({
      name: "X-Nebula-Client-ID",
      required: true,
      description:
        "Registered public client identifier; not an authentication secret.",
    }),
    ApiResponse({
      status: policy.successStatus,
      ...(policy.response === "stream"
        ? {
            content: {
              "application/octet-stream": {
                schema: successSchema(policy, documentation.responseType),
              },
            },
          }
        : { schema: successSchema(policy, documentation.responseType) }),
      ...(documentation.refreshCookie
        ? {
            headers: {
              "Set-Cookie": {
                description:
                  documentation.refreshCookie === "set"
                    ? "Sets or rotates the browser-only HttpOnly refreshToken cookie. Native mobile receives no cookie."
                    : "Deletes the browser-only refreshToken cookie with matching attributes.",
                schema: { type: "string" },
              },
            },
          }
        : {}),
    }),
    ...errorResponses(),
  ];
  if (documentation.requestType) {
    decorators.push(
      ApiBody({
        type: documentation.requestType,
        required: documentation.requestRequired ?? true,
      }),
    );
  }
  if (documentation.queryType) {
    decorators.push(ApiQuery({ type: documentation.queryType }));
  }
  for (const match of runtimePath(policy).matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)) {
    const name = match[1];
    decorators.push(
      ApiParam({
        name,
        required: true,
        ...(UUID_PATH_INPUTS.has(policy.input) ? { format: "uuid" } : {}),
      }),
    );
  }
  if (policy.retry === "key") {
    decorators.push(
      ApiHeader({
        name: "Idempotency-Key",
        required: true,
        description: "16-128 character high-entropy request key.",
      }),
    );
  }
  if (
    policy.actor === "user" ||
    policy.actor === "authenticated" ||
    policy.actor === "admin"
  ) {
    decorators.push(ApiBearerAuth("access-token"));
  }
  return applyDecorators(...decorators);
}
