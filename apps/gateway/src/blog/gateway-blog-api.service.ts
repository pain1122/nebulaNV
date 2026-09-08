import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getBlog, type GrpcRequestInput } from "@nebula/clients";
import { blogv1 } from "@nebula/protos";
import { BLOG_SERVICE, BLOG_SERVICE_TARGET, wrapGrpc } from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import {
  GatewayBlogPostStatus,
  type GatewayBlogDeleteResultDto,
  type GatewayBlogListQueryDto,
  type GatewayBlogPatchDto,
  type GatewayBlogPostDto,
  type GatewayBlogWriteDto,
} from "./blog-api.dto";

type BlogPatchInput = GrpcRequestInput<blogv1.PostPatch>;

function status(value: string): GatewayBlogPostStatus {
  if (!Object.values(GatewayBlogPostStatus).includes(value as GatewayBlogPostStatus)) {
    throw new BadGatewayException("blog_response_status_invalid");
  }
  return value as GatewayBlogPostStatus;
}

function post(value: blogv1.Post | undefined): GatewayBlogPostDto {
  if (!value?.id || !value.slug || !value.title || !Array.isArray(value.tags) || !Array.isArray(value.categories)) {
    throw new BadGatewayException("blog_response_invalid");
  }
  return Object.freeze({
    id: value.id,
    slug: value.slug,
    title: value.title,
    body: value.body,
    excerpt: value.excerpt,
    coverImageUrl: value.coverImageUrl,
    status: status(value.status),
    tags: Object.freeze([...value.tags]),
    categories: Object.freeze([...value.categories]),
    metaTitle: value.metaTitle,
    metaDescription: value.metaDescription,
    metaKeywords: value.metaKeywords,
    publishedAt: value.publishedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  });
}

function publicPosts(values: readonly blogv1.Post[]): readonly GatewayBlogPostDto[] {
  const mapped = values.map(post);
  if (mapped.some((value) => value.status !== GatewayBlogPostStatus.PUBLISHED)) {
    throw new BadGatewayException("blog_public_visibility_violation");
  }
  return Object.freeze(mapped);
}

const PATCH_FIELDS = Object.freeze([
  "title", "body", "excerpt", "coverImageUrl", "status", "tags", "categories",
  "metaTitle", "metaDescription", "metaKeywords",
] as const);

function sparsePatch(input: GatewayBlogPatchDto): BlogPatchInput {
  const patch: Partial<BlogPatchInput> = {};
  for (const field of PATCH_FIELDS) {
    const value = input[field];
    if (value !== undefined) Object.assign(patch, { [field]: value });
  }
  return patch as BlogPatchInput;
}

@Injectable()
export class GatewayBlogApiService {
  constructor(@Inject(BLOG_SERVICE) private readonly client: ClientGrpc) {}

  private blog(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(request, BLOG_SERVICE_TARGET);
    return { proxy: getBlog(this.client, downstream.signingPolicy), metadata: downstream.metadata };
  }

  async list(request: GatewayHttpRequest, query: GatewayBlogListQueryDto) {
    const blog = this.blog(request);
    const result = await wrapGrpc(firstValueFrom(blog.proxy.ListPosts({
      q: query.q ?? "",
      tag: query.tag ?? "",
      category: query.category ?? "",
      page: query.page ?? 0,
      limit: query.limit ?? 0,
    }, blog.metadata)));
    if (!Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.limit) || result.limit < 1 || !Number.isInteger(result.total) || result.total < 0) {
      throw new BadGatewayException("blog_list_pagination_invalid");
    }
    return Object.freeze({ data: publicPosts(result.data), page: result.page, limit: result.limit, total: result.total });
  }

  async get(request: GatewayHttpRequest, slug: string) {
    const blog = this.blog(request);
    const mapped = post((await wrapGrpc(firstValueFrom(blog.proxy.GetPost({ slug }, blog.metadata)))).data);
    if (mapped.slug !== slug) throw new BadGatewayException("blog_response_slug_mismatch");
    if (mapped.status !== GatewayBlogPostStatus.PUBLISHED) {
      throw new BadGatewayException("blog_public_visibility_violation");
    }
    return mapped;
  }

  async create(request: GatewayHttpRequest, input: GatewayBlogWriteDto) {
    const blog = this.blog(request);
    const data: GrpcRequestInput<blogv1.PostInput> = {
      title: input.title,
      slug: input.slug ?? "",
      body: input.body,
      excerpt: input.excerpt ?? "",
      coverImageUrl: input.coverImageUrl ?? "",
      status: input.status ?? "",
      tags: input.tags ?? [],
      categories: input.categories ?? [],
      metaTitle: input.metaTitle ?? "",
      metaDescription: input.metaDescription ?? "",
      metaKeywords: input.metaKeywords ?? "",
    };
    return post((await wrapGrpc(firstValueFrom(blog.proxy.CreatePost({ data }, blog.metadata)))).data);
  }

  async update(request: GatewayHttpRequest, id: string, input: GatewayBlogPatchDto) {
    const blog = this.blog(request);
    const mapped = post((await wrapGrpc(firstValueFrom(blog.proxy.UpdatePost({ id, patch: sparsePatch(input) }, blog.metadata)))).data);
    if (mapped.id !== id) throw new BadGatewayException("blog_response_identity_mismatch");
    return mapped;
  }

  async delete(request: GatewayHttpRequest, id: string): Promise<GatewayBlogDeleteResultDto> {
    const blog = this.blog(request);
    const result = await wrapGrpc(firstValueFrom(blog.proxy.DeletePost({ id }, blog.metadata)));
    if (typeof result.success !== "boolean") throw new BadGatewayException("blog_delete_response_invalid");
    return Object.freeze({ success: result.success });
  }
}
