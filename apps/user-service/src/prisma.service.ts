import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '../prisma/generated/client';
type PrismaEventClient = {
  $on(eventType: 'query', callback: (event: Prisma.QueryEvent) => void): void;
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
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });

    const prismaEvents = this as unknown as PrismaEventClient;

    // ✅ use bracket syntax + any to avoid Prisma 6 overload restriction
    prismaEvents.$on('query', (e) => {
      try {
        this.log.debug?.(`QUERY: ${e.query} PARAMS: ${e.params}`);
      } catch {
        this.log.warn(`Bad query log payload: ${JSON.stringify(e)}`);
      }
    });

    prismaEvents.$on('error', (e) => {
      this.log.error?.(`PRISMA ERROR: ${e.message || JSON.stringify(e)}`);
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

  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void (async () => {
        try {
          await this.$disconnect();
        } finally {
          await app.close();
        }
      })();
    });
  }
}
