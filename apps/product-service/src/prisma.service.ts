import { Injectable, Logger, OnModuleDestroy, OnModuleInit, INestApplication } from "@nestjs/common";
import { PrismaClient } from "../prisma/generated/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("PrismaService");

  constructor() {
    // configure Prisma’s event emitter
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
      ],
    });

    // 👇 use bracket syntax to bypass Prisma’s generic overloads safely
    (this as any).$on("query", (e: any) => {
      try {
        this.log.debug?.(`QUERY: ${e.query} PARAMS: ${e.params}`);
      } catch (err) {
        this.log.warn(`Bad query log payload: ${JSON.stringify(e)}`);
      }
    });

    (this as any).$on("error", (e: any) => {
      this.log.error?.(`PRISMA ERROR: ${e.message || JSON.stringify(e)}`);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const u = new URL(process.env.DATABASE_URL ?? "");
      this.log.log(`[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`);
    } catch (e: any) {
      this.log.warn(`Prisma connect failed on startup: ${e?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      try {
        await this.$disconnect();
      } finally {
        await app.close();
      }
    });
  }
}
