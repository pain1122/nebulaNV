import * as Joi from 'joi';
import { s2sEnvSchema } from '@nebula/grpc-auth';
import {
  bcryptEnvSchema,
  grpcTargetEnvSchema,
  httpPolicyEnvSchema,
  runtimeEnvSchema,
  serviceBindEnvSchema,
} from '@packages/config';

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...serviceBindEnvSchema('AUTH'),
  ...grpcTargetEnvSchema('AUTH_GRPC_URL', 'USER_GRPC_URL'),
  ...httpPolicyEnvSchema,
  ...s2sEnvSchema('auth-service'),
  ...bcryptEnvSchema,
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string()
    .pattern(/^\d+(?:ms|s|m|h|d|w|y)$/)
    .default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string()
    .pattern(/^\d+(?:ms|s|m|h|d|w|y)$/)
    .default('7d'),
});
