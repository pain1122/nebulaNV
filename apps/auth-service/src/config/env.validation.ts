import * as Joi from 'joi';

export const envSchema = Joi.object({
  SVC_NAME:        Joi.string().default('auth-service'),
  GATEWAY_SECRET:  Joi.string().min(32).required()
});