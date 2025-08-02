import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';

const AUTH_PROTO_PATH = require.resolve('@nebula/protos/auth.proto');


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Attach gRPC server for AuthService
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO_PATH,
      url: '0.0.0.0:50052',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
  console.log('AuthService HTTP on http://localhost:3001 | gRPC on 0.0.0.0:50052');
}
bootstrap();
