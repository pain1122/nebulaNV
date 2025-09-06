import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { SettingsModule } from './settings.module';

async function bootstrap() {
  const app = await NestFactory.create(SettingsModule); // optional HTTP for /health
  const grpcUrl = process.env.GRPC_URL ?? '0.0.0.0:50060';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'settings',
      protoPath: join(__dirname, '../../../packages/protos/settings.proto'),
      url: grpcUrl,
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3006);
  console.log(`[settings-service] gRPC on ${grpcUrl}`);
}
bootstrap();
