import * as Joi from "joi";
import { httpOnlyBindEnvSchema, runtimeEnvSchema } from "@packages/config";

export const GATEWAY_DEFAULT_HTTP_PORT = 3002;
export const GATEWAY_DEFAULT_JSON_LIMIT_BYTES = 256 * 1024;
export const GATEWAY_DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
export const GATEWAY_DEFAULT_RATE_LIMIT_REQUESTS = 120;

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...httpOnlyBindEnvSchema("GATEWAY"),
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
});
