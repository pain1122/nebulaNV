import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayActionEnvelope, gatewayCollectionEnvelope, gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayTaxonomyApiService } from "./gateway-taxonomy-api.service";
import {
  GatewayTaxonomyDeleteResultDto,
  GatewayTaxonomyDto,
  GatewayTaxonomyListQueryDto,
  GatewayTaxonomyPatchDto,
  GatewayTaxonomyWriteDto,
} from "./taxonomy-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Product Taxonomy")
@Controller()
export class GatewayProductTaxonomyController {
  constructor(private readonly taxonomy: GatewayTaxonomyApiService) {}

  @GatewayApiRoute("product.taxonomies.list", { queryType: GatewayTaxonomyListQueryDto, responseType: GatewayTaxonomyDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayTaxonomyListQueryDto) {
    const result = await this.taxonomy.list(request, "product", query);
    return gatewayCollectionEnvelope(result.data, {
      profile: "page-limit-total",
      page: result.page,
      limit: result.limit,
      total: result.total,
    }, requestId(request));
  }

  @GatewayApiRoute("product.taxonomies.get", { responseType: GatewayTaxonomyDto })
  async get(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayItemEnvelope(await this.taxonomy.get(request, "product", params.id), requestId(request));
  }

  @GatewayApiRoute("admin.product.taxonomies.create", { requestType: GatewayTaxonomyWriteDto, responseType: GatewayTaxonomyDto })
  async create(@Req() request: GatewayHttpRequest, @Body() body: GatewayTaxonomyWriteDto) {
    return gatewayItemEnvelope(await this.taxonomy.create(request, "product", body), requestId(request));
  }

  @GatewayApiRoute("admin.product.taxonomies.update", { requestType: GatewayTaxonomyPatchDto, responseType: GatewayTaxonomyDto })
  async update(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayTaxonomyPatchDto,
  ) {
    return gatewayItemEnvelope(await this.taxonomy.update(request, "product", params.id, body), requestId(request));
  }

  @GatewayApiRoute("admin.product.taxonomies.delete", { responseType: GatewayTaxonomyDeleteResultDto })
  async delete(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayActionEnvelope(await this.taxonomy.delete(request, "product", params.id), requestId(request));
  }
}
