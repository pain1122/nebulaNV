import * as Joi from "joi"

export const envSchema = Joi.object({
  SVC_NAME: Joi.string().default("product-service"),
  GATEWAY_SECRET: Joi.string().min(32).required(),
  SHADOW_DATABASE_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().uri().required(),
})
