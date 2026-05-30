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
    super(prismaClientOptions);

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
    await this.$connect();
    const u = new URL(process.env.DATABASE_URL ?? "");
    this.log.log(
      `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on("beforeExit", () => {
      void (async () => {
        try {
          await this.$disconnect();
          await app.close();
        } catch (e: unknown) {
          this.log.warn(`Shutdown hook failed: ${errorMessage(e)}`);
        }
      })();
    });
  }
}
