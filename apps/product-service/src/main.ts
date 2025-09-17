import { NestFactory } from '@nestjs/core';
import { AppModule, PRODUCT_PROTO } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

function portOf(url: string | undefined) {
  if (!url) return '';
  const m = url.match(/:(\d+)$/);
  return m ? m[1] : '';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // gRPC server bind (service-specific → legacy name → generic → default)
  const grpcUrl =
    process.env.PRODUCT_GRPC_URL ??
    process.env.GRPC_URL ??
    '0.0.0.0:50053';

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'product',
      protoPath: PRODUCT_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();

  // HTTP server bind (service-specific → generic → default)
  const cfg = app.get(ConfigService);
  const httpPort = Number(
    process.env.PRODUCT_HTTP_PORT ??
    process.env.PORT ??                  // generic fallback if you really need it
    cfg.get<number>('PORT') ?? 3003,
  );
  await app.listen(httpPort);

  // Helpful warning if someone reuses settings’ port by mistake
  const settingsTarget = process.env.SETTINGS_GRPC_URL;
  if (settingsTarget && portOf(settingsTarget) === portOf(grpcUrl)) {
    // eslint-disable-next-line no-console
    console.warn('[product] WARNING: PRODUCT gRPC port equals SETTINGS_GRPC_URL port. Change one of them.');
  }

  // eslint-disable-next-line no-console
  console.log(`(product) HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}
bootstrap();
