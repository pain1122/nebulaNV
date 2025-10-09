import {Inject, Injectable, Logger, OnModuleInit} from "@nestjs/common"
import {PrismaService} from "../prisma.service"
import {ClientGrpc} from "@nestjs/microservices"
import {firstValueFrom} from "rxjs"
import {SETTINGS_SERVICE} from "../settings-client.module"
import {getSettings, type SettingsProxy, getSignedMetadata} from "@nebula/clients"

const NS = "product"
const KEY = "defaultProductCategoryId"

@Injectable()
export class DefaultCategoryInitializer implements OnModuleInit {
  private readonly log = new Logger(DefaultCategoryInitializer.name)
  private svc!: SettingsProxy

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc
  ) {}

  onModuleInit() {
    this.svc = getSettings(this.settingsClient)
    // fire and forget; don’t block bootstrap if settings is briefly unavailable
    this.ensureDefault().catch((err) => this.log.error(`ensureDefault failed: ${err?.message || err}`))
  }

  private async ensureDefault() {
    const category = await this.prisma.productCategory.upsert({
      where: {slug: "undefined"},
      update: {title: "Undefined", isHidden: true, isSystem: true},
      create: {slug: "undefined", title: "Undefined", isHidden: true, isSystem: true},
      select: {id: true},
    })

    const current = await firstValueFrom(this.svc.GetString({namespace: NS, key: KEY, environment: "default"})).catch(() => ({value: "", found: false}))

    if (current?.found && current.value) {
      this.log.log(`Default category already set in settings: ${current.value}`)
      return
    }

    // ✅ sign metadata
    const md = getSignedMetadata("product-service")

    await firstValueFrom(this.svc.SetString({namespace: NS, key: KEY, value: category.id, environment: "default"}, md))

    this.log.log(`Set ${NS}.${KEY} = ${category.id} via settings-service`)
  }
}
