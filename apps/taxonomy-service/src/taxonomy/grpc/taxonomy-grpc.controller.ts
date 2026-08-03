import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { Metadata, status } from "@grpc/grpc-js";
import { taxonomy } from "@nebula/protos";
import {
  AllowedS2SCallers,
  getContextService,
  InternalOnly,
  Public,
  Roles,
  toRpc,
  type RpcContextWithContext,
} from "@nebula/grpc-auth";
import { TaxonomyService, type TaxonomyDto } from "../taxonomy.service";

const SYSTEM_TAXONOMY_SCOPE_BY_CALLER = {
  "product-service": "product",
  "blog-service": "blog",
} as const;

@Controller()
export class TaxonomyGrpcController {
  constructor(private readonly svc: TaxonomyService) {}

  // ---------------------------------
  // Mapper: DTO -> proto Taxonomy
  // ---------------------------------
  private toProtoTaxonomy(t: TaxonomyDto): taxonomy.Taxonomy {
    return taxonomy.Taxonomy.create({
      id: t.id ?? "",
      scope: t.scope ?? "",
      kind: t.kind ?? "",
      slug: t.slug ?? "",
      title: t.title ?? "",
      description: t.description ?? "",
      isHidden: t.isHidden ?? false,
      isSystem: t.isSystem ?? false,
      sortOrder: t.sortOrder ?? 0,

      // tree fields
      isTree: t.isTree ?? false,
      parentId: t.parentId ?? "",
      depth: t.depth ?? 0,
      path: t.path ?? "",
      hasChildren: t.hasChildren ?? false,

      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    });
  }

  // ---------------------------------
  // ListTaxonomies
  // ---------------------------------
  @Public()
  @GrpcMethod("TaxonomyService", "ListTaxonomies")
  async list(
    req: taxonomy.ListTaxonomiesRequest,
  ): Promise<taxonomy.ListTaxonomiesResponse> {
    const page = req.page > 0 ? req.page : 1;
    const limit = req.limit > 0 ? req.limit : 50;

    const res = await this.svc.list({
      scope: req.scope,
      kind: req.kind,
      q: req.q,
      page,
      limit,
    });

    return taxonomy.ListTaxonomiesResponse.create({
      data: res.data.map((t) => this.toProtoTaxonomy(t)),
      page: res.page,
      limit: res.limit,
      total: res.total,
    });
  }

  // ---------------------------------
  // GetTaxonomy
  // ---------------------------------
  @Public()
  @GrpcMethod("TaxonomyService", "GetTaxonomy")
  async get(
    req: taxonomy.GetTaxonomyRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.get(req.id);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // GetBySlug
  // ---------------------------------
  @Public()
  @GrpcMethod("TaxonomyService", "GetBySlug")
  async getBySlug(
    req: taxonomy.GetBySlugRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.getBySlug(req.scope, req.kind, req.slug);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("product-service", "blog-service")
  @GrpcMethod("TaxonomyService", "EnsureSystemTaxonomy")
  async ensureSystemTaxonomy(
    req: taxonomy.EnsureSystemTaxonomyRequest,
    _meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<taxonomy.TaxonomyResponse> {
    const caller = getContextService(call);
    if (!caller) {
      throw toRpc(status.UNAUTHENTICATED, "Missing service context");
    }

    const expectedScope =
      SYSTEM_TAXONOMY_SCOPE_BY_CALLER[
        caller as keyof typeof SYSTEM_TAXONOMY_SCOPE_BY_CALLER
      ];
    const scope = req.scope.trim().toLowerCase();
    const kind = req.kind.trim().toLowerCase();
    const slug = req.slug.trim().toLowerCase();
    const title = req.title.trim();

    if (!expectedScope || scope !== expectedScope) {
      throw toRpc(status.PERMISSION_DENIED, "Taxonomy scope not allowed");
    }
    if (kind !== "category.default" || slug !== "uncategorized" || !title) {
      throw toRpc(status.INVALID_ARGUMENT, "Invalid system taxonomy");
    }

    const res = await this.svc.ensureSystemTaxonomy({
      scope,
      kind,
      slug,
      title,
      description: req.description,
    });

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // CreateTaxonomy
  // ---------------------------------
  @Roles("admin", "root-admin")
  @GrpcMethod("TaxonomyService", "CreateTaxonomy")
  async create(
    req: taxonomy.CreateTaxonomyRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.create(
      req.data ?? taxonomy.TaxonomyInput.create(),
    );

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // UpdateTaxonomy
  // ---------------------------------
  @Roles("admin", "root-admin")
  @GrpcMethod("TaxonomyService", "UpdateTaxonomy")
  async update(
    req: taxonomy.UpdateTaxonomyRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.update(
      req.id,
      req.patch ?? taxonomy.TaxonomyInput.create(),
    );
    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // DeleteTaxonomy
  // ---------------------------------
  @Roles("admin", "root-admin")
  @GrpcMethod("TaxonomyService", "DeleteTaxonomy")
  async del(
    req: taxonomy.DeleteTaxonomyRequest,
  ): Promise<taxonomy.BasicResponse> {
    await this.svc.delete(req.id);

    return taxonomy.BasicResponse.create({
      success: true,
    });
  }
}
