import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayActionEnvelope, gatewayCollectionEnvelope, gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import {
  GatewayBlogDeleteResultDto,
  GatewayBlogListQueryDto,
  GatewayBlogPatchDto,
  GatewayBlogPostDto,
  GatewayBlogSlugPathDto,
  GatewayBlogWriteDto,
} from "./blog-api.dto";
import { GatewayBlogApiService } from "./gateway-blog-api.service";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Blog")
@Controller()
export class GatewayBlogController {
  constructor(private readonly blog: GatewayBlogApiService) {}

  @GatewayApiRoute("blog.posts.list", { queryType: GatewayBlogListQueryDto, responseType: GatewayBlogPostDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayBlogListQueryDto) {
    const result = await this.blog.list(request, query);
    return gatewayCollectionEnvelope(result.data, {
      profile: "page-limit-total",
      page: result.page,
      limit: result.limit,
      total: result.total,
    }, requestId(request));
  }

  @GatewayApiRoute("blog.posts.get", { responseType: GatewayBlogPostDto })
  async get(@Req() request: GatewayHttpRequest, @Param() params: GatewayBlogSlugPathDto) {
    return gatewayItemEnvelope(await this.blog.get(request, params.slug), requestId(request));
  }

  @GatewayApiRoute("admin.blog.posts.create", { requestType: GatewayBlogWriteDto, responseType: GatewayBlogPostDto })
  async create(@Req() request: GatewayHttpRequest, @Body() body: GatewayBlogWriteDto) {
    return gatewayItemEnvelope(await this.blog.create(request, body), requestId(request));
  }

  @GatewayApiRoute("admin.blog.posts.update", { requestType: GatewayBlogPatchDto, responseType: GatewayBlogPostDto })
  async update(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayBlogPatchDto,
  ) {
    return gatewayItemEnvelope(await this.blog.update(request, params.id, body), requestId(request));
  }

  @GatewayApiRoute("admin.blog.posts.delete", { responseType: GatewayBlogDeleteResultDto })
  async delete(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayActionEnvelope(await this.blog.delete(request, params.id), requestId(request));
  }
}
