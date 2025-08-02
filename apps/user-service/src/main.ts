import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

const USER_PROTO = require.resolve('@nebula/protos/user.proto');

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
      package: 'user',
      protoPath: USER_PROTO,
      url: '0.0.0.0:50051',
    },
  });

  await app.startAllMicroservices();         
  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(port);                     
  console.log(
    `HTTP listening on http://localhost:${port}  |  gRPC on 0.0.0.0:50051`,
  );
}
bootstrap();
