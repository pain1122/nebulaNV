import {BadRequestException, Injectable, NotFoundException, Inject} from "@nestjs/common"
import {PrismaService} from "../prisma.service"
import {ClientGrpc} from "@nestjs/microservices"
import {firstValueFrom} from "rxjs"
import {SETTINGS_SERVICE} from "../settings-client.module"

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function mapPrisma(e: any) {
  // P2002 unique constraint failed (slug/sku)
  if (e?.code === "P2002") {
    const target = e?.meta?.target?.join(", ") ?? "unique constraint"
    return new BadRequestException(`Duplicate value for ${target}`)
  }
  // P2025 record not found (e.g., connect fails)
  if (e?.code === "P2025") {
    return new BadRequestException("Related record not found")
  }
  return e
}

interface SettingsProxy {
  SetString(req: {namespace: string; environment?: string; key: string; value: string}): import("rxjs").Observable<{value: string}>
  GetString(req: {namespace: string; environment?: string; key: string}): import("rxjs").Observable<{value: string}>
}

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc
  ) {}
  private settings(): SettingsProxy {
    return this.settingsClient.getService<SettingsProxy>("SettingsService")
  }

  async createCategory(dto: {title: string; slug?: string; isHidden?: boolean}) {
    try {
      const nextSlug = await (async () => {
        const s = dto.slug ? slugify(dto.slug) : slugify(dto.title)
        let slug = s,
          n = 1
        while (true) {
          const dup = await this.prisma.productCategory.findFirst({where: {slug}, select: {id: true}})
          if (!dup) return slug
          n += 1
          slug = `${s}-${n}`
        }
      })()

      return this.prisma.productCategory.create({
        data: {
          title: dto.title,
          slug: nextSlug,
          isHidden: !!dto.isHidden,
          isSystem: false,
        },
      })
    } catch (e) {
      throw mapPrisma(e)
    }
  }

  async ensureDefaultCategory(): Promise<{id: string}> {
    const undef = await this.prisma.productCategory.upsert({
      where: {slug: "undefined"},
      update: {title: "Undefined", isHidden: true, isSystem: true},
      create: {slug: "undefined", title: "Undefined", isHidden: true, isSystem: true},
      select: {id: true},
    })

    await firstValueFrom(
      this.settings().SetString({
        namespace: "product",
        environment: "default",
        key: "default_product_category_id",
        value: undef.id,
      })
    )

    return {id: undef.id}
  }

  async getDefault() {
    const res = await firstValueFrom(
      this.settings().GetString({
        namespace: "product",
        environment: "default",
        key: "default_product_category_id",
      })
    )
    if (!res?.value) throw new NotFoundException("default_product_category_id not set")
    return {id: res.value} // ID-only, no DB join
  }

  async getDefaultCategoryRow() {
    const {id} = await this.getDefault()
    const cat = await this.prisma.productCategory.findUnique({where: {id}})
    if (!cat) throw new NotFoundException("Default category row missing")
    return cat
  }

  async setDefault(categoryId: string) {
    const exists = await this.prisma.productCategory.findFirst({
      where: {id: categoryId, deletedAt: null},
      select: {id: true},
    })
    if (!exists) throw new NotFoundException("Category not found")

    await firstValueFrom(
      this.settings().SetString({
        namespace: "product",
        environment: "default",
        key: "default_product_category_id",
        value: categoryId,
      })
    )
    return {default_product_category_id: categoryId}
  }

  async updateCategory(id: string, dto: {title?: string; slug?: string; isHidden?: boolean}) {
    try {
      let nextSlug = dto.slug ? slugify(dto.slug) : undefined
      if (!nextSlug && dto.title) nextSlug = slugify(dto.title)

      if (nextSlug) {
        const dup = await this.prisma.productCategory.findFirst({
          where: {slug: nextSlug, id: {not: id}},
          select: {id: true},
        })
        if (dup) throw new BadRequestException("Slug already in use")
      }

      const updated = await this.prisma.productCategory.update({
        where: {id},
        data: {
          title: dto.title ?? undefined,
          slug: nextSlug ?? undefined,
          isHidden: typeof dto.isHidden === "boolean" ? dto.isHidden : undefined,
        },
      })
      return updated
    } catch (e) {
      throw mapPrisma(e)
    }
  }

  /**
   * Delete a category.
   * If substituteId provided, reassign products to it first (explicit).
   * Else rely on FK onDelete: Restrict (auto-reassign to current default).
   * If deleting the current default, you MUST call setDefault() to another category BEFORE or provide substitute here.
   */
  async deleteCategory(id: string, substituteId?: string) {
    try {
      const def = await firstValueFrom(
        this.settings().GetString({
          namespace: "product",
          environment: "default",
          key: "default_product_category_id",
        })
      )
      if (def?.value === id) {
        throw new BadRequestException("Cannot delete the default category")
      }
      const cat = await this.prisma.productCategory.findUnique({where: {id}})
      if (!cat) throw new NotFoundException("Category not found")

      // If explicitly substituting, do it in a tx
      if (substituteId && substituteId !== id) {
        const sub = await this.prisma.productCategory.findFirst({
          where: {id: substituteId, deletedAt: null},
          select: {id: true},
        })
        if (!sub) throw new BadRequestException("Substitute category not found")

        await this.prisma.$transaction(async (tx) => {
          await tx.product.updateMany({
            where: {categoryId: id},
            data: {categoryId: substituteId},
          })
          await tx.productCategory.delete({where: {id}})
        })
        return {deleted: id, reassignedTo: substituteId, mode: "explicit"}
      }

      // No explicit substitute: delete and let FK SET DEFAULT kick in
      await this.prisma.productCategory.delete({where: {id}})
      return {deleted: id, reassignedTo: "DB_DEFAULT", mode: "implicit"}
    } catch (e) {
      throw mapPrisma(e)
    }
  }

  async listPublic() {
    return this.prisma.productCategory.findMany({
      where: {deletedAt: null, isHidden: false},
      orderBy: {createdAt: "asc"},
      select: {id: true, slug: true, title: true},
    })
  }

  async listAll() {
    return this.prisma.productCategory.findMany({
      where: {deletedAt: null},
      orderBy: {createdAt: "asc"},
      select: {id: true, slug: true, title: true, isHidden: true},
    })
  }
}
