import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayActionEnvelope, gatewayCollectionEnvelope, gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaApiService } from "./gateway-media-api.service";
import {
  GatewayMediaDeleteConfirmDto,
  GatewayMediaDeleteConfirmResultDto,
  GatewayMediaDeletePreviewDto,
  GatewayMediaDeletePreviewResultDto,
  GatewayMediaDto,
  GatewayMediaFinalizeDto,
  GatewayMediaListQueryDto,
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

@ApiTags("Media - Public Library")
@Controller()
export class GatewayMediaPublicController {
  constructor(private readonly media: GatewayMediaApiService) {}

  @GatewayApiRoute("admin.media.public.list", { queryType: GatewayMediaListQueryDto, responseType: GatewayMediaDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayMediaListQueryDto) {
    return gatewayCollectionEnvelope(await this.media.list(request, "public", query), {
      profile: "offset-take", skip: query.skip ?? 0, take: query.take ?? 50,
    }, requestId(request));
  }

  @GatewayApiRoute("admin.media.public.presign", { requestType: GatewayMediaPresignDto, responseType: GatewayMediaPresignResultDto })
  async presign(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaPresignDto) {
    return gatewayActionEnvelope(await this.media.presign(request, "public", body), requestId(request));
  }

  @GatewayApiRoute("admin.media.public.finalize", { requestType: GatewayMediaFinalizeDto, responseType: GatewayMediaDto })
  async finalize(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaFinalizeDto) {
    return gatewayItemEnvelope(await this.media.finalize(request, "public", body), requestId(request));
  }

  @GatewayApiRoute("admin.media.public.read-url", { queryType: GatewayMediaReadUrlQueryDto, responseType: GatewayMediaReadUrlResultDto })
  async readUrl(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Query() query: GatewayMediaReadUrlQueryDto,
  ) {
    return gatewayActionEnvelope(await this.media.readUrl(request, "public", params.id, query.download ?? false), requestId(request));
  }

  @GatewayApiRoute("admin.media.public.delete-preview", { requestType: GatewayMediaDeletePreviewDto, responseType: GatewayMediaDeletePreviewResultDto })
  async previewDelete(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaDeletePreviewDto) {
    return gatewayActionEnvelope(await this.media.previewPublicDelete(request, body), requestId(request));
  }

  @GatewayApiRoute("admin.media.public.delete-confirm", { requestType: GatewayMediaDeleteConfirmDto, responseType: GatewayMediaDeleteConfirmResultDto })
  async confirmDelete(@Req() request: GatewayHttpRequest, @Body() body: GatewayMediaDeleteConfirmDto) {
    return gatewayActionEnvelope(await this.media.confirmPublicDelete(request, body), requestId(request));
  }
}
