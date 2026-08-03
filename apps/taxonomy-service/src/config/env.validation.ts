import * as Joi from "joi";
import { s2sEnvSchema } from "@nebula/grpc-auth";
import {
  grpcTargetEnvSchema,
  httpPolicyEnvSchema,
  jwtAccessVerificationEnvSchema,
  runtimeEnvSchema,
  serviceBindEnvSchema,
} from "@packages/config";

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...serviceBindEnvSchema("TAXONOMY"),
  ...grpcTargetEnvSchema("AUTH_GRPC_URL", "SETTINGS_GRPC_URL"),
  ...httpPolicyEnvSchema,
  ...s2sEnvSchema("taxonomy-service"),
  ...jwtAccessVerificationEnvSchema,
  SHADOW_DATABASE_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().uri().required(),
});
