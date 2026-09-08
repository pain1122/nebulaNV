import * as Joi from "joi";
import { runtimeEnvSchema, serviceBindEnvSchema } from "@packages/config";
import { s2sEnvSchema } from "@nebula/grpc-auth";

export const AUTHORITY_DATABASE_NAME = "nebula_authority";
export const AUTHORITY_RUNTIME_DATABASE_ROLE = "nebula_authority_runtime";
const AUTHORITY_RUNTIME_DATABASE_PASSWORD_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function authorityRuntimeDatabaseUrl(
  value: string,
  helpers: Joi.CustomHelpers,
): string | Joi.ErrorReport {
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") ||
      parsed.username !== AUTHORITY_RUNTIME_DATABASE_ROLE ||
      !AUTHORITY_RUNTIME_DATABASE_PASSWORD_PATTERN.test(parsed.password) ||
      parsed.pathname !== `/${AUTHORITY_DATABASE_NAME}`
    ) {
      return helpers.error("any.invalid");
    }
    return value;
  } catch {
    return helpers.error("any.invalid");
  }
}

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...serviceBindEnvSchema("TENANT_AUTHORITY"),
  ...s2sEnvSchema("tenant-authority-service"),
  AUTH_GRPC_URL: Joi.string().trim().min(1).required(),
  AUTHORITY_AUDIT_HMAC_KEY_ID: Joi.string()
    .pattern(/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/)
    .required(),
  AUTHORITY_AUDIT_HMAC_KEY: Joi.string().min(32).required(),
  AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID: Joi.string()
    .pattern(/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/)
    .required(),
  AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string()
    .custom(authorityRuntimeDatabaseUrl, "authority runtime database URL")
    .required(),
});
