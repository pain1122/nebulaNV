import * as Joi from "joi";
import { gatewayOutboundEnvSchema } from "@nebula/grpc-auth";
import {
  httpOnlyBindEnvSchema,
  requiredGrpcTargetEnvSchema,
  runtimeEnvSchema,
} from "@packages/config";

export const GATEWAY_DEFAULT_HTTP_PORT = 3002;
export const GATEWAY_DEFAULT_JSON_LIMIT_BYTES = 256 * 1024;
export const GATEWAY_DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
export const GATEWAY_DEFAULT_RATE_LIMIT_REQUESTS = 120;
export const GATEWAY_DEFAULT_READINESS_TIMEOUT_MS = 1_500;
export const GATEWAY_APPLICATION_REGISTRY_MAX_BYTES = 64 * 1024;
export const GATEWAY_GRPC_TARGET_ENV_NAMES = Object.freeze([
  "AUTH_GRPC_URL",
  "USER_GRPC_URL",
  "PRODUCT_GRPC_URL",
  "SETTINGS_GRPC_URL",
  "BLOG_GRPC_URL",
  "ORDER_GRPC_URL",
  "TAXONOMY_GRPC_URL",
  "MEDIA_GRPC_URL",
]);

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...httpOnlyBindEnvSchema("GATEWAY"),
  ...gatewayOutboundEnvSchema(),
  ...requiredGrpcTargetEnvSchema(...GATEWAY_GRPC_TARGET_ENV_NAMES),
  GATEWAY_APPLICATION_REGISTRY_JSON: Joi.string()
    .min(2)
    .max(GATEWAY_APPLICATION_REGISTRY_MAX_BYTES)
    .required(),
  GATEWAY_JSON_LIMIT_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(1024 * 1024)
    .default(GATEWAY_DEFAULT_JSON_LIMIT_BYTES),
  GATEWAY_RATE_LIMIT_TTL_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60 * 60 * 1000)
    .default(GATEWAY_DEFAULT_RATE_LIMIT_TTL_MS),
  GATEWAY_RATE_LIMIT_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .max(10_000)
    .default(GATEWAY_DEFAULT_RATE_LIMIT_REQUESTS),
  GATEWAY_REDIS_URL: Joi.string()
    .uri({ scheme: ["redis", "rediss"] })
    .required(),
  GATEWAY_READINESS_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(10_000)
    .default(GATEWAY_DEFAULT_READINESS_TIMEOUT_MS),
});
