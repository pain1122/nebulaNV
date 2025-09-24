import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // CORS: allow your UI domain(s) only
  app.enableCors({
    origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/(dev|stg|app)\.nebula\.local$/],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','x-gateway-sign'],
    maxAge: 600,
  });

  // Security headers + tiny perf win
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());

  // (you already have a global ValidationPipe via @UsePipes or providers)
  await app.listen(process.env.PRODUCT_HTTP_PORT ?? 3000);
}
bootstrap();
