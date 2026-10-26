import { Body, Controller, Param, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaApiService } from "./gateway-media-api.service";
import { GatewayMediaMetadataDto } from "./media-metadata-api.dto";
import { GatewayMediaDto } from "./media-api.dto";
import {
  GatewayImageDerivativesDto,
  GatewayImageRegenerationDto,
} from "./media-derivatives-api.dto";

@ApiTags("Media - Administration")
@Controller()
export class GatewayMediaAdminController {
  constructor(private readonly media: GatewayMediaApiService) {}

  @GatewayApiRoute("admin.media.derivatives.get", {
    responseType: GatewayImageDerivativesDto,
  })
  async derivatives(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    const requestId = request.requestContext?.requestId;
    if (!requestId) throw new Error("gateway_request_context_missing");
    return gatewayItemEnvelope(
      await this.media.getDerivatives(request, params.id),
      requestId,
    );
  }

  @GatewayApiRoute("admin.media.derivatives.regenerate", {
    responseType: GatewayImageDerivativesDto,
    requestType: GatewayImageRegenerationDto,
  })
  async regenerate(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayImageRegenerationDto,
  ) {
    const requestId = request.requestContext?.requestId;
    if (!requestId) throw new Error("gateway_request_context_missing");
    return gatewayItemEnvelope(
      await this.media.regenerateDerivatives(request, params.id, body),
      requestId,
    );
  }

  @GatewayApiRoute("admin.media.metadata.update", {
    responseType: GatewayMediaDto,
    requestType: GatewayMediaMetadataDto,
  })
  async updateMetadata(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() input: GatewayMediaMetadataDto,
  ) {
    const requestId = request.requestContext?.requestId;
    if (!requestId) throw new Error("gateway_request_context_missing");
    return gatewayItemEnvelope(
      await this.media.updateMetadata(request, params.id, input),
      requestId,
    );
  }

  @GatewayApiRoute("admin.media.get", { responseType: GatewayMediaDto })
  async get(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    const requestId = request.requestContext?.requestId;
    if (!requestId) throw new Error("gateway_request_context_missing");
    return gatewayItemEnvelope(
      await this.media.get(request, params.id),
      requestId,
    );
  }
}
