import { Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayActionEnvelope, gatewayCollectionEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaApiService } from "./gateway-media-api.service";
import {
  GatewayMediaDto,
  GatewayMediaListQueryDto,
  GatewayMediaOwnedReadUrlQueryDto,
  GatewayMediaReadUrlResultDto,
} from "./media-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Media - My Protected Library")
@Controller()
export class GatewayMediaOwnedController {
  constructor(private readonly media: GatewayMediaApiService) {}

  @GatewayApiRoute("media.owned.list", { queryType: GatewayMediaListQueryDto, responseType: GatewayMediaDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayMediaListQueryDto) {
    return gatewayCollectionEnvelope(await this.media.listOwned(request, query), {
      profile: "offset-take", skip: query.skip ?? 0, take: query.take ?? 50,
    }, requestId(request));
  }

  @GatewayApiRoute("media.owned.read-url", { queryType: GatewayMediaOwnedReadUrlQueryDto, responseType: GatewayMediaReadUrlResultDto })
  async readUrl(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Query() query: GatewayMediaOwnedReadUrlQueryDto,
  ) {
    return gatewayActionEnvelope(await this.media.readOwnedUrl(request, params.id, query), requestId(request));
  }
}
