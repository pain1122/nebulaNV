import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '../prisma/generated/client';
type PrismaEventClient = {
  $on(eventType: 'error', callback: (event: Prisma.LogEvent) => void): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger('PrismaService');

  constructor() {
    super({
      log: [{ emit: 'event', level: 'error' }],
    });

    const prismaEvents = this as unknown as PrismaEventClient;

    prismaEvents.$on('error', () => {
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
