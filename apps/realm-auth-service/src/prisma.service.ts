import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "./generated/prisma/client";
import { realmAuthPrismaOptions } from "./prisma-options";

@Injectable()
export class PrismaService
  extends PrismaClient<ReturnType<typeof realmAuthPrismaOptions>>
  implements OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(realmAuthPrismaOptions());
    this.$on("error", () => {
      this.log.error("prisma_error");
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
