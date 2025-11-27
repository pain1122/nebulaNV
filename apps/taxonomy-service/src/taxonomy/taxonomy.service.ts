// apps/taxonomy-service/src/taxonomy/taxonomy.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../prisma/generated";

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: any) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;

    const where: Prisma.TaxonomyWhereInput = {
      scope: q.scope || undefined,
      kind: q.kind || undefined,
      OR: q.q
        ? [
            {
              title: {
                contains: q.q,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
            {
              slug: {
                contains: q.q,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.taxonomy.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxonomy.count({ where }),
    ]);

    return { data: items, page, limit, total };
  }

  async get(id: string) {
    const t = await this.prisma.taxonomy.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("taxonomy_not_found");
    return t;
  }

  async getBySlug(scope: string, kind: string, slug: string) {
    const t = await this.prisma.taxonomy.findFirst({
      where: { scope, kind, slug },
    });
    if (!t) throw new NotFoundException("taxonomy_not_found");
    return t;
  }

  async create(input: any) {
    // slug uniqueness per (scope, kind) handled by @@unique in Prisma
    const data = {
      scope: input.scope,
      kind: input.kind,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      isHidden: input.isHidden ?? false,
      isSystem: input.isSystem ?? false,
      sortOrder: input.sortOrder ?? 0,
      meta: input.meta ?? null,
    };

    return this.prisma.taxonomy.create({ data });
  }

  async update(id: string, patch: any) {
    // we let Prisma handle which fields are present
    return this.prisma.taxonomy.update({
      where: { id },
      data: {
        scope: patch.scope,
        kind: patch.kind,
        slug: patch.slug,
        title: patch.title,
        description: patch.description,
        isHidden: patch.isHidden,
        isSystem: patch.isSystem,
        sortOrder: patch.sortOrder,
        meta: patch.meta,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.taxonomy.delete({ where: { id } });
    return true;
  }
}
