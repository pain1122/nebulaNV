import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "./generated/prisma/client";
import { taxonomyPrismaOptions } from "./prisma-options";

@Injectable()
export class PrismaService
  extends PrismaClient<ReturnType<typeof taxonomyPrismaOptions>>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(taxonomyPrismaOptions());

    this.$on("error", () => {
      this.log.error("prisma_error");
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const u = new URL(process.env.DATABASE_URL ?? "");
      this.log.log(
        `[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`,
      );
    } catch {
      this.log.warn("prisma_connect_failed");
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
