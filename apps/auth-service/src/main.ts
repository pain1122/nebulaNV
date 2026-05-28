import { NestFactory } from '@nestjs/core';
import { AppModule, AUTH_PROTO } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function previewBody(body: unknown, maskPassword: boolean): unknown {
  if (!isRecord(body)) return body;
  if (!maskPassword) return body;

  return {
    ...body,
    password: body.password ? '***' : undefined,
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET?.length);
  const logger = new Logger('AuthService');

  // basic request logging (mask passwords in /auth/* POSTs)
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const isAuthPost = req.method === 'POST' && req.path.startsWith('/auth/');
    const bodyPreview = previewBody(req.body as unknown, isAuthPost);

    logger.log(`→ ${req.method} ${req.originalUrl}`);
    if (isRecord(bodyPreview) && Object.keys(bodyPreview).length) {
      logger.debug(`  body: ${JSON.stringify(bodyPreview)}`);
    }
    res.on('finish', () => {
      logger.log(
        `← ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });
    next();
  });

  // --- gRPC server bind (service-specific → shared → legacy → default) ---
  const grpcHost = process.env.GRPC_HOST ?? '0.0.0.0';
  const grpcPort = process.env.GRPC_PORT ?? '50052';
  const grpcUrl = `${grpcHost}:${grpcPort}`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();

  // --- HTTP server bind (service-specific → shared → default) ---
  const httpPort = Number(
    process.env.AUTH_HTTP_PORT ?? process.env.PORT ?? 3001,
  );
  await app.listen(httpPort);

  logger.log(
    `[auth-service] HTTP http://127.0.0.1:${httpPort} | gRPC ${grpcUrl}`,
  );
}
void bootstrap();
