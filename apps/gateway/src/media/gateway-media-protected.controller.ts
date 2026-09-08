import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayActionEnvelope, gatewayCollectionEnvelope, gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaApiService } from "./gateway-media-api.service";
import {
  GatewayMediaAdminListQueryDto,
  GatewayMediaDeleteResultDto,
  GatewayMediaDto,
  GatewayMediaFinalizeDto,
  GatewayMediaPresignDto,
  GatewayMediaPresignResultDto,
  GatewayMediaReadUrlQueryDto,
  GatewayMediaReadUrlResultDto,
} from "./media-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Media - Protected Library")
@Controller()
export class GatewayMediaProtectedController {
  constructor(private readonly media: GatewayMediaApiService) {}

  @GatewayApiRoute("admin.media.protected.list", { queryType: GatewayMediaAdminListQueryDto, responseType: GatewayMediaDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayMediaAdminListQueryDto) {
    return gatewayCollectionEnvelope(await this.media.list(request, "protected", query), {
      profile: "offset-take", skip: query.skip ?? 0, take: query.take ?? 50,
    }, requestId(request));
  }

  @GatewayApiRoute("admin.media.protected.presign", { requestType: GatewayMediaPresignDto, responseType: GatewayMediaPresignResultDto })
  async presign(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaPresignDto) {
    return gatewayActionEnvelope(await this.media.presign(request, "protected", body), requestId(request));
  }

  @GatewayApiRoute("admin.media.protected.finalize", { requestType: GatewayMediaFinalizeDto, responseType: GatewayMediaDto })
  async finalize(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaFinalizeDto) {
    return gatewayItemEnvelope(await this.media.finalize(request, "protected", body), requestId(request));
  }

  @GatewayApiRoute("admin.media.protected.read-url", { queryType: GatewayMediaReadUrlQueryDto, responseType: GatewayMediaReadUrlResultDto })
  async readUrl(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto, @Query() query: GatewayMediaReadUrlQueryDto) {
    return gatewayActionEnvelope(await this.media.readUrl(request, "protected", params.id, query.download ?? false), requestId(request));
  }

  @GatewayApiRoute("admin.media.protected.delete", { responseType: GatewayMediaDeleteResultDto })
  async delete(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayActionEnvelope(await this.media.deleteLane(request, "protected", params.id), requestId(request));
  }
}
