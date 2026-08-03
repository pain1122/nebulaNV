import * as Joi from 'joi';
import { s2sEnvSchema } from '@nebula/grpc-auth';
import {
  bcryptEnvSchema,
  grpcTargetEnvSchema,
  httpPolicyEnvSchema,
  jwtAccessVerificationEnvSchema,
  runtimeEnvSchema,
  serviceBindEnvSchema,
} from '@packages/config';

export const envSchema = Joi.object({
  ...runtimeEnvSchema,
  ...serviceBindEnvSchema('USER'),
  ...grpcTargetEnvSchema('AUTH_GRPC_URL'),
  ...httpPolicyEnvSchema,
  ...s2sEnvSchema('user-service'),
  ...bcryptEnvSchema,
  ...jwtAccessVerificationEnvSchema,
  DATABASE_URL: Joi.string().uri().required(),
  SHADOW_DATABASE_URL: Joi.string().uri().required(),
});
