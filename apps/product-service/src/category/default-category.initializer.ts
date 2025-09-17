import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SETTINGS_SERVICE } from '../settings-client.module';

const NS = 'product';
const KEY = 'default_product_category_id';

interface SettingsGrpc {
  GetString(req: { namespace: string; key: string; environment?: string }): import('rxjs').Observable<{ value: string; found: boolean }>;
  SetString(req: { namespace: string; key: string; value: string; environment?: string }): import('rxjs').Observable<{ value: string }>;
}

@Injectable()
export class DefaultCategoryInitializer implements OnModuleInit {
  private readonly log = new Logger(DefaultCategoryInitializer.name);
  private svc!: SettingsGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.svc = this.settingsClient.getService<SettingsGrpc>('SettingsService');
    // fire and forget; don’t block bootstrap if settings is briefly unavailable
    this.ensureDefault().catch(err => this.log.error(`ensureDefault failed: ${err?.message || err}`));
  }

  private async ensureDefault() {
    // 1) Ensure local category exists (idempotent)
    const category = await this.prisma.productCategory.upsert({
      where: { slug: 'undefined' },
      update: { title: 'Undefined', isHidden: true, isSystem: true },
      create: { slug: 'undefined', title: 'Undefined', isHidden: true, isSystem: true },
      select: { id: true },
    });

    // 2) Read current value from settings-service (gRPC)
    const current = await firstValueFrom(
      this.svc.GetString({ namespace: NS, key: KEY, environment: 'default' })
    ).catch(() => ({ value: '', found: false }));

    if (current?.found && current.value) {
      this.log.log(`Default category already set in settings: ${current.value}`);
      return;
    }

    // 3) Write the ID to settings-service (gRPC)
    await firstValueFrom(
      this.svc.SetString({
        namespace: NS,
        key: KEY,
        value: category.id,
        environment: 'default',
      })
    );

    this.log.log(`Set ${NS}.${KEY} = ${category.id} via settings-service`);
  }
}
