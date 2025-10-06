import * as Joi from "joi"

export const envSchema = Joi.object({
  SVC_NAME: Joi.string().default("settings-service"),
  GATEWAY_SECRET: Joi.string().min(32),
  DATABASE_URL: Joi.string().uri().required(),
  SHADOW_DATABASE_URL: Joi.string().uri().required(),
})
