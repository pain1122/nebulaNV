// packages/config/src/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

const envSchema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(3000),
    // Add other env vars as needed
  });
  
  @Module({
    imports: [
      NestConfigModule.forRoot({
        isGlobal: true,
        validationSchema: envSchema,
      }),
    ],
    exports: [NestConfigModule],
  })
  export class ConfigModule {}
