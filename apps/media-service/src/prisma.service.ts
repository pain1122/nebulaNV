import {
  Injectable,
  Logger,
  OnModuleInit,
  INestApplication,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "../prisma/generated/client";

const prismaClientOptions = {
  log: [
    { emit: "event" as const, level: "query" as const },
    { emit: "event" as const, level: "error" as const },
  ],
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof prismaClientOptions>
  implements OnModuleInit
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(prismaClientOptions);

    this.$on("query", (e: Prisma.QueryEvent) => {
      try {
        this.log.debug(`QUERY: ${e.query} PARAMS: ${e.params}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(`Bad query log payload: ${message}`);
      }
    });

    this.$on("error", (e: Prisma.LogEvent) => {
      this.log.error(`PRISMA ERROR: ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    const url = process.env.DATABASE_URL;
    if (url) {
      const u = new URL(url);
      this.log.log(
        `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
      );
    } else {
      this.log.warn("[PrismaURL] DATABASE_URL is empty");
    }
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
