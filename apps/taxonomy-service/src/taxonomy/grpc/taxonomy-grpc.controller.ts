import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { taxonomy } from "@nebula/protos";
import { TaxonomyService } from "../taxonomy.service";

@Controller()
export class TaxonomyGrpcController {
  constructor(private readonly svc: TaxonomyService) {}

  // ---------------------------------
  // Mapper: DTO -> proto Taxonomy
  // ---------------------------------
  private toProtoTaxonomy(t: any): taxonomy.Taxonomy {
    return taxonomy.Taxonomy.create({
      id:          t.id ?? "",
      scope:       t.scope ?? "",
      kind:        t.kind ?? "",
      slug:        t.slug ?? "",
      title:       t.title ?? "",
      description: t.description ?? "",
      isHidden:    t.isHidden ?? false,
      isSystem:    t.isSystem ?? false,
      sortOrder:   t.sortOrder ?? 0,

      // tree fields
      isTree:      t.isTree ?? false,
      parentId:    t.parentId ?? "",
      depth:       t.depth ?? 0,
      path:        t.path ?? "",
      hasChildren: t.hasChildren ?? false,

      createdAt:
        t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : t.createdAt
          ? new Date(t.createdAt).toISOString()
          : "",
      updatedAt:
        t.updatedAt instanceof Date
          ? t.updatedAt.toISOString()
          : t.updatedAt
          ? new Date(t.updatedAt).toISOString()
          : "",
    });
  }

  // ---------------------------------
  // ListTaxonomies
  // ---------------------------------
  @GrpcMethod("TaxonomyService", "ListTaxonomies")
  async list(
    req: taxonomy.ListTaxonomiesRequest,
  ): Promise<taxonomy.ListTaxonomiesResponse> {
    const res = await this.svc.list({
      scope: req.scope,
      kind:  req.kind,
      q:     req.q,
      page:  req.page,
      limit: req.limit,
    });

    return taxonomy.ListTaxonomiesResponse.create({
      data:  res.data.map((t: any) => this.toProtoTaxonomy(t)),
      page:  res.page,
      limit: res.limit,
      total: res.total,
    });
  }

  // ---------------------------------
  // GetTaxonomy
  // ---------------------------------
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
  @GrpcMethod("TaxonomyService", "GetBySlug")
  async getBySlug(
    req: taxonomy.GetBySlugRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.getBySlug(req.scope, req.kind, req.slug);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // CreateTaxonomy
  // ---------------------------------
  @GrpcMethod("TaxonomyService", "CreateTaxonomy")
  async create(
    req: taxonomy.CreateTaxonomyRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.create(req.data);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // UpdateTaxonomy
  // ---------------------------------
  @GrpcMethod("TaxonomyService", "UpdateTaxonomy")
  async update(
    req: taxonomy.UpdateTaxonomyRequest,
  ): Promise<taxonomy.TaxonomyResponse> {
    const res = await this.svc.update(req.id, req.patch);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(res.data),
    });
  }

  // ---------------------------------
  // DeleteTaxonomy
  // ---------------------------------
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
