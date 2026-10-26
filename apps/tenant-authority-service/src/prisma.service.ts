import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Prisma, PrismaClient } from "../prisma/generated/client";

const prismaClientOptions = {
  log: [{ emit: "event" as const, level: "error" as const }],
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof prismaClientOptions>
  implements OnModuleDestroy
{
  private readonly log = new Logger("PrismaService");

  constructor() {
    super(prismaClientOptions);
    this.$on("error", () => {
      this.log.error("prisma_error");
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
