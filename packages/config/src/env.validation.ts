import * as Joi from 'joi';

export const rootEnvSchema = Joi.object({
  // ------------------------------------------
  // 🌍 Environment and Global Behavior
  // ------------------------------------------
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PUBLIC_MODE: Joi.string().valid('OPEN', 'OPTIONAL_AUTH', 'GATEWAY_ONLY').default('OPEN'),

  // ------------------------------------------
  // 🔐 Gateway + S2S Security
  // ------------------------------------------
  S2S_SECRET: Joi.string().min(32).required(),
  GATEWAY_HEADER: Joi.string().default('x-gateway-sign'),

  // ------------------------------------------
  // 🧩 Internal gRPC Service Registry
  // ------------------------------------------
  USER_GRPC_URL: Joi.string().hostname().default('127.0.0.1:50051'),
  AUTH_GRPC_URL: Joi.string().hostname().default('127.0.0.1:50052'),
  PRODUCT_GRPC_URL: Joi.string().hostname().default('127.0.0.1:50053'),
  SETTINGS_GRPC_URL: Joi.string().hostname().default('127.0.0.1:50054'),

  USER_HTTP_PORT: Joi.number().default(3100),
  AUTH_HTTP_PORT: Joi.number().default(3001),
  PRODUCT_HTTP_PORT: Joi.number().default(3003),
  SETTINGS_HTTP_PORT: Joi.number().default(3010),

  // ------------------------------------------
  // 🔑 JWT Tokens (Shared by All Services)
  // ------------------------------------------
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
});
