import {Injectable, Logger, OnModuleInit, INestApplication} from "@nestjs/common"
import {PrismaClient} from "../prisma/generated/client"

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly log = new Logger("PrismaService")

  constructor() {
    super({
      log: [
        {emit: "event", level: "query"},
        {emit: "event", level: "error"},
      ],
    })

    // ✅ Use bracket syntax and `any` to bypass Prisma 6 strict typings safely
    ;(this as any).$on("query", (e: any) => {
      try {
        this.log.debug?.(`QUERY: ${e.query} PARAMS: ${e.params}`)
      } catch (err) {
        this.log.warn(`Bad query log payload: ${JSON.stringify(e)}`)
      }
    })

    ;(this as any).$on("error", (e: any) => {
      this.log.error?.(`PRISMA ERROR: ${e.message || JSON.stringify(e)}`)
    })
  }

  async onModuleInit() {
    await this.$connect()
    const url = process.env.DATABASE_URL
    if (url) {
      const u = new URL(url)
      this.log.log(`[PrismaURL] ${u.protocol}//${u.hostname}:${u.port}${u.pathname}`)
    } else {
      this.log.warn("[PrismaURL] DATABASE_URL is empty")
    }
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
