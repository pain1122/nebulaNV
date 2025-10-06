import {INestApplication, Injectable, OnModuleInit} from "@nestjs/common"
import {PrismaClient} from "../prisma/generated"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
    const u = new URL(process.env.DATABASE_URL!)
    console.log(`[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`)
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      try {
        await this.$disconnect()
      } finally {
        await app.close()
      }
    })
  }
}
