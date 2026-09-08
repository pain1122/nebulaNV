import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getBlogTaxonomy, getProductTaxonomy, type GrpcRequestInput } from "@nebula/clients";
import { blogv1, productv1 } from "@nebula/protos";
import { BLOG_SERVICE, BLOG_SERVICE_TARGET, PRODUCT_SERVICE, PRODUCT_SERVICE_TARGET, wrapGrpc } from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import type {
  GatewayTaxonomyDeleteResultDto,
  GatewayTaxonomyDto,
  GatewayTaxonomyListQueryDto,
  GatewayTaxonomyPatchDto,
  GatewayTaxonomyWriteDto,
} from "./taxonomy-api.dto";

export type GatewayTaxonomyDomain = "product" | "blog";
type TaxonomyRecord = productv1.ProductTaxonomy | blogv1.BlogTaxonomy;
type ProductPatchInput = GrpcRequestInput<productv1.UpdateProductTaxonomyRequest>;
type BlogPatchInput = GrpcRequestInput<blogv1.UpdateBlogTaxonomyRequest>;

function taxonomy(value: TaxonomyRecord | undefined, domain: GatewayTaxonomyDomain): GatewayTaxonomyDto {
  if (!value?.id || !value.kind || !value.slug || !value.title || value.scope !== domain || !Number.isInteger(value.sortOrder)) {
    throw new BadGatewayException("taxonomy_response_invalid");
  }
  return Object.freeze({
    id: value.id,
    scope: domain,
    kind: value.kind,
    slug: value.slug,
    title: value.title,
    description: value.description,
    parentId: value.parentId,
    path: value.path,
    isHidden: value.isHidden,
    isSystem: value.isSystem,
    sortOrder: value.sortOrder,
    hasChildren: value.hasChildren,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

function pagination(page: number, limit: number, total: number): void {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(total) || total < 0) {
    throw new BadGatewayException("taxonomy_list_pagination_invalid");
  }
}

function patch(input: GatewayTaxonomyPatchDto): Omit<ProductPatchInput, "id"> & Omit<BlogPatchInput, "id"> {
  const output: Record<string, unknown> = {};
  for (const field of ["slug", "title", "description", "parentId", "isHidden", "sortOrder"] as const) {
    if (input[field] !== undefined) output[field] = input[field];
  }
  return output as Omit<ProductPatchInput, "id"> & Omit<BlogPatchInput, "id">;
}

@Injectable()
export class GatewayTaxonomyApiService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientGrpc,
    @Inject(BLOG_SERVICE) private readonly blogClient: ClientGrpc,
  ) {}

  async list(request: GatewayHttpRequest, domain: GatewayTaxonomyDomain, query: GatewayTaxonomyListQueryDto) {
    const input = {
      kind: query.kind,
      page: query.page ?? 0,
      limit: query.limit ?? 0,
      q: query.q ?? "",
      parentId: query.parentId ?? "",
    };
    const result = domain === "product"
      ? await this.productList(request, input)
      : await this.blogList(request, input);
    pagination(result.page, result.limit, result.total);
    return Object.freeze({
      data: Object.freeze(result.data.map((value) => taxonomy(value, domain))),
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  }

  private async productList(request: GatewayHttpRequest, input: GrpcRequestInput<productv1.ListProductTaxonomiesRequest>) {
    const downstream = createGatewayDownstreamContext(request, PRODUCT_SERVICE_TARGET);
    return wrapGrpc(firstValueFrom(getProductTaxonomy(this.productClient, downstream.signingPolicy).List(input, downstream.metadata)));
  }

  private async blogList(request: GatewayHttpRequest, input: GrpcRequestInput<blogv1.ListBlogTaxonomiesRequest>) {
    const downstream = createGatewayDownstreamContext(request, BLOG_SERVICE_TARGET);
    return wrapGrpc(firstValueFrom(getBlogTaxonomy(this.blogClient, downstream.signingPolicy).List(input, downstream.metadata)));
  }

  async get(request: GatewayHttpRequest, domain: GatewayTaxonomyDomain, id: string) {
    const downstream = createGatewayDownstreamContext(request, domain === "product" ? PRODUCT_SERVICE_TARGET : BLOG_SERVICE_TARGET);
    const result = domain === "product"
      ? await wrapGrpc(firstValueFrom(getProductTaxonomy(this.productClient, downstream.signingPolicy).Get({ id }, downstream.metadata)))
      : await wrapGrpc(firstValueFrom(getBlogTaxonomy(this.blogClient, downstream.signingPolicy).Get({ id }, downstream.metadata)));
    const mapped = taxonomy(result.data, domain);
    if (mapped.id !== id) throw new BadGatewayException("taxonomy_response_identity_mismatch");
    return mapped;
  }

  async create(request: GatewayHttpRequest, domain: GatewayTaxonomyDomain, input: GatewayTaxonomyWriteDto) {
    const body = {
      kind: input.kind,
      slug: input.slug,
      title: input.title,
      description: input.description ?? "",
      parentId: input.parentId ?? "",
      isHidden: input.isHidden ?? false,
      sortOrder: input.sortOrder ?? 0,
    };
    const downstream = createGatewayDownstreamContext(request, domain === "product" ? PRODUCT_SERVICE_TARGET : BLOG_SERVICE_TARGET);
    const result = domain === "product"
      ? await wrapGrpc(firstValueFrom(getProductTaxonomy(this.productClient, downstream.signingPolicy).Create(body, downstream.metadata)))
      : await wrapGrpc(firstValueFrom(getBlogTaxonomy(this.blogClient, downstream.signingPolicy).Create(body, downstream.metadata)));
    return taxonomy(result.data, domain);
  }

  async update(request: GatewayHttpRequest, domain: GatewayTaxonomyDomain, id: string, input: GatewayTaxonomyPatchDto) {
    const body = { id, ...patch(input) };
    const downstream = createGatewayDownstreamContext(request, domain === "product" ? PRODUCT_SERVICE_TARGET : BLOG_SERVICE_TARGET);
    const result = domain === "product"
      ? await wrapGrpc(firstValueFrom(getProductTaxonomy(this.productClient, downstream.signingPolicy).Update(body as ProductPatchInput, downstream.metadata)))
      : await wrapGrpc(firstValueFrom(getBlogTaxonomy(this.blogClient, downstream.signingPolicy).Update(body as BlogPatchInput, downstream.metadata)));
    const mapped = taxonomy(result.data, domain);
    if (mapped.id !== id) throw new BadGatewayException("taxonomy_response_identity_mismatch");
    return mapped;
  }

  async delete(request: GatewayHttpRequest, domain: GatewayTaxonomyDomain, id: string): Promise<GatewayTaxonomyDeleteResultDto> {
    const downstream = createGatewayDownstreamContext(request, domain === "product" ? PRODUCT_SERVICE_TARGET : BLOG_SERVICE_TARGET);
    const result = domain === "product"
      ? await wrapGrpc(firstValueFrom(getProductTaxonomy(this.productClient, downstream.signingPolicy).Delete({ id }, downstream.metadata)))
      : await wrapGrpc(firstValueFrom(getBlogTaxonomy(this.blogClient, downstream.signingPolicy).Delete({ id }, downstream.metadata)));
    if (typeof result.success !== "boolean") throw new BadGatewayException("taxonomy_delete_response_invalid");
    return Object.freeze({ success: result.success });
  }
}
