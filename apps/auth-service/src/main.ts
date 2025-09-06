import { NestFactory } from '@nestjs/core';
import { AppModule, AUTH_PROTO } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() { 
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const logger = new Logger('Bootstrap');

  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const isAuthPost = req.method === 'POST' && req.path.startsWith('/auth/');
    const bodyPreview = isAuthPost
      ? { ...req.body, password: req.body?.password ? '***' : undefined }
      : req.body;

    logger.log(`→ ${req.method} ${req.originalUrl}`);
    if (bodyPreview && Object.keys(bodyPreview).length) {
      logger.debug(`  body: ${JSON.stringify(bodyPreview)}`);
    }
    res.on('finish', () => {
      logger.log(
        `← ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
      );
    });
    next();
  });

  // gRPC server for AuthService
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: AUTH_PROTO,
      url: '0.0.0.0:50052',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
  logger.log('AuthService HTTP on http://127.0.0.1:3001 | gRPC on 0.0.0.0:50052');
}
bootstrap();
