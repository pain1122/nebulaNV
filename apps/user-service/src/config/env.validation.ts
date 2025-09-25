import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV:        Joi.string().valid('development','test','production').default('development'),
  PORT:            Joi.number().default(3003),
  GRPC_PORT:       Joi.number().default(4003),
  
  SVC_NAME:        Joi.string().default('user-service'),
  S2S_SECRET:      Joi.string().min(32).required(),
  GATEWAY_SECRET:  Joi.string().min(32).required(),
  GATEWAY_HEADER:  Joi.string().default('x-gateway-sign'),
  
  DATABASE_URL:    Joi.string().uri().required(),
  
  // If the guard validates tokens locally:
  JWT_ACCESS_SECRET:  Joi.string().min(32).required()
});