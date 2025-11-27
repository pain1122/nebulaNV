import { Controller, UsePipes, ValidationPipe } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { taxonomy } from "@nebula/protos";
import { TaxonomyService } from "../taxonomy.service";

const Pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
export class TaxonomyGrpcController {
  constructor(private readonly svc: TaxonomyService) {}

  // ---------------------------------
  // Mapper: Prisma Taxonomy -> proto Taxonomy
  // ---------------------------------
  private toProtoTaxonomy(t: any): taxonomy.Taxonomy {
    return taxonomy.Taxonomy.create({
      id:          t.id,
      scope:       t.scope,
      kind:        t.kind,
      slug:        t.slug,
      title:       t.title,
      description: t.description ?? "",
      isHidden:    t.isHidden ?? false,
      isSystem:    t.isSystem ?? false,
      sortOrder:   t.sortOrder ?? 0,
      createdAt:   t.createdAt ? new Date(t.createdAt).toISOString() : "",
      updatedAt:   t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
    });
  }

  // ---------------------------------
  // ListTaxonomies
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "ListTaxonomies")
  async list(req: taxonomy.ListTaxonomiesRequest) {
    const res = await this.svc.list(req);

    return taxonomy.ListTaxonomiesResponse.create({
      data: res.data.map((t: any) => this.toProtoTaxonomy(t)),
      page: res.page,
      limit: res.limit,
      total: res.total,
    });
  }

  // ---------------------------------
  // GetTaxonomy
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "GetTaxonomy")
  async get(req: taxonomy.GetTaxonomyRequest) {
    const t = await this.svc.get(req.id);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(t),
    });
  }

  // ---------------------------------
  // GetBySlug
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "GetBySlug")
  async getBySlug(req: taxonomy.GetBySlugRequest) {
    const t = await this.svc.getBySlug(req.scope, req.kind, req.slug);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(t),
    });
  }

  // ---------------------------------
  // CreateTaxonomy
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "CreateTaxonomy")
  async create(req: taxonomy.CreateTaxonomyRequest) {
    const t = await this.svc.create(req.data);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(t),
    });
  }

  // ---------------------------------
  // UpdateTaxonomy
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "UpdateTaxonomy")
  async update(req: taxonomy.UpdateTaxonomyRequest) {
    const t = await this.svc.update(req.id, req.patch);

    return taxonomy.TaxonomyResponse.create({
      data: this.toProtoTaxonomy(t),
    });
  }

  // ---------------------------------
  // DeleteTaxonomy
  // ---------------------------------
  @UsePipes(Pipe)
  @GrpcMethod("TaxonomyService", "DeleteTaxonomy")
  async del(req: taxonomy.DeleteTaxonomyRequest) {
    await this.svc.delete(req.id);

    return taxonomy.BasicResponse.create({
      success: true,
    });
  }
}
