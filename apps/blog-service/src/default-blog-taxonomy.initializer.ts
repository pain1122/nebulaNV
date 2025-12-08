// src/default-blog-taxonomy.initializer.ts
import {BadRequestException, Inject, Injectable, Logger, OnModuleInit} from "@nestjs/common"
import {ClientGrpc} from "@nestjs/microservices"
import {firstValueFrom} from "rxjs"
import {ConfigService} from "@nestjs/config"
import { Metadata } from '@grpc/grpc-js';
import {TAXONOMY_SERVICE} from "./taxonomy-client.module"
import {SETTINGS_SERVICE} from "./settings-client.module"
import {TaxonomyProxy, SettingsProxy, getTaxonomy, getSettings} from "@nebula/clients"

@Injectable()
export class DefaultBlogTaxonomyInitializer implements OnModuleInit {
  private readonly logger = new Logger(DefaultBlogTaxonomyInitializer.name)

  constructor(
    @Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
    private readonly config: ConfigService
  ) {}

  private taxonomy(): TaxonomyProxy {
    return getTaxonomy(this.taxonomyClient)
  }

  private settings(): SettingsProxy {
    return getSettings(this.settingsClient)
  }

  async onModuleInit() {
    // run once on service boot
    try {
      const env = this.config.get<string>("NODE_ENV") || "default"
      const defaultCatId = await this.ensureDefaultCategory()
      await this.ensureDefaultCategorySetting(env, defaultCatId)
      this.logger.log(`Default blog category initialized: id=${defaultCatId} (env=${env})`)
    } catch (e) {
      this.logger.error("Failed to initialize default blog taxonomy", e as any)
      // you can choose to rethrow if you want hard-fail on missing defaults
      // throw e;
    }
  }

  // 1) Make sure `blog/category.default:uncategorized` exists in taxonomy-service
  private async ensureDefaultCategory(): Promise<string> {
    const scope = "blog"
    const kind = "category.default"
    const slug = "uncategorized"

    // 1) Try direct lookup by slug first
    try {
      const found = await firstValueFrom(this.taxonomy().GetBySlug({scope, kind, slug}))

      if (found?.data?.id) {
        return found.data.id
      }
    } catch (e: any) {
      // If it's "taxonomy_not_found", we go on and create it.
      // Any other error we rethrow.
      const msg = String(e?.details || e?.message || "")
      if (!msg.includes("taxonomy_not_found")) {
        throw e
      }
    }

    // 2) Not found → create it once
    const created = await firstValueFrom(
      this.taxonomy().CreateTaxonomy({
        scope,
        kind,
        slug,
        title: "بدون دسته‌بندی",
        description: "دسته پیش‌فرض برای محصولاتی که هنوز دسته‌بندی نشده‌اند.",
        isTree: false,
        parentId: null,
        depth: 0,
        path: slug,
        isHidden: false,
        isSystem: true, // mark as system so it can't be deleted
        sortOrder: 0,
        meta: {},
      })
    )

    const id = created?.data?.id
    if (!id) {
      throw new BadRequestException("Failed to resolve default blog category id")
    }

    return id
  }

  // 2) Store ID in settings-service as a simple string
  private async ensureDefaultCategorySetting(env: string, categoryId: string) {
    const namespace = 'blog';
    const key = 'default_blog_category';

    // 1) Try read using the nice proxy (no user needed, @Public handler)
    let existing: string | undefined;
    try {
      const res = await firstValueFrom(
        this.settings().GetString({ namespace, environment: 'default', key }),
      );
      existing = res.value;
    } catch {
      // ignore not-found / unauth, we’ll just overwrite below
    }

    if (existing === categoryId) {
      return;
    }

    // 2) For writes, we must provide "user context".
    //    We bypass SettingsProxy and call the raw gRPC stub with x-user-id.
    const raw: any = this.settingsClient.getService<any>('SettingsService');

    const md = new Metadata();
    // anything non-empty works; settings-service only checks presence,
    // not the actual id value here.
    md.set('x-user-id', 'system-initializer');

    await firstValueFrom(
      raw.SetString(
        {
          namespace,
          environment: env,
          key,
          value: categoryId,
        },
        md,
      ),
    );
  }
}
