import { Controller, Param, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayMediaApiService } from "./gateway-media-api.service";
import { GatewayMediaDto } from "./media-api.dto";

@ApiTags("Media - Administration")
@Controller()
export class GatewayMediaAdminController {
  constructor(private readonly media: GatewayMediaApiService) {}

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
