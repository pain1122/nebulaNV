import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development','test','production').required(),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  // Auth service only:
  JWT_ACCESS_SECRET: Joi.string().min(32),
  JWT_REFRESH_SECRET: Joi.string().min(32),

  // gRPC peer URLs (as needed):
  GRPC_USER_URL: Joi.string(),
  GRPC_AUTH_URL: Joi.string(),
  GRPC_PRODUCT_URL: Joi.string(),
});
