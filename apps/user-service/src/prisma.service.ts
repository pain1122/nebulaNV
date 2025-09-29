// apps/user-service/src/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../prisma/generated/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    const u = new URL(process.env.DATABASE_URL!);
    console.log(
      `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
