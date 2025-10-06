// apps/product-service/src/prisma.service.ts
import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from "@nestjs/common"
import {PrismaClient} from "../prisma/generated"
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name)
  async onModuleInit() {
    await this.$connect().catch((e) => {
      this.log.warn(`Prisma connect failed on startup: ${e?.message}`)
      const u = new URL(process.env.DATABASE_URL!)
      console.log(`[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`)
    })
  }
  async onModuleDestroy() {
    await this.$disconnect()
  }
}
