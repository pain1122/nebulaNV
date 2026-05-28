// apps/taxonomy-service/src/taxonomy/taxonomy.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma, Taxonomy } from "../../prisma/generated";
import type { CreateTaxonomyDto } from "./dto/create-taxonomy.dto";
import type { UpdateTaxonomyDto } from "./dto/update-taxonomy.dto";

const SAFE = /^[a-z0-9][a-z0-9._-]*$/;
const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase();
const assertSafe = (label: string, v: string) => {
  if (!SAFE.test(v)) {
    throw new BadRequestException(`${label} must match ${SAFE}`);
  }
};

// normalize optional UUID-like fields (parentId) so we never send "" to DB
const normalizeOptionalId = (v: string | null | undefined): string | null => {
  if (v == null) return null;
  const s = v.trim();
  return s.length ? s : null;
};

type TaxonomyMetaInput =
  | Prisma.InputJsonValue
  | Prisma.NullableJsonNullValueInput
  | null;

type CreateTaxonomyInput = CreateTaxonomyDto & {
  meta?: TaxonomyMetaInput;
};

type UpdateTaxonomyInput = UpdateTaxonomyDto & {
  meta?: TaxonomyMetaInput;
};

export type ListTaxonomiesQuery = {
  page?: string | number;
  limit?: string | number;
  scope?: string | null;
  kind?: string | null;
  parentId?: string | null;
  q?: string | null;
};

type TaxonomyWithChildCount = Taxonomy & {
  _childCount?: number;
};

export type TaxonomyDto = {
  id: string;
  scope: string;
  kind: string;
  slug: string;
  title: string;
  description: string | null;
  isTree: boolean;
  parentId: string | null;
  depth: number;
  path: string;
  isHidden: boolean;
  isSystem: boolean;
  sortOrder: number;
  meta: Taxonomy["meta"];
  createdAt: Date;
  updatedAt: Date;
  hasChildren: boolean;
};

type TaxonomyResponse = {
  data: TaxonomyDto;
};

type TaxonomyListResponse = {
  data: TaxonomyDto[];
  page: number;
  limit: number;
  total: number;
};

const prismaErrorDetails = (e: unknown): { code?: string; meta?: unknown } => {
  if (typeof e !== "object" || e === null) return {};

  const record = e as Record<string, unknown>;

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    meta: record.meta,
  };
};

const logValue = (value: unknown): string => {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return "Unknown error";
  }
};

@Injectable()
export class TaxonomyService {
  private readonly log = new Logger(TaxonomyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------
  // DTO mapper
  // ---------------------------
  private toDto(t: TaxonomyWithChildCount): TaxonomyDto {
    return {
      id: t.id,
      scope: t.scope,
      kind: t.kind,
      slug: t.slug,
      title: t.title,
      description: t.description,
      isTree: t.isTree,
      parentId: t.parentId,
      depth: t.depth,
      path: t.path ?? "",
      isHidden: t.isHidden,
      isSystem: t.isSystem,
      sortOrder: t.sortOrder,
      meta: t.meta,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      // used by gRPC/proto
      hasChildren: (t._childCount ?? 0) > 0,
    };
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  private async assertNoCycle(id: string, newParentId: string) {
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === id) {
        throw new BadRequestException("invalid_parent_cycle");
      }

      const node: { parentId: string | null } | null =
        await this.prisma.taxonomy.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });

      if (!node) break;
      currentId = node.parentId;
    }
  }

  // ---------------------------
  // List
  // ---------------------------
  async list(q: ListTaxonomiesQuery): Promise<TaxonomyListResponse> {
    const rawPage = Number(q.page ?? 0);
    const rawLimit = Number(q.limit ?? 0);

    const page = rawPage > 0 ? rawPage : 1;
    let limit = rawLimit > 0 ? rawLimit : 50;
    limit = Math.min(limit, 100);

    const scope = norm(q.scope);
    const kind = norm(q.kind);
    const parentId = normalizeOptionalId(q.parentId);
    const search = (q.q ?? "").trim();

    if (scope) assertSafe("scope", scope);
    if (kind) assertSafe("kind", kind);

    const where: Prisma.TaxonomyWhereInput = {
      scope: scope || undefined,
      kind: kind || undefined,
      parentId: parentId ?? undefined,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };

    // 1) Page results + total
    const [items, total] = await this.prisma.$transaction([
      this.prisma.taxonomy.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taxonomy.count({ where }),
    ]);

    // 2) Compute child counts for these specific items
    const ids = items.map((i) => i.id);
    const childCountByParentId = new Map<string, number>();

    if (ids.length > 0) {
      const grouped = await this.prisma.taxonomy.groupBy({
        by: ["parentId"],
        _count: { _all: true },
        where: {
          parentId: { in: ids },
        },
      });

      for (const group of grouped) {
        if (group.parentId) {
          childCountByParentId.set(group.parentId, group._count._all);
        }
      }
    }

    return {
      data: items.map((t) =>
        this.toDto({
          ...t,
          _childCount: childCountByParentId.get(t.id) ?? 0,
        }),
      ),
      page,
      limit,
      total,
    };
  }

  // ---------------------------
  // Get by ID
  // ---------------------------
  async get(id: string): Promise<TaxonomyResponse> {
    const cleanId = (id ?? "").trim();

    if (!cleanId) {
      throw new NotFoundException("taxonomy_not_found");
    }
    const [t, childCount] = await this.prisma.$transaction([
      this.prisma.taxonomy.findUnique({
        where: { id: cleanId },
      }),
      this.prisma.taxonomy.count({
        where: { parentId: cleanId },
      }),
    ]);

    if (!t) throw new NotFoundException("taxonomy_not_found");

    return {
      data: this.toDto({
        ...t,
        _childCount: childCount,
      }),
    };
  }

  // ---------------------------
  // Get by slug (scope + kind + slug)
  // ---------------------------
  async getBySlug(
    scopeRaw: string,
    kindRaw: string,
    slugRaw: string,
  ): Promise<TaxonomyResponse> {
    const scope = norm(scopeRaw);
    const kind = norm(kindRaw);
    const slug = norm(slugRaw);

    assertSafe("scope", scope);
    assertSafe("kind", kind);
    assertSafe("slug", slug);

    const t = await this.prisma.taxonomy.findFirst({
      where: { scope, kind, slug },
    });

    if (!t) throw new NotFoundException("taxonomy_not_found");
    return { data: this.toDto(t) };
  }

  // ---------------------------
  // Create
  // ---------------------------
  async create(input: CreateTaxonomyInput): Promise<TaxonomyResponse> {
    // normalize + validate
    const scope = norm(input.scope);
    const kind = norm(input.kind);
    const slug = norm(input.slug);
    const title = (input.title ?? "").trim();

    if (!scope || !kind || !slug) {
      throw new BadRequestException("scope_kind_slug_required");
    }

    assertSafe("scope", scope);
    assertSafe("kind", kind);
    assertSafe("slug", slug);
    if (!title) {
      throw new BadRequestException("title_required");
    }

    // IMPORTANT: never pass "" to UUID column
    const parentId: string | null = normalizeOptionalId(input.parentId);
    const isTree = input.isTree ?? !!parentId;

    let depth = 0;
    let path = slug;

    if (parentId) {
      const parent = await this.prisma.taxonomy.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException("taxonomy_parent_not_found");
      }

      if (parent.scope !== scope || parent.kind !== kind) {
        throw new BadRequestException("parent_scope_kind_mismatch");
      }

      depth = (parent.depth ?? 0) + 1;
      path = (parent.path ?? parent.slug) + "/" + slug;
    }

    try {
      const created = await this.prisma.taxonomy.create({
        data: {
          scope,
          kind,
          slug,
          title,
          description: input.description ?? null,
          isTree,
          parentId, // null or valid UUID, never ""
          depth,
          path,
          isHidden: input.isHidden ?? false,
          isSystem: input.isSystem ?? false,
          sortOrder: input.sortOrder ?? 0,
          meta: input.meta ?? Prisma.DbNull,
        },
      });

      return { data: this.toDto(created) };
    } catch (e: unknown) {
      const { code, meta } = prismaErrorDetails(e);

      this.log.error(`createTaxonomy failed: ${logValue(meta ?? e)}`);

      if (code === "P2002") {
        throw new BadRequestException("taxonomy_duplicate_slug");
      }

      throw e;
    }
  }

  // ---------------------------
  // Update
  // ---------------------------
  async update(
    id: string,
    patch: UpdateTaxonomyInput,
  ): Promise<TaxonomyResponse> {
    const current = await this.prisma.taxonomy.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("taxonomy_not_found");

    const scope = patch.scope ? norm(patch.scope) : current.scope;
    const kind = patch.kind ? norm(patch.kind) : current.kind;
    const slug = patch.slug ? norm(patch.slug) : current.slug;

    assertSafe("scope", scope);
    assertSafe("kind", kind);
    assertSafe("slug", slug);

    const title =
      patch.title !== undefined ? (patch.title ?? "").trim() : current.title;
    if (!title) {
      throw new BadRequestException("title_required");
    }

    // use normalizeOptionalId here as well so we never write ""
    let parentId: string | null;
    if (Object.prototype.hasOwnProperty.call(patch, "parentId")) {
      parentId = normalizeOptionalId(patch.parentId);
    } else {
      parentId = current.parentId;
    }

    const isTree =
      Object.prototype.hasOwnProperty.call(patch, "isTree") &&
      patch.isTree !== undefined
        ? patch.isTree
        : (current.isTree ?? !!parentId);

    let depth = current.depth ?? 0;
    let path = current.path ?? current.slug;

    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException("invalid_parent_self");
      }

      await this.assertNoCycle(id, parentId);

      const parent = await this.prisma.taxonomy.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new BadRequestException("invalid_parent_not_found");
      }

      if (parent.scope !== scope || parent.kind !== kind) {
        throw new BadRequestException("parent_scope_kind_mismatch");
      }

      depth = (parent.depth ?? 0) + 1;
      path = (parent.path ?? parent.slug) + "/" + slug;
    } else {
      depth = 0;
      path = slug;
    }

    try {
      const updated = await this.prisma.taxonomy.update({
        where: { id },
        data: {
          scope,
          kind,
          slug,
          title,
          description:
            patch.description !== undefined
              ? patch.description
              : current.description,
          isTree,
          parentId,
          depth,
          path,
          isHidden:
            patch.isHidden !== undefined ? patch.isHidden : current.isHidden,
          isSystem:
            patch.isSystem !== undefined ? patch.isSystem : current.isSystem,
          sortOrder:
            patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder,
          meta: Object.prototype.hasOwnProperty.call(patch, "meta")
            ? (patch.meta ?? Prisma.DbNull)
            : current.meta === null
              ? Prisma.DbNull
              : current.meta,
        },
      });

      return { data: this.toDto(updated) };
    } catch (e: unknown) {
      const { code, meta } = prismaErrorDetails(e);

      this.log.error(`updateTaxonomy failed id=${id}: ${logValue(meta ?? e)}`);

      if (code === "P2002") {
        throw new BadRequestException("taxonomy_duplicate_slug");
      }

      throw e;
    }
  }

  // ---------------------------
  // Delete
  // ---------------------------
  async delete(id: string): Promise<boolean> {
    const childCount = await this.prisma.taxonomy.count({
      where: { parentId: id },
    });

    const existing = await this.prisma.taxonomy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("taxonomy_not_found");

    // Global rule: system taxonomies cannot be deleted
    if (existing.isSystem) {
      throw new BadRequestException("system_taxonomy_cannot_be_deleted");
    }

    if (childCount > 0) {
      throw new BadRequestException("taxonomy_has_children");
    }

    try {
      await this.prisma.taxonomy.delete({ where: { id } });
      return true;
    } catch (e: unknown) {
      const { code } = prismaErrorDetails(e);

      if (code === "P2025") {
        throw new NotFoundException("taxonomy_not_found");
      }

      throw e;
    }
  }
}
