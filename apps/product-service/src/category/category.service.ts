import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SETTINGS_SERVICE } from '../settings-client.module';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

interface SettingsProxy {
  SetString(req: { namespace: string; environment?: string; key: string; value: string }):
    import('rxjs').Observable<{ value: string }>;
  GetString(req: { namespace: string; environment?: string; key: string }):
    import('rxjs').Observable<{ value: string }>;
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
        key: "default_product_category",
        value: undef.id,
      })
    )

    return {id: undef.id}
  }

  async getDefault() {
    const res = await firstValueFrom(
      this.settings().GetString({
        namespace: 'product',
        environment: 'default',
        key: 'default_product_category',
      })
    );
    if (!res?.value) throw new NotFoundException('default_product_category not set');
    return { id: res.value }; // ID-only, no DB join
  }

  async getDefaultCategoryRow() {
    const { id } = await this.getDefault();
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Default category row missing');
    return cat;
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
        key: "default_product_category",
        value: categoryId,
      })
    )
    return {default_product_category: categoryId}
  }

  async updateCategory(id: string, dto: {title?: string; slug?: string; isHidden?: boolean}) {
    // optional slug normalization & uniqueness
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
  }

  /**
   * Delete a category.
   * If substituteId provided, reassign products to it first (explicit).
   * Else rely on FK ON DELETE SET DEFAULT (auto-reassign to current default).
   * If deleting the current default, you MUST call setDefault() to another category BEFORE or provide substitute here.
   */
  async deleteCategory(id: string, substituteId?: string) {
    const def = await firstValueFrom(
      this.settings().GetString({
        namespace: "product",
        environment: "default",
        key: "default_product_category",
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
