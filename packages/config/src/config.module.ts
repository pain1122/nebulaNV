import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { rootEnvSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: [`.env`, `apps/${process.env.SVC_NAME || ''}/.env`],
      validationSchema: rootEnvSchema,
      isGlobal: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
