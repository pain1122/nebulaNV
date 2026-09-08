import { Body, Controller, Param, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  gatewayActionEnvelope,
  gatewayItemEnvelope,
} from "../contracts/api-envelope";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewaySettingsApiService } from "./gateway-settings-api.service";
import {
  GatewaySettingDeleteResultDto,
  GatewaySettingPathDto,
  GatewaySettingReadDto,
  GatewaySettingValueDto,
  GatewaySettingWriteRequestDto,
} from "./settings-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Settings")
@Controller()
export class GatewaySettingsController {
  constructor(private readonly settings: GatewaySettingsApiService) {}

  @GatewayApiRoute("settings.get", { responseType: GatewaySettingReadDto })
  async get(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewaySettingPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.settings.get(request, params.ns, params.key),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.settings.set", {
    requestType: GatewaySettingWriteRequestDto,
    responseType: GatewaySettingValueDto,
  })
  async set(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewaySettingPathDto,
    @Body() body: GatewaySettingWriteRequestDto,
  ) {
    return gatewayItemEnvelope(
      await this.settings.set(request, params.ns, params.key, body.value),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.settings.delete", {
    responseType: GatewaySettingDeleteResultDto,
  })
  async delete(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewaySettingPathDto,
  ) {
    return gatewayActionEnvelope(
      await this.settings.delete(request, params.ns, params.key),
      requestId(request),
    );
  }
}
