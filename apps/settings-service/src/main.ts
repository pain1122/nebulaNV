import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SettingsModule, SETTINGS_PROTO } from './settings.module';

function getGrpcBind(): string {
  // service-specific → legacy (your old name) → generic → default
  return (
    process.env.SETTINGS_GRPC_URL ??
    process.env.GRPC_URL ??
    '127.0.0.1:55123'
  );
}

function getHttpPort(): number {
  // service-specific → generic → default
  const p = process.env.SETTINGS_HTTP_PORT ?? process.env.PORT ?? '3010';
  return Number(p);
}

async function bootstrap() {
  const app = await NestFactory.create(SettingsModule); // optional HTTP (health)

  const grpcUrl = getGrpcBind();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'settings',
      protoPath: SETTINGS_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();

  const httpPort = getHttpPort();
  await app.listen(httpPort);

  // eslint-disable-next-line no-console
  console.log(`[settings-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}
bootstrap();
