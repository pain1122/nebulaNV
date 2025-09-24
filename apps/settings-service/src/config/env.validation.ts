import * as Joi from 'joi';

export const envSchema = Joi.object({
    NODE_ENV:        Joi.string().valid('development','test','production').default('development'),
    HTTP_PORT:       Joi.number().default(3010),        // if you expose HTTP; else omit
    GRPC_PORT:       Joi.number().default(4004),
    
    SVC_NAME:        Joi.string().default('settings-service'),
    S2S_SECRET:      Joi.string().min(32).required(),
    
    // Only if the gateway calls settings over HTTP:
    GATEWAY_SECRET:  Joi.string().min(32),
    GATEWAY_HEADER:  Joi.string().default('x-gateway-sign'),
    
    DATABASE_URL:    Joi.string().uri().required()
});
