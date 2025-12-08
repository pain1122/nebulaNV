// apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts
import { Controller, Logger, UsePipes, ValidationPipe } from "@nestjs/common"
import { GrpcMethod } from "@nestjs/microservices"
import { Roles, Public } from "@nebula/grpc-auth"
import { blogv1 as blog } from "@nebula/protos"

import { TaxonomyService } from "../taxonomy.service"

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})

@Controller()
export class TaxonomyGrpcController {
  private readonly log = new Logger(TaxonomyGrpcController.name)

  constructor(private readonly svc: TaxonomyService) {}

  // -----------------------------
  // helper: map proxy DTO -> proto
  // -----------------------------
  private toProto(t: any): blog.BlogTaxonomy {
    return blog.BlogTaxonomy.create({
      id: t.id,
      scope: t.scope,
      kind: t.kind,
      slug: t.slug,
      title: t.title,
      description: t.description ?? "",
      parentId: t.parentId ?? "",
      path: t.path ?? "",
      isHidden: t.isHidden ?? false,
      isSystem: t.isSystem ?? false,
      sortOrder: t.sortOrder ?? 0,
      hasChildren:
        typeof t.hasChildren === "boolean" ? t.hasChildren : false,
      createdAt: (t.createdAt ?? "").toString(),
      updatedAt: (t.updatedAt ?? "").toString(),
    })
  }

  // -----------------------------
  // List (needs kind)
  // -----------------------------
  @Public()
  @UsePipes(Pipe)
  @GrpcMethod("BlogTaxonomyService", "List")
  async list(
    req: blog.ListBlogTaxonomiesRequest,
  ): Promise<blog.ListBlogTaxonomiesResponse> {
    const page = req.page || 1
    const limit = req.limit || 50

    const res = await this.svc.list(req.kind, {
      page,
      limit,
      q: req.q ?? "",
      parentId: req.parentId || undefined,
    })

    return blog.ListBlogTaxonomiesResponse.create({
      data: res.data.map((t: any) => this.toProto(t)),
      page: res.page,
      limit: res.limit,
      total: res.total,
    })
  }

  // -----------------------------
  // Get (by ID only)
  // -----------------------------
  @Public()
  @UsePipes(Pipe)
  @GrpcMethod("BlogTaxonomyService", "Get")
  async get(
    req: blog.GetBlogTaxonomyRequest,
  ): Promise<blog.BlogTaxonomyResponse> {
    const res = await this.svc.get(req.id)
    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(res.data),
    })
  }

  // -----------------------------
  // Create (needs kind)
  // -----------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogTaxonomyService", "Create")
  async create(
    req: blog.CreateBlogTaxonomyRequest,
  ): Promise<blog.BlogTaxonomyResponse> {
    const dto = {
      slug: req.slug,
      title: req.title,
      description: req.description ?? "",
      parentId: req.parentId || null,
      isHidden: req.isHidden,
      sortOrder: req.sortOrder,
    }

    const { data } = await this.svc.create(req.kind, dto as any)

    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(data),
    })
  }

  // -----------------------------
  // Update (by ID only)
  // -----------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogTaxonomyService", "Update")
  async update(
    req: blog.UpdateBlogTaxonomyRequest,
  ): Promise<blog.BlogTaxonomyResponse> {
    const patch = {
      slug: req.slug || undefined,
      title: req.title || undefined,
      description: req.description ?? undefined,
      parentId: req.parentId ?? undefined,
      isHidden:
        typeof req.isHidden === "boolean" ? req.isHidden : undefined,
      sortOrder:
        typeof req.sortOrder === "number" ? req.sortOrder : undefined,
    }

    const { data } = await this.svc.update(req.id, patch as any)

    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(data),
    })
  }

  // -----------------------------
  // Delete (by ID only)
  // -----------------------------
  @UsePipes(Pipe)
  @Roles("admin")
  @GrpcMethod("BlogTaxonomyService", "Delete")
  async delete(
    req: blog.DeleteBlogTaxonomyRequest,
  ): Promise<blog.DeleteBlogTaxonomyResponse> {
    const ok = await this.svc.remove(req.id)
    return blog.DeleteBlogTaxonomyResponse.create({ success: !!ok })
  }
}
