// src/default-blog-taxonomy.initializer.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { TAXONOMY_SERVICE } from "./taxonomy-client.module";
import { SETTINGS_SERVICE } from "./settings-client.module";
import {
  TaxonomyProxy,
  SettingsProxy,
  getTaxonomy,
  getSettings,
} from "@nebula/clients";
import { errorMessage } from "./error.utils";

@Injectable()
export class DefaultBlogTaxonomyInitializer implements OnModuleInit {
  private readonly logger = new Logger(DefaultBlogTaxonomyInitializer.name);

  constructor(
    @Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
  ) {}

  private taxonomy(): TaxonomyProxy {
    return getTaxonomy(this.taxonomyClient);
  }

  private settings(): SettingsProxy {
    return getSettings(this.settingsClient);
  }

  async onModuleInit() {
    // run once on service boot
    try {
      const defaultCatId = await this.ensureDefaultCategory();
      await this.ensureDefaultCategorySetting(defaultCatId);
      this.logger.log(
        `Default blog category initialized: id=${defaultCatId} (env=default)`,
      );
    } catch (e: unknown) {
      this.logger.error(
        `Failed to initialize default blog taxonomy: ${errorMessage(e)}`,
      );
      // you can choose to rethrow if you want hard-fail on missing defaults
      // throw e;
    }
  }

  // 1) Make sure `blog/category.default:uncategorized` exists in taxonomy-service
  private async ensureDefaultCategory(): Promise<string> {
    const scope = "blog";
    const kind = "category.default";
    const slug = "uncategorized";

    const ensured = await firstValueFrom(
      this.taxonomy().EnsureSystemTaxonomy({
        scope,
        kind,
        slug,
        title: "بدون دسته‌بندی",
        description: "دسته پیش‌فرض برای محصولاتی که هنوز دسته‌بندی نشده‌اند.",
      }),
    );

    const id = ensured?.data?.id;
    if (!id) {
      throw new BadRequestException(
        "Failed to resolve default blog category id",
      );
    }

    return id;
  }

  // 2) Store ID in settings-service as a simple string
  private async ensureDefaultCategorySetting(categoryId: string) {
    await firstValueFrom(
      this.settings().EnsureBootstrapString({
        namespace: "blog",
        environment: "default",
        key: "default_blog_category",
        value: categoryId,
      }),
    );
  }
}
