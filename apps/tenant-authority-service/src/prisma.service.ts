import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "./generated/prisma/client";
import { tenantAuthorityPrismaOptions } from "./prisma-options";

@Injectable()
export class PrismaService
  extends PrismaClient<ReturnType<typeof tenantAuthorityPrismaOptions>>
  implements OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(tenantAuthorityPrismaOptions());
    this.$on("error", () => {
      this.log.error("prisma_error");
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
