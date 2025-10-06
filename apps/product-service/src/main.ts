import { NestFactory } from '@nestjs/core';
import { AppModule, PRODUCT_PROTO } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import compression from 'compression';

function getHttpPort(cfg: ConfigService): number {
  // prefer service-local PORT, then service-specific, then default
  const p =
    cfg.get<string>('PORT') ||
    cfg.get<string>('PRODUCT_HTTP_PORT') ||
    '3003';
  return Number(p);
}

function getGrpcBind(cfg: ConfigService): string {
  // If GRPC_PORT is set, bind on 0.0.0.0:<port>
  const grpcPort = cfg.get<string>('GRPC_PORT');
  if (grpcPort) return `0.0.0.0:${grpcPort}`;

  // Else try service-specific URL (host:port) or default
  return cfg.get<string>('PRODUCT_GRPC_URL') || '0.0.0.0:50053';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const cfg = app.get(ConfigService);

  // validation
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // security/perf
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());

  // CORS (tune to your needs)
  app.enableCors({
    origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/(dev|stg|app)\.nebula\.local$/],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','x-gateway-sign'],
    maxAge: 600,
  });

  // gRPC server for the product package
  const grpcUrl = getGrpcBind(cfg);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'product',
      protoPath: PRODUCT_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();

  const httpPort = getHttpPort(cfg);
  await app.listen(httpPort, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`[product-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`);
}
bootstrap();
