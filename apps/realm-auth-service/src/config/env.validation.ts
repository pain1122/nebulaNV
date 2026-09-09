import * as Joi from "joi";
import { httpOnlyBindEnvSchema, runtimeEnvSchema } from "@packages/config";
import {
  REALM_AUTH_DEPLOYMENTS,
  type RealmAuthDeploymentName,
} from "./realm-deployments";

const RUNTIME_PASSWORD = /^[A-Za-z0-9_-]{32,128}$/;

function exactDeploymentConfiguration(
  value: Record<string, unknown>,
  helpers: Joi.CustomHelpers,
) {
  const name = value.REALM_AUTH_DEPLOYMENT as RealmAuthDeploymentName;
  const expected = REALM_AUTH_DEPLOYMENTS[name];
  if (!expected) return helpers.error("any.invalid");

  try {
    const databaseUrl = new URL(String(value.DATABASE_URL));
    const redisUrl = new URL(String(value.REALM_AUTH_REDIS_URL));
    if (
      !["postgresql:", "postgres:"].includes(databaseUrl.protocol) ||
      databaseUrl.username !== expected.runtimeRole ||
      !RUNTIME_PASSWORD.test(databaseUrl.password) ||
      databaseUrl.pathname !== `/${expected.databaseName}` ||
      redisUrl.protocol !== "redis:" ||
      redisUrl.pathname !== "/0" ||
      value.REALM_AUTH_IDENTITY_REALM_ID !== expected.identityRealmId ||
      value.REALM_AUTH_ROUTE_REF !== expected.authRouteRef ||
      value.REALM_AUTH_ISSUER !== expected.issuer
    ) {
      return helpers.error("any.invalid");
    }
  } catch {
    return helpers.error("any.invalid");
  }
  return value;
}

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...httpOnlyBindEnvSchema("REALM_AUTH"),
  REALM_AUTH_DEPLOYMENT: Joi.string().valid("DEFAULT", "OPERATOR").required(),
  REALM_AUTH_IDENTITY_REALM_ID: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),
  REALM_AUTH_ROUTE_REF: Joi.string().guid({ version: "uuidv4" }).required(),
  REALM_AUTH_ISSUER: Joi.string().trim().min(1).max(512).required(),
  REALM_AUTH_REDIS_URL: Joi.string()
    .uri({ scheme: ["redis"] })
    .required(),
  DATABASE_URL: Joi.string().required(),
}).custom(exactDeploymentConfiguration, "fixed realm deployment configuration");
