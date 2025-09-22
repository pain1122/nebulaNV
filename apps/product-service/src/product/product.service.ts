import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { Prisma, ProductStatus } from "../../prisma/generated";
import { SETTINGS_SERVICE } from "../settings-client.module";
import type { Metadata } from "@grpc/grpc-js";
import { buildS2SMetadata } from "@nebula/grpc-auth"; // uses our small helper to sign gRPC calls

interface SettingsProxy {
  GetString(
    req: { namespace: string; environment?: string; key: string },
    meta?: Metadata
  ): import("rxjs").Observable<{ value: string }>;
}

function mapPrisma(e: any) {
  // P2002 unique constraint failed (slug/sku)
  if (e?.code === "P2002") {
    const target = e?.meta?.target?.join(", ") ?? "unique constraint";
    return new BadRequestException(`Duplicate value for ${target}`);
  }
  // P2025 record not found (e.g., connect fails)
  if (e?.code === "P2025") {
    return new BadRequestException("Related record not found");
  }
  return e;
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
  return Math.random().toString(36).slice(2, 2 + len);
}

const asStatus = (v: any): ProductStatus | undefined =>
  v && Object.values(ProductStatus).includes(v as ProductStatus) ? (v as ProductStatus) : undefined;

@Injectable()
export class ProductServiceImpl {
  constructor(private prisma: PrismaService, @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc) {}

  private settings(): SettingsProxy {
    return this.settingsClient.getService<SettingsProxy>("SettingsService");
  }

  private toDto = (p: any) => {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? "",
      excerpt: p.excerpt ?? "",
      sku: p.sku,
      status: p.status ?? "ACTIVE",
      price: p.price,
      currency: p.currency ?? "EUR",

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
      discountType: p.discountType ?? "",
      discountValue: p.discountValue ?? 0,
      discountActive: !!p.discountActive,
      discountStart: p.discountStart ? p.discountStart.toISOString() : "",
      discountEnd: p.discountEnd ? p.discountEnd.toISOString() : "",
      tags: p.tags ?? [],
      complementaryIds: p.complementaryIds ?? [],
      createdAt: p.createdAt ? p.createdAt.toISOString() : "",
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : "",
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : "",
    };
  };

  private async getDefaultCategoryId(): Promise<string> {
    const res = await firstValueFrom(
      this.settings().GetString(
        {
          namespace: "product",
          environment: "default",
          key: "defaultProductCategoryId",
        },
        buildS2SMetadata({ serviceName: process.env.SVC_NAME }) // sign the internal call
      )
    );
    if (!res?.value) {
      throw new BadRequestException(
        "Default category not configured. Initialize it via /categories/default/ensure or PUT /categories/default."
      );
    }
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
        const exists = await this.prisma.product.findUnique({ where: { sku: candidate } });
        if (!exists) return candidate;
      }
    }
    // validate/ensure provided sku is unique; if collision, append token
    let candidate = sku;
    while (true) {
      const exists = await this.prisma.product.findUnique({ where: { sku: candidate! } });
      if (!exists) return candidate!;
      candidate = `${sku}-${randToken(3).toUpperCase()}`;
    }
  }

  // ---- Validation helpers (create) ----
  private assertCreate(data: any) {
    const missing = ["title"].filter((k) => data?.[k] == null || data?.[k] === "");
    if (missing.length) throw new BadRequestException(`Missing required fields: ${missing.join(", ")}`);
  }

  private async assertCategoryExists(categoryId: string) {
    const ok = await this.prisma.productCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!ok) throw new BadRequestException(`Category ${categoryId} does not exist`);
  }

  private assertDiscountWindow(start?: Date | null, end?: Date | null) {
    if (start && end && end < start) {
      throw new BadRequestException("discountEnd must be >= discountStart");
    }
  }

  private assertPrice(v: any) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException("price must be a non-negative number");
    }
  }

  // ---- Create ----
  async create(n: any) {
    const input = n;
    this.assertCreate(input);
    this.assertPrice(input.price);

    const title = input.title;
    const slug = input.slug ? basicSlugify(input.slug) : await this.ensureUniqueSlug(title);
    const sku = await this.ensureUniqueSku(input.sku ?? null);
    const categoryId = input.categoryId ?? (await this.getDefaultCategoryId());
    await this.assertCategoryExists(categoryId);

    // normalize window to Date|null for DB
    const discountStart: Date | null = input.discountStart ? new Date(input.discountStart) : null;
    const discountEnd: Date | null = input.discountEnd ? new Date(input.discountEnd) : null;
    this.assertDiscountWindow(discountStart, discountEnd);

    try {
      const data = await this.prisma.product.create({
        data: {
          title,
          description: input.description ?? "",
          excerpt: input.excerpt ?? null,

          slug,
          sku,

          price: new Prisma.Decimal(input.price ?? 0),
          currency: input.currency ?? "EUR",
          status: asStatus(input.status) ?? ProductStatus.DRAFT,

          category: { connect: { id: categoryId } },

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

          discountType: input.discountType,
          discountValue: input.discountValue != null ? new Prisma.Decimal(input.discountValue) : null,
          discountActive: !!input.discountActive,
          discountStart,
          discountEnd,

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
  async update(id: string, n: any) {
    const patch = n;
    if (patch.price != null) this.assertPrice(patch.price);

    let nextCategoryId: string | undefined;
    if ("categoryId" in patch) {
      if (patch.categoryId === "" || patch.categoryId == null) {
        nextCategoryId = await this.getDefaultCategoryId();
      } else {
        await this.assertCategoryExists(patch.categoryId);
        nextCategoryId = patch.categoryId;
      }
    }

    const discountStart =
      patch.discountStart === null ? null : patch.discountStart ? new Date(patch.discountStart) : undefined;
    const discountEnd = patch.discountEnd === null ? null : patch.discountEnd ? new Date(patch.discountEnd) : undefined;
    this.assertDiscountWindow(
      discountStart instanceof Date ? discountStart : undefined,
      discountEnd instanceof Date ? discountEnd : undefined
    );

    try {
      const data = await this.prisma.product.update({
        where: { id },
        data: {
          title: patch.title ?? undefined,
          description: patch.description ?? undefined,
          excerpt: patch.excerpt ?? undefined,
          slug: patch.slug ?? undefined,
          sku: patch.sku ?? undefined,
          price: patch.price != null ? new Prisma.Decimal(patch.price) : undefined,
          currency: patch.currency ?? undefined,
          status: asStatus(patch.status),

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
          discountType: patch.discountType ?? undefined,
          discountValue: patch.discountValue != null ? new Prisma.Decimal(patch.discountValue) : undefined,
          discountActive: patch.discountActive ?? undefined,
          discountStart,
          discountEnd,
          tags: patch.tags ?? undefined,
          complementaryIds: patch.complementaryIds ?? undefined,
        },
      });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  // ---- Get ----
  async get(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("product_not_found");
    return { data: this.toDto(p) };
  }

  // ---- List (exclude soft-deleted by default) ----
  async list(req: any) {
    const includeDeleted = !!req.includeDeleted;
    const page = Math.max(1, Number(req.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.limit) || 10));
    const where: any = {};

    if (!includeDeleted) where.deletedAt = null;
    if (req.q) {
      where.OR = [{ title: { contains: req.q, mode: "insensitive" } }, { sku: { contains: req.q, mode: "insensitive" } }];
    }
    if (req.categoryId) where.categoryId = req.categoryId;
    if (req.status) where.status = asStatus(req.status);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: "desc" as const }, { featureSort: "asc" as const }, { createdAt: "desc" as const }],
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
      const data = await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
      return { data: this.toDto(data) };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async restore(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("product_not_found");
    try {
      const data = await this.prisma.product.update({ where: { id }, data: { deletedAt: null } });
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
  async applyDiscountBulk(req: any) {
    const data: any = {};
    const clear = req.discountType === "NONE";

    if (clear) {
      data.discountType = null;
      data.discountValue = null;
      data.discountActive = false;
      data.discountStart = null;
      data.discountEnd = null;
    } else {
      if (req.discountType) data.discountType = req.discountType;
      if (req.discountValue != null) data.discountValue = new Prisma.Decimal(req.discountValue);
      if (typeof req.discountActive === "boolean") data.discountActive = req.discountActive;
      if (req.discountStart !== undefined)
        data.discountStart = req.discountStart ? new Date(req.discountStart) : null;
      if (req.discountEnd !== undefined) data.discountEnd = req.discountEnd ? new Date(req.discountEnd) : null;
      if (req.discountStart && req.discountEnd) {
        this.assertDiscountWindow(new Date(req.discountStart), new Date(req.discountEnd));
      }
    }

    const where: any = { deletedAt: null };
    if (req.ids && req.ids.length) where.id = { in: req.ids };
    if (req.categoryId) where.categoryId = req.categoryId;
    const st = asStatus(req.status);
    if (st) where.status = st;
    if (req.q) {
      where.OR = [{ title: { contains: req.q, mode: "insensitive" } }, { sku: { contains: req.q, mode: "insensitive" } }];
    }
    try {
      const res = await this.prisma.product.updateMany({ where, data });
      return { updated: res.count };
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  // ---- Gallery
  async addImages(productId: string, images: { url: string; alt?: string; sort?: number }[]) {
    try {
      // (Optional) ensure product exists
      const exists = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
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
      return this.listGallery(productId, false);
    } catch (e) {
      throw mapPrisma(e);
    }
  }

  async listGallery(productId: string, includeDeleted = false) {
    return this.prisma.productGalleryImage.findMany({
      where: { productId, ...(includeDeleted ? {} : { deletedAt: null }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, url: true, alt: true, sortOrder: true, deletedAt: true },
    });
  }

  async reorderImages(productId: string, orders: { id: string; sort: number }[]) {
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
          throw new BadRequestException("One or more image ids do not belong to the product");
        }

        // Apply provided orders
        await this.prisma.$transaction(
          safeOrders.map((o) =>
            this.prisma.productGalleryImage.update({
              where: { id: o.id },
              data: { sortOrder: o.sort },
            })
          )
        );
      }

      // Normalize 0..n among non-deleted
      const rows = await this.listGallery(productId, false);
      let i = 0;
      await this.prisma.$transaction(
        rows
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) =>
            this.prisma.productGalleryImage.update({
              where: { id: r.id },
              data: { sortOrder: i++ },
            })
          )
      );

      return this.listGallery(productId, false);
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
        await this.prisma.productGalleryImage.delete({ where: { id: imageId } });
      } else {
        await this.prisma.productGalleryImage.update({
          where: { id: imageId },
          data: { deletedAt: new Date() },
        });
      }

      // return including deleted so callers can see state
      return this.listGallery(productId, true);
    } catch (e) {
      throw mapPrisma(e);
    }
  }
}
