import {Injectable, NotFoundException, BadRequestException} from "@nestjs/common"
import {PrismaService} from "../prisma.service"
import {Prisma, ProductStatus} from "@prisma/client"

function computeEffectivePrice(base: number, type?: string, value?: number, active?: boolean) {
  if (!active || !type || value == null) return base
  if (type === "PERCENTAGE") return Math.max(0, base - base * (value / 100))
  if (type === "FIXED") return Math.max(0, base - value)
  return base
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
  )
}

function randToken(len = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len)
}

const asStatus = (v: any): ProductStatus | undefined => (v && Object.values(ProductStatus).includes(v as ProductStatus) ? (v as ProductStatus) : undefined)

@Injectable()
export class ProductServiceImpl {
  constructor(private prisma: PrismaService) {}

  private toDto = (p: any) => {
    const base = Number(p.price)
    const type = p.discountType ?? ""
    const value = p.discountValue != null ? Number(p.discountValue) : undefined
    const active = !!p.discountActive
    const effective = computeEffectivePrice(base, type, value, active)
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      excerpt: p.excerpt ?? "",
      sku: p.sku,
      status: p.status,
      price: base,
      currency: p.currency,
      category_id: p.categoryId,

      thumbnail_url: p.thumbnailUrl ?? "",

      model3d_url: p.model3dUrl ?? "",
      model3d_format: p.model3dFormat ?? "",
      model3d_live_view: !!p.model3dLiveView,
      model3d_poster_url: p.model3dPosterUrl ?? "",

      vr_enabled: !!p.vrEnabled,
      vr_plan_image_url: p.vrPlanImageUrl ?? "",

      meta_title: p.metaTitle ?? "",
      meta_description: p.metaDescription ?? "",
      meta_keywords: p.metaKeywords ?? "",
      custom_schema: p.customSchema ?? "",
      noindex: !!p.noindex,

      is_featured: !!p.isFeatured,
      feature_sort: p.featureSort ?? 0,
      promo_title: p.promoTitle ?? "",
      promo_badge: p.promoBadge ?? "",
      promo_active: !!p.promoActive,

      discount_type: type,
      discount_value: value ?? 0,
      discount_active: active,
      discount_start: p.discountStart ? p.discountStart.toISOString() : "",
      discount_end: p.discountEnd ? p.discountEnd.toISOString() : "",
      effective_price: effective,

      tags: p.tags ?? [],
      complementary_ids: p.complementaryIds ?? [],

      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      deleted_at: p.deletedAt ? p.deletedAt.toISOString() : "",
    }
  }

  private async ensureUniqueSlug(base: string) {
    let slug = basicSlugify(base)
    let n = 1
    while (true) {
      const exists = await this.prisma.product.findUnique({where: {slug}})
      if (!exists) return slug
      n += 1
      slug = `${basicSlugify(base)}-${n}`
    }
  }

  private async ensureUniqueSku(sku?: string | null) {
    if (!sku) {
      // generate until unique
      while (true) {
        const candidate = `SKU-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randToken(5).toUpperCase()}`
        const exists = await this.prisma.product.findUnique({where: {sku: candidate}})
        if (!exists) return candidate
      }
    }
    // validate/ensure provided sku is unique; if collision, append token
    let candidate = sku
    while (true) {
      const exists = await this.prisma.product.findUnique({where: {sku: candidate!}})
      if (!exists) return candidate!
      candidate = `${sku}-${randToken(3).toUpperCase()}`
    }
  }

  private async resolveCategoryId(provided?: string) {
    if (provided) return provided;
  
    const c = await this.prisma.category.findUnique({ where: { slug: 'undefined' } });
    if (c) return c.id;
  
    const created = await this.prisma.category.create({
      data: { slug: 'undefined', title: 'Undefined' },
    });
    return created.id;
  }

  // ---- Validation helpers (create) ----
  private assertCreate(data: any) {
    const missing = ["title"].filter(k => data?.[k] == null || data?.[k] === "");
    if (missing.length) throw new BadRequestException(`Missing required fields: ${missing.join(", ")}`);
  }

  private async getDefaultCategoryId(): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe<{ default_category: string }[]>(
      'SELECT default_category FROM app_settings LIMIT 1',
    );
    if (!rows.length) {
      throw new Error('app_settings not initialized; run the migration SQL');
    }
    return rows[0].default_category;
  }

  // ---- Create ----
  async create(input: any) {
    this.assertCreate(input);
  
    // compute forgiving defaults
    const title = input.title;
    const slug = input.slug ? basicSlugify(input.slug) : await this.ensureUniqueSlug(title);
    const sku  = await this.ensureUniqueSku(input.sku ?? null);
    const categoryId = input.category_id ?? (await this.getDefaultCategoryId());
  
    const data = await this.prisma.product.create({
      data: {
        title,
        description: input.description ?? "",
        excerpt: input.excerpt ?? null,
  
        slug,                   // ← ensured unique
        sku,                    // ← ensured unique
  
        price: new Prisma.Decimal(input.price ?? 0),
        currency: input.currency ?? "EUR",
        status: asStatus(input.status) ?? ProductStatus.DRAFT, // default now DRAFT for safety
        category: { connect: { id: categoryId } },

        thumbnailUrl: input.thumbnail_url ?? null,
  
        model3dUrl: input.model3d_url ?? null,
        model3dFormat: input.model3d_format ?? null,
        model3dLiveView: !!input.model3d_live_view,
        model3dPosterUrl: input.model3d_poster_url ?? null,
  
        vrEnabled: !!input.vr_enabled,
        vrPlanImageUrl: input.vr_plan_image_url ?? null,
  
        metaTitle: input.meta_title ?? null,
        metaDescription: input.meta_description ?? null,
        metaKeywords: input.meta_keywords ?? null,
        customSchema: input.custom_schema ?? null,
        noindex: !!input.noindex,
  
        isFeatured: !!input.is_featured,
        featureSort: input.feature_sort ?? 0,
        promoTitle: input.promo_title ?? null,
        promoBadge: input.promo_badge ?? null,
        promoActive: !!input.promo_active,
  
        discountType: input.discount_type || null,
        discountValue: input.discount_value != null ? new Prisma.Decimal(input.discount_value) : null,
        discountActive: !!input.discount_active,
        discountStart: input.discount_start ? new Date(input.discount_start) : null,
        discountEnd: input.discount_end ? new Date(input.discount_end) : null,
  
        tags: input.tags ?? [],
        complementaryIds: input.complementary_ids ?? [],
      },
    });
    return { data: this.toDto(data) };
  }

  // ---- Update (patch) ----
  async update(id: string, patch: any) {
    const data = await this.prisma.product.update({
      where: {id},
      data: {
        title: patch.title ?? undefined,
        description: patch.description ?? undefined,
        excerpt: patch.excerpt ?? undefined,
        slug: patch.slug ?? undefined,
        sku: patch.sku ?? undefined,
        price: patch.price != null ? new Prisma.Decimal(patch.price) : undefined,
        currency: patch.currency ?? undefined,
        status: asStatus(patch.status),
        categoryId: patch.category_id ?? undefined,

        thumbnailUrl: patch.thumbnail_url ?? undefined,

        model3dUrl: patch.model3d_url ?? undefined,
        model3dFormat: patch.model3d_format ?? undefined,
        model3dLiveView: patch.model3d_live_view ?? undefined,
        model3dPosterUrl: patch.model3d_poster_url ?? undefined,

        vrEnabled: patch.vr_enabled ?? undefined,
        vrPlanImageUrl: patch.vr_plan_image_url ?? undefined,

        metaTitle: patch.meta_title ?? undefined,
        metaDescription: patch.meta_description ?? undefined,
        metaKeywords: patch.meta_keywords ?? undefined,
        customSchema: patch.custom_schema ?? undefined,
        noindex: patch.noindex ?? undefined,

        isFeatured: patch.is_featured ?? undefined,
        featureSort: patch.feature_sort ?? undefined,
        promoTitle: patch.promo_title ?? undefined,
        promoBadge: patch.promo_badge ?? undefined,
        promoActive: patch.promo_active ?? undefined,

        discountType: patch.discount_type ?? undefined,
        discountValue: patch.discount_value ?? undefined,
        discountActive: patch.discount_active ?? undefined,
        discountStart: patch.discount_start ? new Date(patch.discount_start) : undefined,
        discountEnd: patch.discount_end ? new Date(patch.discount_end) : undefined,

        tags: patch.tags ?? undefined,
        complementaryIds: patch.complementary_ids ?? undefined,
      },
    })
    return {data: this.toDto(data)}
  }

  // ---- Get ----
  async get(id: string) {
    const p = await this.prisma.product.findUnique({where: {id}})
    if (!p) throw new NotFoundException("Product not found")
    return {data: this.toDto(p)}
  }

  // ---- List (exclude soft-deleted by default) ----
  async list(req: any) {
    const page = Math.max(1, Number(req.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.limit) || 10))
    const where: any = {}

    if (!req.include_deleted) where.deletedAt = null
    if (req.q) {
      where.OR = [{title: {contains: req.q, mode: "insensitive"}}, {sku: {contains: req.q, mode: "insensitive"}}]
    }
    if (req.category_id) where.categoryId = req.category_id
    if (req.status) where.status = asStatus(req.status)

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {createdAt: "desc"},
      }),
      this.prisma.product.count({where}),
    ])

    return {data: rows.map(this.toDto), total}
  }

  // ---- Soft delete / restore / hard delete ----
  async softDelete(id: string) {
    const existing = await this.prisma.product.findUnique({where: {id}})
    if (!existing) throw new NotFoundException("Product not found")
    const data = await this.prisma.product.update({where: {id}, data: {deletedAt: new Date()}})
    return {data: this.toDto(data)}
  }

  async restore(id: string) {
    const existing = await this.prisma.product.findUnique({where: {id}})
    if (!existing) throw new NotFoundException("Product not found")
    const data = await this.prisma.product.update({where: {id}, data: {deletedAt: null}})
    return {data: this.toDto(data)}
  }

  async hardDelete(id: string) {
    const existing = await this.prisma.product.findUnique({where: {id}})
    if (!existing) throw new NotFoundException("Product not found")
    const data = await this.prisma.product.delete({where: {id}})
    return {data: this.toDto(data)}
  }

  // ---- Bulk discount ----
  async applyDiscountBulk(req: any) {
    const data: any = {}
    const clear = req.discount_type === "NONE"

    if (clear) {
      data.discountType = null
      data.discountValue = null
      data.discountActive = false
      data.discountStart = null
      data.discountEnd = null
    } else {
      if (req.discount_type) data.discountType = req.discount_type
      if (req.discount_value != null) data.discountValue = new Prisma.Decimal(req.discount_value)
      if (typeof req.discount_active === "boolean") data.discountActive = req.discount_active
      if (req.discount_start) data.discountStart = new Date(req.discount_start)
      if (req.discount_end) data.discountEnd = new Date(req.discount_end)
    }

    const where: any = {deletedAt: null}
    if (req.ids && req.ids.length) where.id = {in: req.ids}
    if (req.category_id) where.categoryId = req.category_id
    const st = asStatus(req.status)
    if (st) where.status = st
    if (req.q) {
      where.OR = [{title: {contains: req.q, mode: "insensitive"}}, {sku: {contains: req.q, mode: "insensitive"}}]
    }

    const res = await this.prisma.product.updateMany({where, data})
    return {updated: res.count}
  }

  // Gallery
  async addImages(productId: string, images: {url: string; alt?: string; sort?: number}[]) {
    // find current max sortOrder among non-deleted
    const max = await this.prisma.productGalleryImage.findFirst({
      where: {productId, deletedAt: null},
      orderBy: {sortOrder: "desc"},
      select: {sortOrder: true},
    })
    let next = (max?.sortOrder ?? -1) + 1

    const data = images.map((img) => ({
      productId,
      url: img.url,
      alt: img.alt ?? null,
      sortOrder: Number.isInteger(img.sort) ? (img.sort as number) : next++,
    }))

    if (data.length) {
      await this.prisma.productGalleryImage.createMany({data})
    }
    return this.listGallery(productId, false)
  }

  async listGallery(productId: string, includeDeleted = false) {
    return this.prisma.productGalleryImage.findMany({
      where: {productId, ...(includeDeleted ? {} : {deletedAt: null})},
      orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}],
      select: {id: true, url: true, alt: true, sortOrder: true, deletedAt: true},
    })
  }

  async reorderImages(productId: string, orders: {id: string; sort: number}[]) {
    // update provided orders
    await this.prisma.$transaction(
      (orders ?? []).map((o) =>
        this.prisma.productGalleryImage.update({
          where: {id: o.id},
          data: {sortOrder: o.sort},
        })
      )
    )
    // normalize 0..n (optional but nice)
    const rows = await this.listGallery(productId, false)
    let i = 0
    await this.prisma.$transaction(
      rows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) =>
          this.prisma.productGalleryImage.update({
            where: {id: r.id},
            data: {sortOrder: i++},
          })
        )
    )

    return this.listGallery(productId, false)
  }

  async removeImage(productId: string, imageId: string, hard = false) {
    if (hard) {
      await this.prisma.productGalleryImage.delete({where: {id: imageId}})
    } else {
      await this.prisma.productGalleryImage.update({
        where: {id: imageId},
        data: {deletedAt: new Date()},
      })
    }
    // return including deleted so callers can see state
    return this.listGallery(productId, true)
  }
}
