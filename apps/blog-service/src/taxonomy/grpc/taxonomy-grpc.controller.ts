// apps/blog-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts
import { Controller, Logger } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import type { ServerUnaryCall } from "@grpc/grpc-js";
import {
  createVerifiedServiceDownstreamContext,
  DormantS2SAuthorizationV3Receiver,
  Roles,
  Public,
  type MetadataWithContext,
  type RpcContextWithContext,
} from "@nebula/grpc-auth";
import { blogv1 as blog } from "@nebula/protos";

import { TaxonomyService } from "../taxonomy.service";
import { CreateTaxonomyDto, UpdateTaxonomyDto } from "../dto/taxonomy.dto";
import { type BlogTaxonomyRecord, dateishToString } from "../taxonomy.types";

type GrpcCall<TRequest> = ServerUnaryCall<TRequest, unknown> &
  RpcContextWithContext;

@Controller()
export class TaxonomyGrpcController {
  private readonly log = new Logger(TaxonomyGrpcController.name);

  constructor(private readonly svc: TaxonomyService) {}

  // -----------------------------
  // helper: map proxy DTO -> proto
  // -----------------------------
  private toProto(t: BlogTaxonomyRecord): blog.BlogTaxonomy {
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
      hasChildren: typeof t.hasChildren === "boolean" ? t.hasChildren : false,
      createdAt: dateishToString(t.createdAt),
      updatedAt: dateishToString(t.updatedAt),
    });
  }

  // -----------------------------
  // List (needs kind)
  // -----------------------------
  @Public()
  @GrpcMethod("BlogTaxonomyService", "List")
  async list(
    req: blog.ListBlogTaxonomiesRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<blog.ListBlogTaxonomiesRequest>,
  ): Promise<blog.ListBlogTaxonomiesResponse> {
    const page = req.page || 1;
    const limit = req.limit || 50;

    const res = await this.svc.list(
      req.kind,
      {
        page,
        limit,
        q: req.q ?? "",
        parentId: req.parentId || undefined,
      },
      createVerifiedServiceDownstreamContext(metadata, call),
    );

    return blog.ListBlogTaxonomiesResponse.create({
      data: res.data.map((t) => this.toProto(t)),
      page: res.page,
      limit: res.limit,
      total: res.total,
    });
  }

  // -----------------------------
  // Get (by ID only)
  // -----------------------------
  @Public()
  @GrpcMethod("BlogTaxonomyService", "Get")
  async get(
    req: blog.GetBlogTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<blog.GetBlogTaxonomyRequest>,
  ): Promise<blog.BlogTaxonomyResponse> {
    const res = await this.svc.get(
      req.id,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(res.data),
    });
  }

  // -----------------------------
  // Create (needs kind)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("BlogTaxonomyService", "CreateV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("BlogTaxonomyService", "Create")
  async create(
    req: blog.CreateBlogTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<blog.CreateBlogTaxonomyRequest>,
  ): Promise<blog.BlogTaxonomyResponse> {
    const dto: CreateTaxonomyDto = {
      slug: req.slug,
      title: req.title,
      description: req.description ?? "",
      parentId: req.parentId || null,
      isHidden: req.isHidden,
      sortOrder: req.sortOrder,
    };

    const { data } = await this.svc.create(
      req.kind,
      dto,
      createVerifiedServiceDownstreamContext(metadata, call),
    );

    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(data),
    });
  }

  // -----------------------------
  // Update (by ID only)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("BlogTaxonomyService", "UpdateV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("BlogTaxonomyService", "Update")
  async update(
    req: blog.UpdateBlogTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<blog.UpdateBlogTaxonomyRequest>,
  ): Promise<blog.BlogTaxonomyResponse> {
    const patch: UpdateTaxonomyDto = {
      slug: req.slug || undefined,
      title: req.title || undefined,
      description: req.description ?? undefined,
      parentId: req.parentId ?? undefined,
      isHidden: typeof req.isHidden === "boolean" ? req.isHidden : undefined,
      sortOrder: typeof req.sortOrder === "number" ? req.sortOrder : undefined,
    };

    const { data } = await this.svc.update(
      req.id,
      patch,
      createVerifiedServiceDownstreamContext(metadata, call),
    );

    return blog.BlogTaxonomyResponse.create({
      data: this.toProto(data),
    });
  }

  // -----------------------------
  // Delete (by ID only)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("BlogTaxonomyService", "DeleteV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("BlogTaxonomyService", "Delete")
  async delete(
    req: blog.DeleteBlogTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<blog.DeleteBlogTaxonomyRequest>,
  ): Promise<blog.DeleteBlogTaxonomyResponse> {
    const ok = await this.svc.remove(
      req.id,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
    return blog.DeleteBlogTaxonomyResponse.create({ success: !!ok });
  }
}
