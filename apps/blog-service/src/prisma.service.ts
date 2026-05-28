import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  INestApplication,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "../prisma/generated/client";
import { errorMessage } from "./error.utils";

const prismaClientOptions = {
  log: [
    { emit: "event" as const, level: "query" as const },
    { emit: "event" as const, level: "error" as const },
  ],
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof prismaClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    // configure Prisma’s event emitter
    super(prismaClientOptions);

    // 👇 use bracket syntax to bypass Prisma’s generic overloads safely
    this.$on("query", (e: Prisma.QueryEvent) => {
      try {
        this.log.debug(`QUERY: ${e.query} PARAMS: ${e.params}`);
      } catch {
        this.log.warn(`Bad query log payload: ${JSON.stringify(e)}`);
      }
    });
    this.$on("error", (e: Prisma.LogEvent) => {
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
      this.log.warn(`Prisma connect failed on startup: ${errorMessage(e)}`);
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
