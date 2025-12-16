import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MediaModule, MEDIA_PROTO } from './media.module';

function getGrpcBind(): string {
  // Prefer an explicit port (bind to 0.0.0.0 for container reachability)
  const port = process.env.GRPC_PORT ?? process.env.MEDIA_GRPC_PORT;
  if (port) return `0.0.0.0:${port}`;

  // Fallback: listen on 0.0.0.0:50054 (not 127.0.0.1)
  return '0.0.0.0:50058';
}

function getHttpPort(): number {
  // service-specific → generic → default
  const p = process.env.MEDIA_HTTP_PORT ?? process.env.PORT ?? '3010';
  return Number(p);
}

async function bootstrap() {
  const app = await NestFactory.create(MediaModule); // optional HTTP (health)

  const grpcUrl = getGrpcBind();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'media',
      protoPath: MEDIA_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();

  const httpPort = getHttpPort();
  await app.listen(httpPort);

  // eslint-disable-next-line no-console
  console.log(`[media-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}
bootstrap();
