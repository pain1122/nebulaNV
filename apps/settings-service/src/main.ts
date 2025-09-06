import { NestFactory } from '@nestjs/core';
import { SettingsModule } from './settings.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(SettingsModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'settings',
      protoPath: join(__dirname, '../../packages/protos/settings.proto'),
      url: process.env.GRPC_URL || '0.0.0.0:50060',
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3010);
  console.log('[settings] HTTP', process.env.PORT || 3010, 'gRPC', process.env.GRPC_URL || '0.0.0.0:50060');
}
bootstrap();