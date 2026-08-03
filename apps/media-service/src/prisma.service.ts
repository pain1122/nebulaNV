import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "../prisma/generated/client";

const prismaClientOptions = {
  log: [{ emit: "event" as const, level: "error" as const }],
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof prismaClientOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(prismaClientOptions);

    this.$on("error", () => {
      this.log.error("prisma_error");
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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
