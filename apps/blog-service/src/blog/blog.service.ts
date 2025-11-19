import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreatePostDto, UpdatePostDto, ListPostsQueryDto, BlogPostStatusDto } from "./dto/post.dto";
import { Prisma } from "../../prisma/generated"

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

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUniqueSlug(base: string): Promise<string> {
    const baseSlug = basicSlugify(base);
    let slug = baseSlug;
    let n = 1;

    // loop until we find a free slug
    // status filter is NOT needed here: slug is unique across all posts
    // (including ARCHIVED / DRAFT)
    while (await this.prisma.blogPost.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    return slug;
  }

  private toDto(p: any) {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      body: p.body,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      status: p.status,
      tags: p.tags ?? [],
      categories: p.categories ?? [],
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      metaKeywords: p.metaKeywords,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async list(q: ListPostsQueryDto) {
    const where: Prisma.BlogPostWhereInput = {
      status: "PUBLISHED",
      title: q.q ? { contains: q.q, mode: "insensitive" } : undefined,
      tags: q.tag ? { has: q.tag } : undefined,
      categories: q.category ? { has: q.category } : undefined,
    };

    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: items.map((p) => this.toDto(p)),
      page,
      limit,
      total,
    };
  }

  async getBySlug(slug: string) {
    const p = await this.prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
    if (!p) throw new NotFoundException("post_not_found");
    return { data: this.toDto(p) };
  }

  async create(input: CreatePostDto) {
    const slug = await this.ensureUniqueSlug(input.slug ?? input.title);
    const data = await this.prisma.blogPost.create({
      data: {
        slug,
        title: input.title,
        body: input.body,
        excerpt: input.excerpt ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        status: (input.status as any) ?? "DRAFT",
        tags: input.tags ?? [],
        categories: input.categories ?? [],
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        metaKeywords: input.metaKeywords ?? null,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      },
    });
    return { data: this.toDto(data) };
  }

  async update(id: string, patch: UpdatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("post_not_found");

    const status = (patch.status as any) ?? existing.status;
    const publishedAt =
      status === "PUBLISHED"
        ? existing.publishedAt ?? new Date()
        : status === "DRAFT"
        ? null
        : existing.publishedAt;

    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        title: patch.title ?? existing.title,
        body: patch.body ?? existing.body,
        excerpt: patch.excerpt ?? existing.excerpt,
        coverImageUrl: patch.coverImageUrl ?? existing.coverImageUrl,
        status,
        tags: patch.tags ?? existing.tags,
        categories: patch.categories ?? existing.categories,
        metaTitle: patch.metaTitle ?? existing.metaTitle,
        metaDescription: patch.metaDescription ?? existing.metaDescription,
        metaKeywords: patch.metaKeywords ?? existing.metaKeywords,
        publishedAt,
      },
    });

    return { data: this.toDto(updated) };
  }

  async softDelete(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("post_not_found");
    await this.prisma.blogPost.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return { success: true };
  }
}
