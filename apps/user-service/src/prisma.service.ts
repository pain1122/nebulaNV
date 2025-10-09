import { INestApplication, Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "../prisma/generated/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
      ],
    });

    // ✅ use bracket syntax + any to avoid Prisma 6 overload restriction
    (this as any).$on("query", (e: any) => {
      try {
        this.log.debug?.(`QUERY: ${e.query} PARAMS: ${e.params}`);
      } catch {
        this.log.warn(`Bad query log payload: ${JSON.stringify(e)}`);
      }
    });

    (this as any).$on("error", (e: any) => {
      this.log.error?.(`PRISMA ERROR: ${e.message || JSON.stringify(e)}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    const u = new URL(process.env.DATABASE_URL ?? "");
    this.log.log(`[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`);
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
