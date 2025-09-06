import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async getDefault() {
    const settings = await this.prisma.$queryRawUnsafe<{ default_category: string }[]>(
      'SELECT default_category FROM app_settings LIMIT 1',
    );
    if (!settings.length) {
      throw new NotFoundException('app_settings not initialized');
    }
    const id = settings[0].default_category;
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Default category row missing');
    return cat;
  }

  async setDefault(categoryId: string) {
    const exists = await this.prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Category not found');
    await this.prisma.$executeRawUnsafe(
      'UPDATE app_settings SET default_category = $1 WHERE id = TRUE',
      categoryId,
    );
    return { default_category: categoryId };
  }

  async updateCategory(id: string, dto: { title?: string; slug?: string; isHidden?: boolean }) {
    // optional slug normalization & uniqueness
    let nextSlug = dto.slug ? slugify(dto.slug) : undefined;
    if (!nextSlug && dto.title) nextSlug = slugify(dto.title);

    if (nextSlug) {
      const dup = await this.prisma.category.findFirst({
        where: { slug: nextSlug, id: { not: id } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException('Slug already in use');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        slug: nextSlug ?? undefined,
        isHidden: typeof dto.isHidden === 'boolean' ? dto.isHidden : undefined,
      },
    });
    return updated;
  }

  /**
   * Delete a category.
   * If substituteId provided, reassign products to it first (explicit).
   * Else rely on FK ON DELETE SET DEFAULT (auto-reassign to current default).
   * If deleting the current default, you MUST call setDefault() to another category BEFORE or provide substitute here.
   */
  async deleteCategory(id: string, substituteId?: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    // If explicitly substituting, do it in a tx
    if (substituteId && substituteId !== id) {
      const sub = await this.prisma.category.findFirst({
        where: { id: substituteId, deletedAt: null },
        select: { id: true },
      });
      if (!sub) throw new BadRequestException('Substitute category not found');

      await this.prisma.$transaction(async (tx) => {
        await tx.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: substituteId },
        });
        await tx.category.delete({ where: { id } });
      });
      return { deleted: id, reassignedTo: substituteId, mode: 'explicit' };
    }

    // No explicit substitute: delete and let FK SET DEFAULT kick in
    await this.prisma.category.delete({ where: { id } });
    return { deleted: id, reassignedTo: 'DB_DEFAULT', mode: 'implicit' };
  }

  async listPublic() {
    return this.prisma.category.findMany({
      where: { deletedAt: null, isHidden: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, title: true },
    });
  }

  async listAll() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, title: true, isHidden: true },
    });
  }
}
