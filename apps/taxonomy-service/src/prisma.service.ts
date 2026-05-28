import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  INestApplication,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "../prisma/generated/client";

type PrismaEventClient = {
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): void;
  $on(eventType: "error", callback: (event: Prisma.LogEvent) => void): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    // configure Prisma’s event emitter
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
      ],
    });

    const prismaEvents = this as unknown as PrismaEventClient;

    prismaEvents.$on("query", (e) => {
      this.log.debug(`QUERY: ${e.query} PARAMS: ${e.params}`);
    });

    prismaEvents.$on("error", (e) => {
      this.log.error(`PRISMA ERROR: ${e.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const u = new URL(process.env.DATABASE_URL ?? "");
      this.log.log(
        `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown Prisma error";
      this.log.warn(`Prisma connect failed on startup: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on("beforeExit", () => {
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
