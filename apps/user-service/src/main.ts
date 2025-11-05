import { NestFactory } from '@nestjs/core';
import { AppModule, USER_PROTO } from './app.module';
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
      package: 'user', 
      protoPath: USER_PROTO,
      url: '0.0.0.0:50051',
    },
  });

  await app.startAllMicroservices();         
  const port = app.get(ConfigService).get<number>('USER_HTTP_PORT') ?? 3100;
  await app.listen(port);                     
  console.log(
    `[user-service] HTTP listening on http://127.0.0.1:${port}  |  gRPC on 0.0.0.0:50051`,
  );
}
bootstrap();
