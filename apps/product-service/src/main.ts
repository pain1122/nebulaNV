import { NestFactory } from '@nestjs/core';
import { AppModule, PRODUCT_PROTO } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'product',                // ← product, not user
      protoPath: PRODUCT_PROTO,
      url: process.env.GRPC_URL || '0.0.0.0:50053', // aligns with your .env
    },
  });

  await app.startAllMicroservices();

  const port = app.get(ConfigService).get<number>('PORT') ?? 3003;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(
    `HTTP listening on http://127.0.0.1:${port}  |  gRPC on ${process.env.GRPC_URL || '0.0.0.0:50053'}`,
  );
}
bootstrap();
