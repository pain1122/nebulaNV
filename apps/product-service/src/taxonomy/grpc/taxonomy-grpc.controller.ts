// apps/product-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts
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
import { productv1 as product } from "@nebula/protos";
import { type TaxonomyDto } from "@nebula/clients";
import { TaxonomyService } from "../taxonomy.service";
import { CreateTaxonomyDto, UpdateTaxonomyDto } from "../dto/taxonomy.dto";

type ProductTaxonomyRecord = TaxonomyDto & {
  hasChildren?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const toDateString = (value: string | Date | undefined): string => {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
};

type GrpcCall<TRequest> = ServerUnaryCall<TRequest, unknown> &
  RpcContextWithContext;

@Controller()
export class TaxonomyGrpcController {
  private readonly log = new Logger(TaxonomyGrpcController.name);

  constructor(private readonly svc: TaxonomyService) {}

  // -----------------------------
  // helper: map proxy DTO -> proto
  // -----------------------------
  private toProto(t: ProductTaxonomyRecord): product.ProductTaxonomy {
    return product.ProductTaxonomy.create({
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
      createdAt: toDateString(t.createdAt),
      updatedAt: toDateString(t.updatedAt),
    });
  }

  // -----------------------------
  // List (needs kind)
  // -----------------------------
  @Public()
  @GrpcMethod("ProductTaxonomyService", "List")
  async list(
    req: product.ListProductTaxonomiesRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<product.ListProductTaxonomiesRequest>,
  ): Promise<product.ListProductTaxonomiesResponse> {
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

    return product.ListProductTaxonomiesResponse.create({
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
  @GrpcMethod("ProductTaxonomyService", "Get")
  async get(
    req: product.GetProductTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<product.GetProductTaxonomyRequest>,
  ): Promise<product.ProductTaxonomyResponse> {
    const res = await this.svc.get(
      req.id,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
    return product.ProductTaxonomyResponse.create({
      data: this.toProto(res.data),
    });
  }

  // -----------------------------
  // Create (needs kind)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("ProductTaxonomyService", "CreateV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductTaxonomyService", "Create")
  async create(
    req: product.CreateProductTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<product.CreateProductTaxonomyRequest>,
  ): Promise<product.ProductTaxonomyResponse> {
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

    return product.ProductTaxonomyResponse.create({
      data: this.toProto(data),
    });
  }

  // -----------------------------
  // Update (by ID only)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("ProductTaxonomyService", "UpdateV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductTaxonomyService", "Update")
  async update(
    req: product.UpdateProductTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<product.UpdateProductTaxonomyRequest>,
  ): Promise<product.ProductTaxonomyResponse> {
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

    return product.ProductTaxonomyResponse.create({
      data: this.toProto(data),
    });
  }

  // -----------------------------
  // Delete (by ID only)
  // -----------------------------
  @DormantS2SAuthorizationV3Receiver("ProductTaxonomyService", "DeleteV3")
  @Roles("admin", "root-admin")
  @GrpcMethod("ProductTaxonomyService", "Delete")
  async delete(
    req: product.DeleteProductTaxonomyRequest,
    metadata: MetadataWithContext,
    call: GrpcCall<product.DeleteProductTaxonomyRequest>,
  ): Promise<product.DeleteProductTaxonomyResponse> {
    const ok = await this.svc.remove(
      req.id,
      createVerifiedServiceDownstreamContext(metadata, call),
    );
    return product.DeleteProductTaxonomyResponse.create({ success: !!ok });
  }
}
