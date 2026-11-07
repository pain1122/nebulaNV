import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { userPrismaOptions } from './prisma-options';

@Injectable()
export class PrismaService
  extends PrismaClient<ReturnType<typeof userPrismaOptions>>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger('PrismaService');

  constructor() {
    super(userPrismaOptions());

    this.$on('error', () => {
      this.log.error('prisma_error');
    });
  }

  async onModuleInit() {
    await this.$connect();
    const u = new URL(process.env.DATABASE_URL ?? '');
    this.log.log(
      `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
