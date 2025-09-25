import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV:        Joi.string().valid('development','test','production').default('development'),
  PORT:            Joi.number().default(3001),
  GRPC_PORT:       Joi.number().default(4001),

  SVC_NAME:        Joi.string().default('auth-service'),
  S2S_SECRET:      Joi.string().min(32).required(),
  GATEWAY_SECRET:  Joi.string().min(32),              // only if called by gateway directly
  GATEWAY_HEADER:  Joi.string().default('x-gateway-sign'),

  JWT_ACCESS_SECRET:  Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ACCESS_EXPIRES_IN:  Joi.string().default('15m'),
  REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  DATABASE_URL:    Joi.string().uri(),                // required if you store refresh hashes
  USER_GRPC_URL:   Joi.string().default('localhost:4003')
});