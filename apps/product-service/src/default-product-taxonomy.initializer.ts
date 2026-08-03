// src/default-product-taxonomy.initializer.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { safeErrorName } from "@packages/config";
import { TAXONOMY_SERVICE } from "./taxonomy-client.module";
import { SETTINGS_SERVICE } from "./settings-client.module";
import {
  TaxonomyProxy,
  SettingsProxy,
  getTaxonomy,
  getSettings,
} from "@nebula/clients";

@Injectable()
export class DefaultProductTaxonomyInitializer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DefaultProductTaxonomyInitializer.name);
  private initialized = false;
  private stopped = false;
  private attempts = 0;
  private initialization?: Promise<void>;
  private retryTimer?: ReturnType<typeof setTimeout>;

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

  async onModuleInit(): Promise<void> {
    await this.initializeIfNeeded();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.clearRetry();
  }

  checkReadiness(): void {
    if (!this.initialized) {
      throw new Error("default_product_taxonomy_not_ready");
    }
  }

  private initializeIfNeeded(): Promise<void> {
    if (this.initialized || this.stopped) return Promise.resolve();
    if (this.initialization) return this.initialization;

    this.initialization = this.initialize().finally(() => {
      this.initialization = undefined;
    });
    return this.initialization;
  }

  private async initialize(): Promise<void> {
    this.attempts += 1;

    try {
      const defaultCatId = await this.ensureDefaultCategory();
      await this.ensureDefaultCategorySetting(defaultCatId);
      this.initialized = true;
      this.clearRetry();
      this.logger.log(
        `Default product category initialized: id=${defaultCatId} (env=default)`,
      );
    } catch (e: unknown) {
      const retryInMs = Math.min(
        1_000 * 2 ** Math.min(this.attempts - 1, 5),
        30_000,
      );
      this.logger.warn(
        `default_product_taxonomy_initialization_deferred attempt=${this.attempts} retryInMs=${retryInMs} cause=${safeErrorName(e)}`,
      );
      this.scheduleRetry(retryInMs);
    }
  }

  private scheduleRetry(delayMs: number): void {
    if (this.stopped || this.initialized || this.retryTimer) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.initializeIfNeeded();
    }, delayMs);
  }

  private clearRetry(): void {
    if (!this.retryTimer) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  // 1) Make sure `product/category.default:uncategorized` exists in taxonomy-service
  private async ensureDefaultCategory(): Promise<string> {
    const scope = "product";
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
        "Failed to resolve default product category id",
      );
    }

    return id;
  }

  // 2) Store ID in settings-service as a simple string
  private async ensureDefaultCategorySetting(categoryId: string) {
    await firstValueFrom(
      this.settings().EnsureBootstrapString({
        namespace: "product",
        environment: "default",
        key: "default_product_category",
        value: categoryId,
      }),
    );
  }
}
