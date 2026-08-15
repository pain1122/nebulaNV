import { RequestMethod, RequestMapping, applyDecorators } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
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

function runtimePath(policy: GatewayRoutePolicy): string {
  return policy.path.replace(/^\/api\/v1\/?/, "");
}

function successSchema(policy: GatewayRoutePolicy): Record<string, unknown> {
  if (policy.response === "stream") {
    return { type: "string", format: "binary" };
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
  return [400, 401, 403, 404, 409, 429, 503].map((status) =>
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
export function GatewayApiRoute(routeId: string): MethodDecorator {
  const policy = gatewayRoutePolicy(routeId);
  const decorators: MethodDecorator[] = [
    RequestMapping({
      method: REQUEST_METHOD[policy.method],
      path: runtimePath(policy),
    }),
    GatewayRoutePolicyRef(routeId),
    ApiExtraModels(...GATEWAY_OPENAPI_EXTRA_MODELS),
    ApiOperation({ operationId: operationId(policy), summary: policy.id }),
    ApiHeader({
      name: "X-Nebula-Client-ID",
      required: true,
      description:
        "Registered public client identifier; not an authentication secret.",
    }),
    ApiResponse({
      status: policy.successStatus,
      schema: successSchema(policy),
    }),
    ...errorResponses(),
  ];
  if (policy.retry === "key") {
    decorators.push(
      ApiHeader({
        name: "Idempotency-Key",
        required: true,
        description: "16-128 character high-entropy request key.",
      }),
    );
  }
  if (policy.actor === "authenticated" || policy.actor === "admin") {
    decorators.push(ApiBearerAuth("access-token"));
  }
  return applyDecorators(...decorators);
}
