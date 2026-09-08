import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getSettings } from "@nebula/clients";
import {
  SETTINGS_SERVICE,
  SETTINGS_SERVICE_TARGET,
  wrapGrpc,
} from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import type {
  GatewaySettingDeleteResultDto,
  GatewaySettingReadDto,
  GatewaySettingValueDto,
} from "./settings-api.dto";

export const GATEWAY_SETTINGS_ENVIRONMENT = "default";

@Injectable()
export class GatewaySettingsApiService {
  constructor(@Inject(SETTINGS_SERVICE) private readonly client: ClientGrpc) {}

  private settings(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(
      request,
      SETTINGS_SERVICE_TARGET,
    );
    return {
      proxy: getSettings(this.client, downstream.signingPolicy),
      metadata: downstream.metadata,
    };
  }

  async get(
    request: GatewayHttpRequest,
    namespace: string,
    key: string,
  ): Promise<GatewaySettingReadDto> {
    const settings = this.settings(request);
    const result = await wrapGrpc(
      firstValueFrom(
        settings.proxy.GetString(
          { namespace, key, environment: GATEWAY_SETTINGS_ENVIRONMENT },
          settings.metadata,
        ),
      ),
    );
    if (typeof result.value !== "string" || typeof result.found !== "boolean") {
      throw new BadGatewayException("settings_read_response_invalid");
    }
    return Object.freeze({ value: result.value, found: result.found });
  }

  async set(
    request: GatewayHttpRequest,
    namespace: string,
    key: string,
    value: string,
  ): Promise<GatewaySettingValueDto> {
    const settings = this.settings(request);
    const result = await wrapGrpc(
      firstValueFrom(
        settings.proxy.SetString(
          {
            namespace,
            key,
            value,
            environment: GATEWAY_SETTINGS_ENVIRONMENT,
          },
          settings.metadata,
        ),
      ),
    );
    if (typeof result.value !== "string") {
      throw new BadGatewayException("settings_write_response_invalid");
    }
    return Object.freeze({ value: result.value });
  }

  async delete(
    request: GatewayHttpRequest,
    namespace: string,
    key: string,
  ): Promise<GatewaySettingDeleteResultDto> {
    const settings = this.settings(request);
    const result = await wrapGrpc(
      firstValueFrom(
        settings.proxy.DeleteString(
          { namespace, key, environment: GATEWAY_SETTINGS_ENVIRONMENT },
          settings.metadata,
        ),
      ),
    );
    if (typeof result.deleted !== "boolean") {
      throw new BadGatewayException("settings_delete_response_invalid");
    }
    return Object.freeze({ deleted: result.deleted });
  }
}
