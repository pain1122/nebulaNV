// packages/config/src/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { rootEnvSchema } from './env.validation';
import * as Joi from 'joi';
import * as path from 'path';

function guessEnvFiles() {
  // In dev: cwd will be apps/<service> (because you use `pnpm -C apps/<svc> start:dev`)
  // In prod (Docker): cwd is /app, but each service passes its own env via compose/env_file.
  const cwd = process.cwd();
  return [
    path.resolve(cwd, '.env'),           // apps/<svc>/.env (service-local)
    path.resolve(cwd, '../../.env'),     // repo root .env (when cwd = apps/<svc>)
    path.resolve(cwd, '../../../.env'),  // safety if cwd differs
  ];
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: guessEnvFiles(),
      isGlobal: true,
      expandVariables: true,
      validationSchema: rootEnvSchema.keys({
        // allow per-service keys too
        PORT: Joi.number().optional(),
        GRPC_PORT: Joi.number().optional(),
      }),
      validationOptions: {
        allowUnknown: true,   // don’t strip service-only keys
        abortEarly: false,
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
