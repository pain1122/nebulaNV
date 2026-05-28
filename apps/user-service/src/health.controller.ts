// apps/user-service/src/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public } from '@nebula/grpc-auth';
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

@Public()
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up', time: new Date().toISOString() };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { status: 'degraded', db: 'down', error: message };
    }
  }
}
