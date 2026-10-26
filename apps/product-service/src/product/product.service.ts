import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  HttpException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  Prisma,
  ProductStatus,
  ProductSelectionMode,
  DiscountType,
  type Product,
  type ProductVariant,
} from "../../prisma/generated";
import { SETTINGS_SERVICE } from "../settings-client.module";
import { MEDIA_SERVICE } from "../media-client.module";
import {
  getMedia,
  getSettings,
  type MediaProxy,
  type SettingsProxy,
} from "@nebula/clients";
import { TAXONOMY_SERVICE } from "../taxonomy-client.module";
import { getTaxonomy, type TaxonomyProxy } from "@nebula/clients";
import {
  wrapGrpc,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";
import { isRecord } from "../error.utils";
import {
  DiscountTypeDto,
  ProductStatusDto,
  type ProductInputDto,
} from "./dto/product-input.dto";
import { descriptiveText, textPatch } from "./descriptive-text";
import { effectiveProductPrice } from "./product-price";
import { type ApplyDiscountBulkDto } from "./dto/apply-discount-bulk.dto";

type ProductPatchInput = Partial<
  Omit<
    ProductInputDto,
    | "categoryId"
    | "discountType"
    | "discountValue"
    | "discountStart"
    | "discountEnd"
  >
> & {
  clearThumbnailMedia?: boolean;
  clearThumbnailTitle?: boolean;
  clearThumbnailAlt?: boolean;
  clearBrand?: boolean;
  categoryId?: string | null;
  discountType?: DiscountTypeDto | null;
  discountValue?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;
};

type ListProductsInput = {
  q?: string | null;
  categoryId?: string | null;
  status?: unknown;
  page?: number | string | null;
  limit?: number | string | null;
  includeDeleted?: boolean | null;
};

type PublicListProductsInput = Omit<
  ListProductsInput,
  "status" | "includeDeleted"
>;

type PrismaMappingOptions = {
  missingTarget?: string;
  foreignKeyConflict?: string;
};

type DiscountState = Pick<
  Product,
  | "discountType"
  | "discountValue"
  | "discountActive"
  | "discountStart"
  | "discountEnd"
>;

type MediaDescriptions = { title?: string; defaultAlt?: string };
type DescriptionCache = Map<string, Promise<MediaDescriptions>>;

type InventoryState = Pick<Product, "trackInventory" | "stockQuantity">;
type ProductWithVariants = Product & { variants?: ProductVariant[] };
type VariantInput = {
  sku: string;
  options: Record<string, string>;
  priceOverride?: number | null;
  stockQuantity?: number;
  active?: boolean;
  sortOrder?: number;
};
type VariantPatch = Partial<VariantInput>;

const INT32_MAX = 2_147_483_647;

const DISCOUNT_FIELDS = [
  "discountType",
  "discountValue",
  "discountActive",
  "discountStart",
  "discountEnd",
] as const;

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isProvided = <T extends object, K extends keyof T>(
  value: T,
  key: K,
): boolean => hasOwn(value, key) && value[key] !== undefined;

function mapPrisma(e: unknown, options?: PrismaMappingOptions): Error {
  if (isRecord(e) && e.code === "P2002") {
    const target = uniqueConflictFields(e);

    if (target.includes("slug")) {
      return new ConflictException("product_slug_conflict");
    }
    if (target.includes("sku")) {
      return new ConflictException("product_sku_conflict");
    }
    return new ConflictException("product_unique_conflict");
  }

  if (isRecord(e) && e.code === "P2025") {
    if (options?.missingTarget) {
      return new NotFoundException(options.missingTarget);
    }

    return new BadRequestException("Related record not found");
  }

  if (isRecord(e) && e.code === "P2003" && options?.foreignKeyConflict) {
    return new ConflictException(options.foreignKeyConflict);
  }

  if (e instanceof Error) {
    return e;
  }

  return new BadRequestException("database_error");
}

function basicSlugify(s: string) {
  return (
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

const identifierCandidate = (base: string, attempt: number): string =>
  attempt === 1 ? base : `${base}-${attempt}`;

function uniqueConflictFields(e: unknown): string[] {
  if (!isRecord(e) || e.code !== "P2002") return [];
  const meta = isRecord(e.meta) ? e.meta : undefined;
  const target = meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((item): item is string => typeof item === "string")
    : typeof target === "string"
      ? target.split(",").map((field) => field.trim())
      : [];
  if (
    fields.some((field) =>
      ["CatalogSku_pkey", "ProductVariant_sku_key", "Product_sku_key"].some(
        (name) => field.includes(name),
      ),
    )
  ) {
    fields.push("sku");
  }
  if (
    fields.some((field) =>
      field.includes("ProductVariant_productId_optionKey_key"),
    )
  ) {
    fields.push("optionKey");
  }
  return fields;
}

function isUniqueConflictFor(e: unknown, field: "slug" | "sku"): boolean {
  return uniqueConflictFields(e).includes(field);
}

function isPrismaCode(e: unknown, code: string): boolean {
  return isRecord(e) && e.code === code;
}

const asStatus = (value: unknown): ProductStatus | undefined =>
  typeof value === "string" &&
  Object.values(ProductStatus).includes(value as ProductStatus)
    ? (value as ProductStatus)
    : undefined;

const asSelectionMode = (value: unknown): ProductSelectionMode | undefined =>
  typeof value === "string" &&
  Object.values(ProductSelectionMode).includes(value as ProductSelectionMode)
    ? (value as ProductSelectionMode)
    : undefined;

const asDiscountType = (value: unknown): DiscountType | null | undefined => {
  if (value === DiscountTypeDto.NONE) return null;

  return typeof value === "string" &&
    Object.values(DiscountType).includes(value as DiscountType)
    ? (value as DiscountType)
    : undefined;
};

function variantOptions(value: unknown): {
  options: Record<string, string>;
  optionKey: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("variant_options_invalid");
  }
  const entries = Object.entries(value);
  if (entries.length < 1 || entries.length > 3) {
    throw new BadRequestException("variant_options_invalid");
  }
  const normalized = entries
    .map(([name, raw]) => {
      const key = name.trim();
      const option = typeof raw === "string" ? raw.trim() : "";
      if (!key || key.length > 40 || !option || option.length > 80) {
        throw new BadRequestException("variant_options_invalid");
      }
      return [key, option] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));
  const canonical = normalized.map(([key, option]) => [
    key.toLowerCase(),
    option.toLowerCase(),
  ]);
  if (new Set(canonical.map(([key]) => key)).size !== canonical.length) {
    throw new BadRequestException("variant_options_invalid");
  }
  return {
    options: Object.fromEntries(normalized),
    optionKey: JSON.stringify(canonical),
  };
}

function variantSku(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120) {
    throw new BadRequestException("variant_sku_invalid");
  }
  return value.trim();
}

function variantQuantity(value: unknown): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > INT32_MAX
  ) {
    throw new BadRequestException("variant_stock_invalid");
  }
  return value as number;
}

@Injectable()
export class ProductServiceImpl {
  constructor(
    private prisma: PrismaService,
    @Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
    @Inject(MEDIA_SERVICE) private readonly mediaClient: ClientGrpc,
  ) {}

  private settings(
    downstream?: VerifiedServiceDownstreamContext,
  ): SettingsProxy {
    return getSettings(this.settingsClient, downstream?.signingPolicy);
  }

  private taxonomy(
    downstream?: VerifiedServiceDownstreamContext,
  ): TaxonomyProxy {
    return getTaxonomy(this.taxonomyClient, downstream?.signingPolicy);
  }

  private media(downstream?: VerifiedServiceDownstreamContext): MediaProxy {
    return getMedia(this.mediaClient, downstream?.signingPolicy);
  }

  private async resolveProductDescriptions(
    id: string,
    role: "THUMBNAIL" | "GALLERY",
    downstream?: VerifiedServiceDownstreamContext,
    cache: DescriptionCache = new Map(),
  ): Promise<MediaDescriptions> {
    let pending = cache.get(id);
    if (!pending) {
      pending = (async () => {
        const result = await wrapGrpc(
          firstValueFrom(
            this.media(downstream).ResolveProductReference(
              { id, role },
              downstream?.metadata,
            ),
          ),
        );
        if (
          result.mediaId !== id ||
          result.role !== role ||
          result.renderPath !== `/api/v1/media/render/${id}`
        )
          throw new ServiceUnavailableException(
            "product_media_resolution_invalid",
          );
        descriptiveText(result.title, "media_title", 200);
        descriptiveText(result.defaultAlt, "media_defaultAlt", 180);
        return { title: result.title, defaultAlt: result.defaultAlt };
      })();
      cache.set(id, pending);
    }
    return pending;
  }

  private async resolveProductMediaId(
    id: string,
    role: "THUMBNAIL" | "GALLERY",
    downstream?: VerifiedServiceDownstreamContext,
    cache?: DescriptionCache,
  ): Promise<string> {
    await this.resolveProductDescriptions(id, role, downstream, cache);
    return id;
  }

  private async descriptions(
    id: string | null | undefined,
    role: "THUMBNAIL" | "GALLERY",
    requirePublic: boolean,
    cache: DescriptionCache,
  ): Promise<MediaDescriptions> {
    if (!id) return {};
    try {
      return await this.resolveProductDescriptions(id, role, undefined, cache);
    } catch (error) {
      // Admins must still inspect/edit broken or revoked references. Do not hide outages.
      if (
        !requirePublic &&
        error instanceof HttpException &&
        [400, 403, 404].includes(error.getStatus())
      )
        return {};
      if (
        requirePublic &&
        error instanceof HttpException &&
        [400, 403, 404].includes(error.getStatus())
      )
        throw new ServiceUnavailableException(
          "product_public_reference_invalid",
        );
      throw error;
    }
  }

  private async describeProduct(
    p: ProductWithVariants,
    publicOnly = false,
    cache: DescriptionCache = new Map(),
  ) {
    const defaults = await this.descriptions(
      p.thumbnailMediaId,
      "THUMBNAIL",
      publicOnly,
      cache,
    );
    return {
      ...this.toDto(p, publicOnly),
      thumbnailTitle: p.thumbnailTitle ?? defaults.title ?? "",
      thumbnailAlt: p.thumbnailAlt ?? defaults.defaultAlt ?? "",
    };
  }

  private async describeGallery<
    T extends {
      mediaId: string | null;
      alt: string | null;
      title?: string | null;
      metadataVersion?: number;
    },
  >(rows: T[], requirePublic = false, cache: DescriptionCache = new Map()) {
    return Promise.all(
      rows.map(async (row) => {
        const defaults = await this.descriptions(
          row.mediaId,
          "GALLERY",
          requirePublic,
          cache,
        );
        return {
          ...row,
          altOverride: requirePublic ? undefined : (row.alt ?? undefined),
          titleOverride: requirePublic ? undefined : (row.title ?? undefined),
          alt: row.alt ?? defaults.defaultAlt ?? "",
          title: row.title ?? defaults.title ?? "",
        };
      }),
    );
  }

  private normalizeCurrency(value: string): string | null {
    const normalized = value.trim().toUpperCase();
    return /^[A-Z]{3,8}$/.test(normalized) ? normalized : null;
  }

  private async getShopCurrency(
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<string> {
    const res = await wrapGrpc(
      firstValueFrom(
        this.settings(downstream).GetString(
          {
            namespace: "pricing",
            environment: "default",
            key: "default_currency",
          },
          downstream?.metadata,
        ),
      ),
    );
    const currency = res?.found ? this.normalizeCurrency(res.value) : null;

    if (!currency) {
      throw new ServiceUnavailableException("shop_currency_not_configured");
    }

    return currency;
  }

  private async resolveProductCurrency(
    requested: string | undefined,
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<string> {
    const normalized =
      requested === undefined || requested.trim() === ""
        ? null
        : this.normalizeCurrency(requested);
    if (requested !== undefined && requested.trim() !== "" && !normalized) {
      throw new BadRequestException("currency_invalid");
    }

    const shopCurrency = await this.getShopCurrency(downstream);
    if (!normalized) return shopCurrency;

    if (normalized !== shopCurrency) {
      throw new BadRequestException("product_currency_mismatch");
    }

    return shopCurrency;
  }

  private effectivePriceDecimal(
    p: Product,
    now = new Date(),
    basePrice: Prisma.Decimal = new Prisma.Decimal(p.price),
  ): Prisma.Decimal {
    return effectiveProductPrice(p, now, basePrice);
  }

  private variantDto(p: Product, v: ProductVariant) {
    const price = new Prisma.Decimal(v.priceOverride ?? p.price);
    const effectivePrice = this.effectivePriceDecimal(p, new Date(), price);
    return {
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      options: v.options as Record<string, string>,
      price: price.toNumber(),
      priceOverride:
        v.priceOverride === null
          ? null
          : new Prisma.Decimal(v.priceOverride).toNumber(),
      effectivePrice: effectivePrice.toNumber(),
      effectivePriceAmount: effectivePrice.toFixed(2),
      stockQuantity: v.stockQuantity,
      availability:
        !v.active || v.deletedAt || (p.trackInventory && v.stockQuantity === 0)
          ? "OUT_OF_STOCK"
          : "AVAILABLE",
      active: v.active,
      sortOrder: v.sortOrder,
      deletedAt: v.deletedAt?.toISOString() ?? "",
    };
  }

  private toDto = (p: ProductWithVariants, publicOnly = false) => {
    const hasDiscount = p.discountType !== null;
    const variants = p.variants ?? [];
    const effectivePrice = this.effectivePriceDecimal(p);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? "",
      excerpt: p.excerpt ?? "",
      sku: p.sku,
      status: p.status ?? "ACTIVE",
      price: new Prisma.Decimal(p.price).toNumber(),
      currency: p.currency,

      categoryId: p.categoryId,
      brandId: p.brandId ?? "",
      tagIds: p.tagIds ?? [],

      thumbnailMediaId: p.thumbnailMediaId ?? "",
      thumbnailTitle: p.thumbnailTitle ?? "",
      thumbnailAlt: p.thumbnailAlt ?? "",
      thumbnailTitleOverride: publicOnly
        ? undefined
        : (p.thumbnailTitle ?? undefined),
      thumbnailAltOverride: publicOnly
        ? undefined
        : (p.thumbnailAlt ?? undefined),
      thumbnailUrl: p.thumbnailMediaId
        ? `/api/v1/media/render/${p.thumbnailMediaId}`
        : "",
      model3dFormat: p.model3dFormat ?? "",
      model3dLiveView: !!p.model3dLiveView,
      vrEnabled: !!p.vrEnabled,
      metaTitle: p.metaTitle ?? "",
      metaDescription: p.metaDescription ?? "",
      metaKeywords: p.metaKeywords ?? "",
      customSchema: p.customSchema ?? "",
      noindex: !!p.noindex,
      isFeatured: !!p.isFeatured,
      featureSort: p.featureSort ?? 0,
      promoTitle: p.promoTitle ?? "",
      promoBadge: p.promoBadge ?? "",
      promoActive: !!p.promoActive,
      discountType: p.discountType ?? DiscountTypeDto.NONE,
      discountValue:
        hasDiscount && p.discountValue
          ? new Prisma.Decimal(p.discountValue).toNumber()
          : 0,
      discountActive: hasDiscount && !!p.discountActive,
      discountStart:
        hasDiscount && p.discountStart ? p.discountStart.toISOString() : "",
      discountEnd:
        hasDiscount && p.discountEnd ? p.discountEnd.toISOString() : "",
      effectivePrice: effectivePrice.toNumber(),
      effectivePriceAmount: effectivePrice.toFixed(2),
      tags: publicOnly ? [] : (p.tags ?? []),
      complementaryIds: p.complementaryIds ?? [],
      createdAt: p.createdAt ? p.createdAt.toISOString() : "",
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : "",
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : "",
      trackInventory: p.trackInventory,
      stockQuantity: p.stockQuantity,
      selectionMode: p.selectionMode ?? ProductSelectionMode.BASE,
      variants: variants.map((variant) => this.variantDto(p, variant)),
      availability:
        p.selectionMode === ProductSelectionMode.VARIANT
          ? variants.some(
              (variant) =>
                variant.active &&
                !variant.deletedAt &&
                (!p.trackInventory || variant.stockQuantity > 0),
            )
            ? "AVAILABLE"
            : "OUT_OF_STOCK"
          : p.trackInventory && p.stockQuantity === 0
            ? "OUT_OF_STOCK"
            : "AVAILABLE",
      version: p.version,
    };
  };

  private async getDefaultCategoryId(
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<string> {
    const res = await firstValueFrom(
      this.settings(downstream).GetString(
        {
          namespace: "product",
          environment: "default",
          key: "default_product_category",
        },
        downstream?.metadata,
      ),
    );

    if (!res?.value) {
      throw new BadRequestException(
        "Default category not configured. Set product/default_product_category in settings-service.",
      );
    }

    // Validate that this ID actually points at a product category taxonomy
    await this.assertCategoryExists(res.value, downstream);

    return res.value;
  }

  // ---- Validation helpers (create) ----
  private assertCreate(data: ProductInputDto): void {
    if (!data.title) {
      throw new BadRequestException("Missing required fields: title");
    }
  }

  private async assertCategoryExists(
    categoryId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    try {
      const res = await wrapGrpc(
        firstValueFrom(
          this.taxonomy(downstream).GetTaxonomy(
            { id: categoryId },
            downstream?.metadata,
          ),
        ),
      );

      const t = res?.data;
      if (!t) {
        throw new BadRequestException(`Category ${categoryId} does not exist`);
      }

      if (
        t.id !== categoryId ||
        t.scope !== "product" ||
        t.kind !== "category.default" ||
        t.isHidden
      ) {
        throw new BadRequestException(
          `Category ${categoryId} is not a valid product.category.default taxonomy`,
        );
      }
    } catch (e: unknown) {
      if (e instanceof NotFoundException) {
        throw new BadRequestException(`Category ${categoryId} does not exist`);
      }
      throw e;
    }
  }

  private async assertProductTaxonomy(
    id: string,
    kind: "brand" | "tag",
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<void> {
    try {
      const result = await wrapGrpc(
        firstValueFrom(
          this.taxonomy(downstream).GetTaxonomy({ id }, downstream?.metadata),
        ),
      );
      const record = result?.data;
      if (
        !record ||
        record.id !== id ||
        record.scope !== "product" ||
        record.kind !== kind ||
        record.isHidden
      ) {
        throw new BadRequestException(`product_${kind}_invalid`);
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`product_${kind}_invalid`);
      }
      throw error;
    }
  }

  private async validateTagIds(
    ids: string[],
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<string[]> {
    if (ids.length > 64 || new Set(ids).size !== ids.length) {
      throw new BadRequestException("product_tag_ids_invalid");
    }
    const ordered = [...ids].sort();
    for (const id of ordered) {
      await this.assertProductTaxonomy(id, "tag", downstream);
    }
    return ordered;
  }

  private async assertPublishReferences(
    id: string,
    patch: ProductPatchInput,
    next: {
      categoryId?: string;
      brandId?: string | null;
      tagIds?: string[];
      thumbnailMediaId?: string;
    },
    downstream?: VerifiedServiceDownstreamContext,
    shopCurrency?: string,
    descriptions?: DescriptionCache,
  ): Promise<void> {
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: {
        categoryId: true,
        brandId: true,
        tagIds: true,
        tags: true,
        thumbnailUrl: true,
        thumbnailMediaId: true,
        currency: true,
      },
    });
    if (!current) throw new NotFoundException("product_not_found");

    await this.assertCategoryExists(
      next.categoryId ?? current.categoryId,
      downstream,
    );
    const brandId = next.brandId === undefined ? current.brandId : next.brandId;
    if (brandId) await this.assertProductTaxonomy(brandId, "brand", downstream);
    await this.validateTagIds(next.tagIds ?? current.tagIds ?? [], downstream);
    if ((patch.tags ?? current.tags).length > 0) {
      throw new BadRequestException("product_legacy_tags_unresolved");
    }

    const thumbnailMediaId = patch.clearThumbnailMedia
      ? null
      : (next.thumbnailMediaId ?? current.thumbnailMediaId);
    if (thumbnailMediaId) {
      await this.resolveProductMediaId(
        thumbnailMediaId,
        "THUMBNAIL",
        downstream,
        descriptions,
      );
    } else if (!patch.clearThumbnailMedia && current.thumbnailUrl?.trim()) {
      throw new BadRequestException("product_legacy_thumbnail_unresolved");
    }

    const gallery = await this.prisma.productGalleryImage.findMany({
      where: { productId: id, deletedAt: null },
      select: { mediaId: true, url: true },
    });
    for (const image of gallery) {
      if (!image.mediaId) {
        if (image.url.trim()) {
          throw new BadRequestException("product_legacy_gallery_unresolved");
        }
        continue;
      }
      await this.resolveProductMediaId(
        image.mediaId,
        "GALLERY",
        downstream,
        descriptions,
      );
    }
    if (
      current.currency !==
      (shopCurrency ?? (await this.getShopCurrency(downstream)))
    ) {
      throw new BadRequestException("product_currency_mismatch");
    }
  }

  private async assertPublicEligibility(
    id: string,
    currency: string,
    shopCurrency?: string,
    descriptions?: DescriptionCache,
  ): Promise<void> {
    try {
      const configuredCurrency = shopCurrency ?? (await this.getShopCurrency());
      if (currency !== configuredCurrency) {
        throw new ServiceUnavailableException("product_currency_mismatch");
      }
      await this.assertPublishReferences(
        id,
        {},
        {},
        undefined,
        configuredCurrency,
        descriptions,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw new ServiceUnavailableException(
          "product_public_reference_invalid",
        );
      }
      throw error;
    }
  }

  private assertDiscountWindow(start?: Date | null, end?: Date | null) {
    if (start && end && end < start) {
      throw new BadRequestException("discountEnd must be >= discountStart");
    }
  }

  private parseDiscountDate(
    value: string | null | undefined,
  ): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("discount date must be a valid ISO date");
    }
    return parsed;
  }

  private assertDiscountState(state: DiscountState): void {
    this.assertDiscountWindow(state.discountStart, state.discountEnd);

    if (state.discountType === null) {
      if (
        state.discountValue !== null ||
        state.discountActive ||
        state.discountStart !== null ||
        state.discountEnd !== null
      ) {
        throw new BadRequestException(
          "discountType is required when discount fields are set",
        );
      }
      return;
    }

    if (state.discountValue === null) {
      throw new BadRequestException(
        "discountValue is required when discountType is set",
      );
    }
    if (state.discountValue.isNegative()) {
      throw new BadRequestException("discountValue must be non-negative");
    }
    if (
      state.discountType === DiscountType.PERCENTAGE &&
      state.discountValue.greaterThan(100)
    ) {
      throw new BadRequestException(
        "percentage discountValue must be at most 100",
      );
    }
  }

  private clearedDiscountState(): DiscountState {
    return {
      discountType: null,
      discountValue: null,
      discountActive: false,
      discountStart: null,
      discountEnd: null,
    };
  }

  private createDiscountState(input: ProductInputDto): DiscountState {
    if (
      input.discountType === DiscountTypeDto.NONE ||
      (input.discountType === undefined &&
        input.discountValue === undefined &&
        input.discountActive !== true &&
        input.discountStart === undefined &&
        input.discountEnd === undefined)
    ) {
      return this.clearedDiscountState();
    }

    const discountType = asDiscountType(input.discountType);
    if (!discountType) {
      throw new BadRequestException(
        "discountType is required when discount fields are set",
      );
    }

    const state: DiscountState = {
      discountType,
      discountValue:
        input.discountValue === undefined
          ? null
          : new Prisma.Decimal(input.discountValue),
      discountActive: input.discountActive ?? false,
      discountStart: this.parseDiscountDate(input.discountStart) ?? null,
      discountEnd: this.parseDiscountDate(input.discountEnd) ?? null,
    };
    this.assertDiscountState(state);
    return state;
  }

  private patchDiscountState(
    current: DiscountState,
    patch: ProductPatchInput,
  ): DiscountState {
    if (
      isProvided(patch, "discountType") &&
      (patch.discountType === DiscountTypeDto.NONE ||
        patch.discountType === null)
    ) {
      return this.clearedDiscountState();
    }

    const discountType = isProvided(patch, "discountType")
      ? asDiscountType(patch.discountType)
      : current.discountType;
    if (discountType === undefined) {
      throw new BadRequestException("discountType is invalid");
    }

    const state: DiscountState = {
      discountType,
      discountValue: isProvided(patch, "discountValue")
        ? patch.discountValue === null
          ? null
          : new Prisma.Decimal(patch.discountValue as number)
        : current.discountValue,
      discountActive: isProvided(patch, "discountActive")
        ? (patch.discountActive ?? false)
        : current.discountActive,
      discountStart: isProvided(patch, "discountStart")
        ? (this.parseDiscountDate(patch.discountStart) ?? null)
        : current.discountStart,
      discountEnd: isProvided(patch, "discountEnd")
        ? (this.parseDiscountDate(patch.discountEnd) ?? null)
        : current.discountEnd,
    };
    this.assertDiscountState(state);
    return state;
  }

  private assertPrice(value: unknown): void {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new BadRequestException("price must be a non-negative number");
    }
    const price = new Prisma.Decimal(value);
    if (
      price.decimalPlaces() > 2 ||
      price.greaterThanOrEqualTo("10000000000000000")
    ) {
      throw new BadRequestException("price must fit Decimal(18,2)");
    }
  }

  private assertInventoryState(state: InventoryState): void {
    if (
      !Number.isInteger(state.stockQuantity) ||
      state.stockQuantity < 0 ||
      state.stockQuantity > INT32_MAX ||
      (!state.trackInventory && state.stockQuantity !== 0)
    ) {
      throw new BadRequestException("product_inventory_invalid");
    }
  }

  private createInventoryState(input: ProductInputDto): InventoryState {
    const state = {
      trackInventory: input.trackInventory ?? false,
      stockQuantity: input.stockQuantity ?? 0,
    };
    this.assertInventoryState(state);
    return state;
  }

  private patchInventoryState(
    current: InventoryState,
    patch: ProductPatchInput,
  ): InventoryState {
    const state = {
      trackInventory: isProvided(patch, "trackInventory")
        ? (patch.trackInventory ?? false)
        : current.trackInventory,
      stockQuantity: isProvided(patch, "stockQuantity")
        ? (patch.stockQuantity ?? 0)
        : current.stockQuantity,
    };
    this.assertInventoryState(state);
    return state;
  }

  private assertNoDeferredMediaUrls(input: object): void {
    for (const field of ["model3dUrl", "model3dPosterUrl", "vrPlanImageUrl"]) {
      if (Object.prototype.hasOwnProperty.call(input, field)) {
        throw new BadRequestException("product_deferred_media_url_disabled");
      }
    }
  }

  // ---- Create ----
  async create(
    n: ProductInputDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const input = n;
    this.assertNoDeferredMediaUrls(input);
    this.assertCreate(input);
    this.assertPrice(input.price);
    if (input.thumbnailUrl?.trim()) {
      throw new BadRequestException("thumbnail_media_id_required");
    }
    if (input.tags?.length) {
      throw new BadRequestException("product_tag_ids_required");
    }
    const inventory = this.createInventoryState(input);

    const title = input.title;
    const explicitSlug = !!input.slug?.trim();
    const slugBase = basicSlugify(explicitSlug ? input.slug! : title);
    const explicitSku = input.sku?.trim() || null;
    const categoryId =
      input.categoryId ?? (await this.getDefaultCategoryId(downstream));
    await this.assertCategoryExists(categoryId, downstream);
    if (input.brandId) {
      await this.assertProductTaxonomy(input.brandId, "brand", downstream);
    }
    const tagIds = await this.validateTagIds(input.tagIds ?? [], downstream);

    const currency = await this.resolveProductCurrency(
      input.currency,
      downstream,
    );
    const thumbnailMediaId = input.thumbnailMediaId
      ? await this.resolveProductMediaId(
          input.thumbnailMediaId,
          "THUMBNAIL",
          downstream,
        )
      : null;
    const discount = this.createDiscountState(input);
    const selectionMode =
      asSelectionMode(input.selectionMode) ?? ProductSelectionMode.BASE;
    const status = asStatus(input.status) ?? ProductStatus.DRAFT;
    if (
      selectionMode === ProductSelectionMode.VARIANT &&
      status !== ProductStatus.DRAFT
    ) {
      throw new BadRequestException("product_variants_require_draft");
    }
    if (
      selectionMode === ProductSelectionMode.VARIANT &&
      inventory.stockQuantity !== 0
    ) {
      throw new BadRequestException("product_variant_base_stock_invalid");
    }

    let slugAttempt = 1;
    let skuAttempt = 1;
    while (slugAttempt <= 1_000 && skuAttempt <= 1_000) {
      const slug = identifierCandidate(slugBase, slugAttempt);
      const generatedSkuBase = `SKU-${slug.toUpperCase()}`;
      const sku =
        explicitSku ?? identifierCandidate(generatedSkuBase, skuAttempt);

      try {
        const data = await this.prisma.product.create({
          data: {
            title,
            description: input.description ?? "",
            excerpt: input.excerpt ?? null,

            slug,
            sku,

            price: new Prisma.Decimal(input.price ?? 0),
            currency,
            status,
            selectionMode,
            skuReservation: { create: { sku } },

            categoryId,
            brandId: input.brandId || null,
            tagIds,

            // ✅ use normalized camelCase
            thumbnailUrl: null,
            thumbnailMediaId,
            thumbnailTitle: descriptiveText(
              input.thumbnailTitle,
              "thumbnailTitle",
              200,
            ),
            thumbnailAlt: descriptiveText(
              input.thumbnailAlt,
              "thumbnailAlt",
              180,
            ),
            model3dFormat: input.model3dFormat,
            model3dLiveView: !!input.model3dLiveView,

            vrEnabled: !!input.vrEnabled,

            metaTitle: input.metaTitle,
            metaDescription: input.metaDescription,
            metaKeywords: input.metaKeywords,
            customSchema: input.customSchema,
            noindex: !!input.noindex,

            isFeatured: !!input.isFeatured,
            featureSort: input.featureSort ?? 0,
            promoTitle: input.promoTitle,
            promoBadge: input.promoBadge,
            promoActive: !!input.promoActive,

            ...discount,

            tags: [],
            complementaryIds: input.complementaryIds ?? [],
            ...inventory,
          },
          include: { variants: true },
        });
        return { data: await this.describeProduct(data) };
      } catch (e) {
        if (!explicitSlug && isUniqueConflictFor(e, "slug")) {
          slugAttempt += 1;
          skuAttempt = 1;
          continue;
        }
        if (!explicitSku && isUniqueConflictFor(e, "sku")) {
          skuAttempt += 1;
          continue;
        }
        throw mapPrisma(e);
      }
    }

    throw new ConflictException("product_identifier_exhausted");
  }

  // ---- Update (patch) ----
  async update(
    id: string,
    n?: ProductPatchInput,
    expectedVersion?: number,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const patch = n ?? {};
    this.assertNoDeferredMediaUrls(patch);
    if (
      !Number.isInteger(expectedVersion) ||
      (expectedVersion ?? 0) < 1 ||
      (expectedVersion ?? 0) > INT32_MAX
    ) {
      throw new BadRequestException("expected_version_invalid");
    }
    if (patch.price != null) this.assertPrice(patch.price);
    if (patch.thumbnailUrl?.trim()) {
      throw new BadRequestException("thumbnail_media_id_required");
    }
    if (patch.tags?.length) {
      throw new BadRequestException("product_tag_ids_required");
    }
    if (patch.clearBrand && patch.brandId !== undefined) {
      throw new BadRequestException("product_brand_patch_conflict");
    }
    if (patch.clearThumbnailMedia && patch.thumbnailMediaId !== undefined) {
      throw new BadRequestException("thumbnail_media_patch_conflict");
    }
    const nextSku = patch.sku?.trim() || undefined;
    const nextSelectionMode = asSelectionMode(patch.selectionMode);
    if (patch.selectionMode !== undefined && !nextSelectionMode) {
      throw new BadRequestException("product_selection_mode_invalid");
    }
    if (nextSelectionMode !== undefined) {
      const current = await this.prisma.product.findUnique({
        where: { id },
        select: { status: true, stockQuantity: true, selectionMode: true },
      });
      if (!current) throw new NotFoundException("product_not_found");
      if (nextSelectionMode !== current.selectionMode) {
        if (
          current.status !== ProductStatus.DRAFT ||
          (patch.status !== undefined &&
            patch.status !== ProductStatusDto.DRAFT) ||
          current.stockQuantity !== 0
        ) {
          throw new BadRequestException(
            "product_selection_mode_requires_draft_empty_stock",
          );
        }
        if (nextSelectionMode === ProductSelectionMode.BASE) {
          const variantCount = await this.prisma.productVariant.count({
            where: { productId: id, deletedAt: null },
          });
          if (variantCount !== 0) {
            throw new BadRequestException("product_variants_exist");
          }
        }
      }
    }
    if (
      nextSelectionMode === ProductSelectionMode.VARIANT &&
      patch.stockQuantity !== undefined &&
      patch.stockQuantity !== 0
    ) {
      throw new BadRequestException("product_variant_base_stock_invalid");
    }

    if (
      patch.clearThumbnailMedia &&
      (patch.thumbnailTitle !== undefined ||
        patch.thumbnailAlt !== undefined ||
        patch.clearThumbnailTitle ||
        patch.clearThumbnailAlt)
    )
      throw new BadRequestException("thumbnail_text_patch_conflict");
    // Validate text before any transactional mutation or downstream effect.
    textPatch(
      patch.thumbnailTitle,
      patch.clearThumbnailTitle,
      "thumbnailTitle",
      200,
    );
    textPatch(patch.thumbnailAlt, patch.clearThumbnailAlt, "thumbnailAlt", 180);
    let nextCategoryId: string | undefined;
    let nextCurrency: string | undefined;
    let nextThumbnailMediaId: string | undefined;
    let nextBrandId: string | null | undefined;
    let nextTagIds: string[] | undefined;

    // ✅ Only change category if the client actually sent categoryId
    if (patch.categoryId !== undefined) {
      if (patch.categoryId === "" || patch.categoryId == null) {
        // Explicitly reset to default category
        nextCategoryId = await this.getDefaultCategoryId(downstream);
      } else {
        await this.assertCategoryExists(patch.categoryId, downstream);
        nextCategoryId = patch.categoryId;
      }
    }

    if (patch.currency !== undefined && patch.currency.trim() !== "") {
      nextCurrency = await this.resolveProductCurrency(
        patch.currency,
        downstream,
      );
    }

    if (patch.thumbnailMediaId !== undefined) {
      nextThumbnailMediaId = await this.resolveProductMediaId(
        patch.thumbnailMediaId,
        "THUMBNAIL",
        downstream,
      );
    }
    if (patch.brandId !== undefined) {
      await this.assertProductTaxonomy(patch.brandId, "brand", downstream);
      nextBrandId = patch.brandId;
    } else if (patch.clearBrand) {
      nextBrandId = null;
    }
    if (patch.tagIds !== undefined) {
      nextTagIds = await this.validateTagIds(patch.tagIds, downstream);
    }
    if (patch.status === ProductStatusDto.ACTIVE) {
      await this.assertPublishReferences(
        id,
        patch,
        {
          categoryId: nextCategoryId,
          brandId: nextBrandId,
          tagIds: nextTagIds,
          thumbnailMediaId: nextThumbnailMediaId,
        },
        downstream,
      );
    }

    const changesDiscount = DISCOUNT_FIELDS.some((field) =>
      isProvided(patch, field),
    );
    const changesInventory =
      isProvided(patch, "trackInventory") || isProvided(patch, "stockQuantity");

    try {
      let discountData: DiscountState | undefined;
      let inventoryData: InventoryState | undefined;
      if (changesDiscount || changesInventory) {
        const current = await this.prisma.product.findUnique({
          where: { id },
          select: {
            discountType: true,
            discountValue: true,
            discountActive: true,
            discountStart: true,
            discountEnd: true,
            trackInventory: true,
            stockQuantity: true,
            selectionMode: true,
          },
        });
        if (!current) throw new NotFoundException("product_not_found");
        if (changesDiscount) {
          discountData = this.patchDiscountState(current, patch);
        }
        if (changesInventory) {
          inventoryData = this.patchInventoryState(current, patch);
          if (
            (nextSelectionMode ?? current.selectionMode) ===
              ProductSelectionMode.VARIANT &&
            inventoryData.stockQuantity !== 0
          ) {
            throw new BadRequestException("product_variant_base_stock_invalid");
          }
          if (
            current.selectionMode === ProductSelectionMode.VARIANT &&
            !inventoryData.trackInventory
          ) {
            const stockedVariants = await this.prisma.productVariant.count({
              where: {
                productId: id,
                stockQuantity: { gt: 0 },
                deletedAt: null,
              },
            });
            if (stockedVariants > 0)
              throw new BadRequestException("variant_stock_invalid");
          }
        }
      }

      const data = await this.prisma.product.update({
        where: {
          id,
          version: expectedVersion,
          // A stock replacement must not overwrite quantities held by checkout.
          ...(changesInventory || nextSelectionMode !== undefined
            ? { heldStockLines: { none: {} } }
            : {}),
        },
        data: {
          title: patch.title ?? undefined,
          description: patch.description ?? undefined,
          excerpt: patch.excerpt ?? undefined,
          slug: patch.slug?.trim() ? basicSlugify(patch.slug) : undefined,
          sku: nextSku,
          skuReservation: nextSku ? { update: { sku: nextSku } } : undefined,
          selectionMode: nextSelectionMode,
          price:
            patch.price != null ? new Prisma.Decimal(patch.price) : undefined,
          currency: nextCurrency,
          status: asStatus(patch.status),

          // ✅ Only set when we actually decided a nextCategoryId
          categoryId: nextCategoryId,
          brandId: nextBrandId,
          tagIds: nextTagIds,

          thumbnailUrl:
            patch.clearThumbnailMedia || nextThumbnailMediaId !== undefined
              ? null
              : undefined,
          thumbnailTitle: patch.clearThumbnailMedia
            ? null
            : textPatch(
                patch.thumbnailTitle,
                patch.clearThumbnailTitle,
                "thumbnailTitle",
                200,
              ),
          thumbnailAlt: patch.clearThumbnailMedia
            ? null
            : textPatch(
                patch.thumbnailAlt,
                patch.clearThumbnailAlt,
                "thumbnailAlt",
                180,
              ),
          thumbnailMediaId: patch.clearThumbnailMedia
            ? null
            : nextThumbnailMediaId,
          model3dFormat: patch.model3dFormat ?? undefined,
          model3dLiveView: patch.model3dLiveView ?? undefined,
          vrEnabled: patch.vrEnabled ?? undefined,
          metaTitle: patch.metaTitle ?? undefined,
          metaDescription: patch.metaDescription ?? undefined,
          metaKeywords: patch.metaKeywords ?? undefined,
          customSchema: patch.customSchema ?? undefined,
          noindex: patch.noindex ?? undefined,
          isFeatured: patch.isFeatured ?? undefined,
          featureSort: patch.featureSort ?? undefined,
          promoTitle: patch.promoTitle ?? undefined,
          promoBadge: patch.promoBadge ?? undefined,
          promoActive: patch.promoActive ?? undefined,
          ...(discountData ?? {}),
          tags: patch.tags ?? undefined,
          complementaryIds: patch.complementaryIds ?? undefined,
          ...(inventoryData ?? {}),
          version: { increment: 1 },
        },
        include: {
          variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        },
      });
      return { data: await this.describeProduct(data) };
    } catch (e) {
      if (isPrismaCode(e, "P2025")) {
        const existing = await this.prisma.product.findUnique({
          where: { id },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException("product_version_conflict");
        }
        throw new NotFoundException("product_not_found");
      }
      throw mapPrisma(e, { missingTarget: "product_not_found" });
    }
  }

  private async mutateVariant(
    productId: string,
    expectedVersion: number,
    action:
      | { kind: "create"; input: VariantInput }
      | { kind: "update"; variantId: string; patch: VariantPatch }
      | { kind: "delete"; variantId: string },
  ) {
    if (
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1 ||
      expectedVersion > INT32_MAX
    ) {
      throw new BadRequestException("expected_version_invalid");
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product || product.deletedAt)
          throw new NotFoundException("product_not_found");
        if (product.selectionMode !== ProductSelectionMode.VARIANT) {
          throw new BadRequestException("product_variant_mode_required");
        }
        const claimed = await tx.product.updateMany({
          where: { id: productId, version: expectedVersion },
          data: { version: { increment: 1 } },
        });
        if (claimed.count !== 1)
          throw new ConflictException("product_version_conflict");

        if (action.kind === "create") {
          const count = await tx.productVariant.count({
            where: { productId, deletedAt: null },
          });
          if (count >= 50)
            throw new BadRequestException("product_variant_limit");
          const { options, optionKey } = variantOptions(action.input.options);
          const sku = variantSku(action.input.sku);
          const stockQuantity = variantQuantity(
            action.input.stockQuantity ?? 0,
          );
          if (!product.trackInventory && stockQuantity !== 0)
            throw new BadRequestException("variant_stock_invalid");
          if (
            action.input.priceOverride !== undefined &&
            action.input.priceOverride !== null
          )
            this.assertPrice(action.input.priceOverride);
          await tx.productVariant.create({
            data: {
              productId,
              sku,
              options,
              optionKey,
              priceOverride:
                action.input.priceOverride == null
                  ? null
                  : new Prisma.Decimal(action.input.priceOverride),
              stockQuantity,
              active: action.input.active ?? true,
              sortOrder: action.input.sortOrder ?? 0,
              skuReservation: { create: { sku } },
            },
          });
        } else {
          const current = await tx.productVariant.findFirst({
            where: { id: action.variantId, productId, deletedAt: null },
          });
          if (!current) throw new NotFoundException("variant_not_found");
          if (action.kind === "delete") {
            await tx.productVariant.update({
              where: { id: current.id },
              data: {
                deletedAt: new Date(),
                active: false,
                optionKey: `${current.optionKey}#deleted:${current.id}`,
              },
            });
          } else {
            const patch = action.patch;
            const sku =
              patch.sku === undefined ? undefined : variantSku(patch.sku);
            const normalized =
              patch.options === undefined
                ? undefined
                : variantOptions(patch.options);
            const stockQuantity =
              patch.stockQuantity === undefined
                ? undefined
                : variantQuantity(patch.stockQuantity);
            if (stockQuantity !== undefined) {
              const held = await tx.checkoutStockLine.count({
                where: { heldVariantId: current.id },
              });
              if (held > 0) throw new ConflictException("checkout_stock_held");
            }
            if (
              !product.trackInventory &&
              stockQuantity !== undefined &&
              stockQuantity !== 0
            )
              throw new BadRequestException("variant_stock_invalid");
            if (
              patch.priceOverride !== undefined &&
              patch.priceOverride !== null
            )
              this.assertPrice(patch.priceOverride);
            await tx.productVariant.update({
              where: { id: current.id },
              data: {
                sku,
                skuReservation: sku ? { update: { sku } } : undefined,
                options: normalized?.options,
                optionKey: normalized?.optionKey,
                priceOverride:
                  patch.priceOverride === undefined
                    ? undefined
                    : patch.priceOverride === null
                      ? null
                      : new Prisma.Decimal(patch.priceOverride),
                stockQuantity,
                active: patch.active,
                sortOrder: patch.sortOrder,
              },
            });
          }
        }
        const updated = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: {
            variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          },
        });
        return { data: await this.describeProduct(updated) };
      });
    } catch (e) {
      if (isPrismaCode(e, "P2002")) {
        const target = uniqueConflictFields(e);
        if (target.includes("sku"))
          throw new ConflictException("product_sku_conflict");
        if (target.includes("optionKey"))
          throw new ConflictException("variant_options_conflict");
      }
      throw mapPrisma(e);
    }
  }

  createVariant(
    productId: string,
    input: VariantInput,
    expectedVersion: number,
  ) {
    return this.mutateVariant(productId, expectedVersion, {
      kind: "create",
      input,
    });
  }

  updateVariant(
    productId: string,
    variantId: string,
    patch: VariantPatch,
    expectedVersion: number,
  ) {
    return this.mutateVariant(productId, expectedVersion, {
      kind: "update",
      variantId,
      patch,
    });
  }

  deleteVariant(productId: string, variantId: string, expectedVersion: number) {
    return this.mutateVariant(productId, expectedVersion, {
      kind: "delete",
      variantId,
    });
  }

  // ---- Public/admin reads ----
  async getPublic(id: string) {
    const p = await this.prisma.product.findFirst({
      where: {
        id,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        ...this.publicAvailabilityWhere(),
      },
      include: {
        variants: {
          where: { active: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!p) throw new NotFoundException("product_not_found");
    const descriptions: DescriptionCache = new Map();
    await this.assertPublicEligibility(
      p.id,
      p.currency,
      undefined,
      descriptions,
    );
    return { data: await this.describeProduct(p, true, descriptions) };
  }

  async getAdmin(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    });
    if (!p) throw new NotFoundException("product_not_found");
    return { data: await this.describeProduct(p) };
  }

  async listPublic(req: PublicListProductsInput) {
    return this.listMatching(
      req,
      {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        AND: [this.publicAvailabilityWhere()],
      },
      true,
    );
  }

  private publicAvailabilityWhere(): Prisma.ProductWhereInput {
    return {
      OR: [
        {
          selectionMode: ProductSelectionMode.BASE,
          OR: [{ trackInventory: false }, { stockQuantity: { gt: 0 } }],
        },
        {
          selectionMode: ProductSelectionMode.VARIANT,
          OR: [
            {
              trackInventory: false,
              variants: { some: { active: true, deletedAt: null } },
            },
            {
              trackInventory: true,
              variants: {
                some: {
                  active: true,
                  deletedAt: null,
                  stockQuantity: { gt: 0 },
                },
              },
            },
          ],
        },
      ],
    };
  }

  async listAdmin(req: ListProductsInput) {
    const where: Prisma.ProductWhereInput = {};
    if (!req.includeDeleted) where.deletedAt = null;
    if (req.status) where.status = asStatus(req.status);
    return this.listMatching(req, where);
  }

  private async listMatching(
    req: PublicListProductsInput,
    where: Prisma.ProductWhereInput,
    publicOnly = false,
  ) {
    const page = Math.max(1, Number(req.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.limit) || 10));

    if (req.q) {
      where.OR = [
        { title: { contains: req.q, mode: "insensitive" } },
        { sku: { contains: req.q, mode: "insensitive" } },
      ];
    }
    if (req.categoryId) where.categoryId = req.categoryId;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          variants: {
            where: publicOnly ? { active: true, deletedAt: null } : undefined,
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isFeatured: "desc" as const },
          { featureSort: "asc" as const },
          { createdAt: "desc" as const },
        ],
      }),
      this.prisma.product.count({ where }),
    ]);

    const descriptions: DescriptionCache = new Map();
    if (publicOnly && rows.length > 0) {
      const shopCurrency = await this.getShopCurrency();
      await Promise.all(
        rows.map((row) =>
          this.assertPublicEligibility(
            row.id,
            row.currency,
            shopCurrency,
            descriptions,
          ),
        ),
      );
    }
    return {
      data: await Promise.all(
        rows.map((row) => this.describeProduct(row, publicOnly, descriptions)),
      ),
      total,
    };
  }

  // ---- Soft delete / restore / hard delete ----
  async softDelete(id: string) {
    try {
      const data = await this.prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), version: { increment: 1 } },
        include: { variants: true },
      });
      return { data: await this.describeProduct(data) };
    } catch (e) {
      throw mapPrisma(e, { missingTarget: "product_not_found" });
    }
  }

  async restore(id: string) {
    try {
      const data = await this.prisma.product.update({
        where: { id },
        data: { deletedAt: null, version: { increment: 1 } },
        include: { variants: true },
      });
      return { data: await this.describeProduct(data) };
    } catch (e) {
      throw mapPrisma(e, { missingTarget: "product_not_found" });
    }
  }

  async hardDelete(id: string) {
    try {
      const data = await this.prisma.product.delete({
        where: { id },
        include: { variants: true },
      });
      return { data: await this.describeProduct(data) };
    } catch (e) {
      throw mapPrisma(e, {
        missingTarget: "product_not_found",
        foreignKeyConflict: "product_has_dependents",
      });
    }
  }

  // ---- Bulk discount ----
  async applyDiscountBulk(req: ApplyDiscountBulkDto) {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (req.ids && req.ids.length) where.id = { in: req.ids };
    if (req.categoryId) where.categoryId = req.categoryId;
    const st = asStatus(req.status);
    if (st) where.status = st;
    if (req.q) {
      where.OR = [
        { title: { contains: req.q, mode: "insensitive" } },
        { sku: { contains: req.q, mode: "insensitive" } },
      ];
    }

    const changesDiscount = DISCOUNT_FIELDS.some((field) =>
      isProvided(req, field),
    );
    if (!changesDiscount) {
      throw new BadRequestException("discount update is required");
    }

    const data: Prisma.ProductUpdateManyMutationInput = {};
    const clear = req.discountType === DiscountTypeDto.NONE;
    if (clear) {
      Object.assign(data, this.clearedDiscountState());
    } else {
      const patch: ProductPatchInput = {};
      if (isProvided(req, "discountType"))
        patch.discountType = req.discountType;
      if (isProvided(req, "discountValue"))
        patch.discountValue = req.discountValue;
      if (isProvided(req, "discountActive"))
        patch.discountActive = req.discountActive;
      if (isProvided(req, "discountStart"))
        patch.discountStart = req.discountStart;
      if (isProvided(req, "discountEnd")) patch.discountEnd = req.discountEnd;

      let currentRows: DiscountState[];
      try {
        currentRows = await this.prisma.product.findMany({
          where,
          select: {
            discountType: true,
            discountValue: true,
            discountActive: true,
            discountStart: true,
            discountEnd: true,
          },
        });
      } catch (e) {
        throw mapPrisma(e);
      }
      for (const current of currentRows) {
        this.patchDiscountState(current, patch);
      }

      if (isProvided(patch, "discountType")) {
        const nextDiscountType = asDiscountType(patch.discountType);
        if (!nextDiscountType) {
          throw new BadRequestException("discountType is invalid");
        }
        data.discountType = nextDiscountType;
      }
      if (isProvided(patch, "discountValue")) {
        data.discountValue = new Prisma.Decimal(patch.discountValue as number);
      }
      if (isProvided(patch, "discountActive")) {
        data.discountActive = patch.discountActive;
      }
      if (isProvided(patch, "discountStart")) {
        data.discountStart = this.parseDiscountDate(patch.discountStart);
      }
      if (isProvided(patch, "discountEnd")) {
        data.discountEnd = this.parseDiscountDate(patch.discountEnd);
      }
    }

    data.version = { increment: 1 };

    try {
      const res = await this.prisma.product.updateMany({ where, data });
      return { updated: res.count };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  // ---- Gallery
  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("product_not_found");
  }

  private listGalleryRows(
    productId: string,
    includeDeleted: boolean,
    publicOnly = false,
  ) {
    return this.prisma.productGalleryImage.findMany({
      where: {
        productId,
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(publicOnly ? { mediaId: { not: null } } : {}),
      },
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      select: {
        id: true,
        url: true,
        mediaId: true,
        alt: true,
        title: true,
        metadataVersion: true,
        sortOrder: true,
        deletedAt: true,
      },
    });
  }

  async addImages(
    productId: string,
    images: {
      url?: string;
      mediaId?: string;
      alt?: string | null;
      title?: string | null;
      sort?: number;
    }[],
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    try {
      await this.assertProductExists(productId);

      const resolved = await Promise.all(
        (images ?? []).map(async (image) => {
          if (image.mediaId && image.url?.trim()) {
            throw new BadRequestException("gallery_media_input_conflict");
          }
          if (image.mediaId) {
            return {
              image,
              mediaId: await this.resolveProductMediaId(
                image.mediaId,
                "GALLERY",
                downstream,
              ),
              url: "",
            };
          }
          throw new BadRequestException("gallery_media_id_required");
        }),
      );

      const max = await this.prisma.productGalleryImage.findFirst({
        where: { productId, deletedAt: null },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      let next = (max?.sortOrder ?? -1) + 1;

      const data = resolved.map(({ image, mediaId, url }) => ({
        productId,
        url,
        mediaId,
        alt: descriptiveText(image.alt, "alt", 180) ?? null,
        title: descriptiveText(image.title, "title", 200) ?? null,
        sortOrder: Number.isInteger(image.sort)
          ? (image.sort as number)
          : next++,
      }));

      if (data.length) {
        await this.prisma.productGalleryImage.createMany({ data });
      }
      return this.describeGallery(await this.listGalleryRows(productId, false));
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async updateImageMetadata(
    productId: string,
    imageId: string,
    input: {
      expectedVersion: number;
      title?: string | null;
      alt?: string | null;
      clearTitle?: boolean;
      clearAlt?: boolean;
    },
  ) {
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 1 ||
      input.expectedVersion >= 2147483647
    )
      throw new BadRequestException("metadata_version_invalid");
    const title = textPatch(input.title, input.clearTitle, "title", 200);
    const alt = textPatch(input.alt, input.clearAlt, "alt", 180);
    if (title === undefined && alt === undefined)
      throw new BadRequestException("metadata_patch_empty");
    await this.prisma.$transaction(async (tx) => {
      // Coordinate with Product's existing deletion lock; do not increment its commercial version.
      const products = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT "id" FROM "Product" WHERE "id" = ${productId} AND "deletedAt" IS NULL FOR UPDATE`;
      if (products.length !== 1)
        throw new NotFoundException("product_not_found");
      const changed = await tx.productGalleryImage.updateMany({
        where: {
          id: imageId,
          productId,
          deletedAt: null,
          metadataVersion: input.expectedVersion,
        },
        data: {
          ...(title === undefined ? {} : { title }),
          ...(alt === undefined ? {} : { alt }),
          metadataVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        const row = await tx.productGalleryImage.findFirst({
          where: { id: imageId, productId, deletedAt: null },
          select: { id: true },
        });
        if (!row)
          throw new NotFoundException("product_gallery_image_not_found");
        throw new ConflictException(
          "product_gallery_metadata_version_conflict",
        );
      }
    });
    return this.listAdminGallery(productId, false);
  }

  async listPublicGallery(productId: string) {
    const visible = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        ...this.publicAvailabilityWhere(),
      },
      select: { id: true, currency: true },
    });
    if (!visible) throw new NotFoundException("product_not_found");
    const descriptions: DescriptionCache = new Map();
    await this.assertPublicEligibility(
      productId,
      visible.currency,
      undefined,
      descriptions,
    );
    return this.describeGallery(
      await this.listGalleryRows(productId, false, true),
      true,
      descriptions,
    );
  }

  async listAdminGallery(productId: string, includeDeleted = false) {
    await this.assertProductExists(productId);
    return this.describeGallery(
      await this.listGalleryRows(productId, includeDeleted),
    );
  }

  async reorderImages(
    productId: string,
    orders: { id: string; sort: number }[],
  ) {
    const safeOrders = Array.isArray(orders) ? orders : [];

    try {
      await this.assertProductExists(productId);

      if (safeOrders.length) {
        // Ensure all provided image ids belong to this product
        const ids = safeOrders.map((o) => o.id);
        const found = await this.prisma.productGalleryImage.findMany({
          where: { id: { in: ids }, productId },
          select: { id: true },
        });
        if (found.length !== ids.length) {
          throw new BadRequestException(
            "One or more image ids do not belong to the product",
          );
        }

        // Apply provided orders
        await this.prisma.$transaction(
          safeOrders.map((o) =>
            this.prisma.productGalleryImage.update({
              where: { id: o.id },
              data: { sortOrder: o.sort },
            }),
          ),
        );
      }

      // Normalize 0..n among non-deleted
      const rows = await this.listGalleryRows(productId, false);
      let i = 0;
      await this.prisma.$transaction(
        rows
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) =>
            this.prisma.productGalleryImage.update({
              where: { id: r.id },
              data: { sortOrder: i++ },
            }),
          ),
      );

      return this.describeGallery(await this.listGalleryRows(productId, false));
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async removeImage(productId: string, imageId: string, hard = false) {
    try {
      await this.assertProductExists(productId);

      const img = await this.prisma.productGalleryImage.findUnique({
        where: { id: imageId },
        select: { id: true, productId: true },
      });
      if (!img || img.productId !== productId) {
        throw new NotFoundException("image_not_found");
      }

      if (hard) {
        await this.prisma.productGalleryImage.delete({
          where: { id: imageId },
        });
      } else {
        await this.prisma.productGalleryImage.update({
          where: { id: imageId },
          data: { deletedAt: new Date() },
        });
      }

      // return including deleted so callers can see state
      return this.describeGallery(await this.listGalleryRows(productId, true));
    } catch (e) {
      throw mapPrisma(e, { missingTarget: "image_not_found" });
    }
  }
}
