import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import {
  Prisma,
  ProductStatus,
  DiscountType,
  type Product,
} from "../../prisma/generated";
import { SETTINGS_SERVICE } from "../settings-client.module";
import { getSettings, type SettingsProxy } from "@nebula/clients";
import { TAXONOMY_SERVICE } from "../taxonomy-client.module";
import { getTaxonomy, type TaxonomyProxy } from "@nebula/clients";
import {
  wrapGrpc,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";
import { isRecord } from "../error.utils";
import { DiscountTypeDto, type ProductInputDto } from "./dto/product-input.dto";
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
};

type DiscountState = Pick<
  Product,
  | "discountType"
  | "discountValue"
  | "discountActive"
  | "discountStart"
  | "discountEnd"
>;

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
    const meta = isRecord(e.meta) ? e.meta : undefined;
    const rawTarget = meta?.target;

    const target = Array.isArray(rawTarget)
      ? rawTarget
          .filter((item): item is string => typeof item === "string")
          .join(", ")
      : typeof rawTarget === "string"
        ? rawTarget
        : "unique constraint";

    return new BadRequestException(`Duplicate value for ${target}`);
  }

  if (isRecord(e) && e.code === "P2025") {
    if (options?.missingTarget) {
      return new NotFoundException(options.missingTarget);
    }

    return new BadRequestException("Related record not found");
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

function randToken(len = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

const asStatus = (value: unknown): ProductStatus | undefined =>
  typeof value === "string" &&
  Object.values(ProductStatus).includes(value as ProductStatus)
    ? (value as ProductStatus)
    : undefined;

const asDiscountType = (value: unknown): DiscountType | null | undefined => {
  if (value === DiscountTypeDto.NONE) return null;

  return typeof value === "string" &&
    Object.values(DiscountType).includes(value as DiscountType)
    ? (value as DiscountType)
    : undefined;
};

@Injectable()
export class ProductServiceImpl {
  constructor(
    private prisma: PrismaService,
    @Inject(TAXONOMY_SERVICE) private readonly taxonomyClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
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

  private effectivePrice(p: Product, now = new Date()): number {
    const price = new Prisma.Decimal(p.price);
    const value = p.discountValue ? new Prisma.Decimal(p.discountValue) : null;
    const outsideWindow =
      (p.discountStart !== null && now < p.discountStart) ||
      (p.discountEnd !== null && now > p.discountEnd);

    if (
      !p.discountActive ||
      !p.discountType ||
      value === null ||
      value.isNegative() ||
      outsideWindow
    ) {
      return price.toNumber();
    }

    const discounted =
      p.discountType === DiscountType.PERCENTAGE
        ? price.mul(new Prisma.Decimal(100).minus(value)).div(100)
        : price.minus(value);
    const nonNegative = discounted.isNegative()
      ? new Prisma.Decimal(0)
      : discounted;
    return nonNegative
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  private toDto = (p: Product) => {
    const hasDiscount = p.discountType !== null;
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

      thumbnailUrl: p.thumbnailUrl ?? "",
      model3dUrl: p.model3dUrl ?? "",
      model3dFormat: p.model3dFormat ?? "",
      model3dLiveView: !!p.model3dLiveView,
      model3dPosterUrl: p.model3dPosterUrl ?? "",
      vrEnabled: !!p.vrEnabled,
      vrPlanImageUrl: p.vrPlanImageUrl ?? "",
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
      effectivePrice: this.effectivePrice(p),
      tags: p.tags ?? [],
      complementaryIds: p.complementaryIds ?? [],
      createdAt: p.createdAt ? p.createdAt.toISOString() : "",
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : "",
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : "",
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

  private async ensureUniqueSlug(base: string) {
    let slug = basicSlugify(base);
    let n = 1;
    while (true) {
      const exists = await this.prisma.product.findUnique({ where: { slug } });
      if (!exists) return slug;
      n += 1;
      slug = `${basicSlugify(base)}-${n}`;
    }
  }

  private async ensureUniqueSku(sku?: string | null) {
    if (!sku) {
      // generate until unique
      while (true) {
        const candidate = `SKU-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randToken(5).toUpperCase()}`;
        const exists = await this.prisma.product.findUnique({
          where: { sku: candidate },
        });
        if (!exists) return candidate;
      }
    }
    // validate/ensure provided sku is unique; if collision, append token
    let candidate = sku;
    while (true) {
      const exists = await this.prisma.product.findUnique({
        where: { sku: candidate },
      });
      if (!exists) return candidate;
      candidate = `${sku}-${randToken(3).toUpperCase()}`;
    }
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

      if (t.scope !== "product" || t.kind !== "category.default") {
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
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException("price must be a non-negative number");
    }
  }

  // ---- Create ----
  async create(
    n: ProductInputDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const input = n;
    this.assertCreate(input);
    this.assertPrice(input.price);

    const title = input.title;
    const slug = input.slug
      ? basicSlugify(input.slug)
      : await this.ensureUniqueSlug(title);
    const sku = await this.ensureUniqueSku(input.sku ?? null);
    const categoryId =
      input.categoryId ?? (await this.getDefaultCategoryId(downstream));
    await this.assertCategoryExists(categoryId, downstream);

    const currency = await this.resolveProductCurrency(
      input.currency,
      downstream,
    );
    const discount = this.createDiscountState(input);

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
          status: asStatus(input.status) ?? ProductStatus.DRAFT,

          categoryId,

          // ✅ use normalized camelCase
          thumbnailUrl: input.thumbnailUrl,
          model3dUrl: input.model3dUrl,
          model3dFormat: input.model3dFormat,
          model3dLiveView: !!input.model3dLiveView,
          model3dPosterUrl: input.model3dPosterUrl,

          vrEnabled: !!input.vrEnabled,
          vrPlanImageUrl: input.vrPlanImageUrl,

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

          tags: input.tags ?? [],
          complementaryIds: input.complementaryIds ?? [],
        },
      });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  // ---- Update (patch) ----
  async update(
    id: string,
    n?: ProductPatchInput,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const patch = n ?? {};
    if (patch.price != null) this.assertPrice(patch.price);

    let nextCategoryId: string | undefined;
    let nextCurrency: string | undefined;

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

    const changesDiscount = DISCOUNT_FIELDS.some((field) =>
      isProvided(patch, field),
    );

    try {
      let discountData: DiscountState | undefined;
      if (changesDiscount) {
        const current = await this.prisma.product.findUnique({
          where: { id },
          select: {
            discountType: true,
            discountValue: true,
            discountActive: true,
            discountStart: true,
            discountEnd: true,
          },
        });
        if (!current) throw new NotFoundException("product_not_found");
        discountData = this.patchDiscountState(current, patch);
      }

      const data = await this.prisma.product.update({
        where: { id },
        data: {
          title: patch.title ?? undefined,
          description: patch.description ?? undefined,
          excerpt: patch.excerpt ?? undefined,
          slug: patch.slug ?? undefined,
          sku: patch.sku ?? undefined,
          price:
            patch.price != null ? new Prisma.Decimal(patch.price) : undefined,
          currency: nextCurrency,
          status: asStatus(patch.status),

          // ✅ Only set when we actually decided a nextCategoryId
          categoryId: nextCategoryId,

          thumbnailUrl: patch.thumbnailUrl ?? undefined,
          model3dUrl: patch.model3dUrl ?? undefined,
          model3dFormat: patch.model3dFormat ?? undefined,
          model3dLiveView: patch.model3dLiveView ?? undefined,
          model3dPosterUrl: patch.model3dPosterUrl ?? undefined,
          vrEnabled: patch.vrEnabled ?? undefined,
          vrPlanImageUrl: patch.vrPlanImageUrl ?? undefined,
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
        },
      });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e, { missingTarget: "product_not_found" });
    }
  }

  // ---- Public/admin reads ----
  async getPublic(id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, status: ProductStatus.ACTIVE, deletedAt: null },
    });
    if (!p) throw new NotFoundException("product_not_found");
    return { data: this.toDto(p) };
  }

  async getAdmin(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("product_not_found");
    return { data: this.toDto(p) };
  }

  async listPublic(req: PublicListProductsInput) {
    return this.listMatching(req, {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    });
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

    return { data: rows.map(this.toDto), total };
  }

  // ---- Soft delete / restore / hard delete ----
  async softDelete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("product_not_found");
    try {
      const data = await this.prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async restore(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("product_not_found");
    try {
      const data = await this.prisma.product.update({
        where: { id },
        data: { deletedAt: null },
      });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async hardDelete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("product_not_found");
    try {
      const data = await this.prisma.product.delete({ where: { id } });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
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

    try {
      const res = await this.prisma.product.updateMany({ where, data });
      return { updated: res.count };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  // ---- Gallery
  async addImages(
    productId: string,
    images: { url: string; alt?: string; sort?: number }[],
  ) {
    try {
      // (Optional) ensure product exists
      const exists = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("product_not_found");

      const max = await this.prisma.productGalleryImage.findFirst({
        where: { productId, deletedAt: null },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      let next = (max?.sortOrder ?? -1) + 1;

      const data = (images ?? []).map((img) => ({
        productId,
        url: img.url,
        alt: img.alt ?? null,
        sortOrder: Number.isInteger(img.sort) ? (img.sort as number) : next++,
      }));

      if (data.length) {
        await this.prisma.productGalleryImage.createMany({ data });
      }
      return this.listAdminGallery(productId, false);
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async listPublicGallery(productId: string) {
    const visible = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException("product_not_found");
    return this.listAdminGallery(productId, false);
  }

  async listAdminGallery(productId: string, includeDeleted = false) {
    return this.prisma.productGalleryImage.findMany({
      where: { productId, ...(includeDeleted ? {} : { deletedAt: null }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        url: true,
        alt: true,
        sortOrder: true,
        deletedAt: true,
      },
    });
  }

  async reorderImages(
    productId: string,
    orders: { id: string; sort: number }[],
  ) {
    const safeOrders = Array.isArray(orders) ? orders : [];

    try {
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
      const rows = await this.listAdminGallery(productId, false);
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

      return this.listAdminGallery(productId, false);
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async removeImage(productId: string, imageId: string, hard = false) {
    try {
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
      return this.listAdminGallery(productId, true);
    } catch (e) {
      throw mapPrisma(e);
    }
  }
}
