import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV:        Joi.string().valid('development','test','production').default('development'),
  PORT:            Joi.number().default(3002),
  GRPC_PORT:       Joi.number().default(4002),

  SVC_NAME:        Joi.string().default('product-service'),
  S2S_SECRET:      Joi.string().min(32).required(),
  GATEWAY_SECRET:  Joi.string().min(32).required(),
  GATEWAY_HEADER:  Joi.string().default('x-gateway-sign'),

  DATABASE_URL:    Joi.string().uri().required(),

  // Only if this service validates tokens in its guard:
  JWT_ACCESS_SECRET:  Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(), // not needed unless it issues refreshes

  // Peer URLs (use consistent names):
  SETTINGS_GRPC_URL: Joi.string().default('localhost:4004'),
  AUTH_GRPC_URL:     Joi.string().default('localhost:4001')
});
