import { Body, Controller, Param, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  gatewayCollectionEnvelope,
  gatewayItemEnvelope,
} from "../contracts/api-envelope";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayUserDto } from "../contracts/identity-api.dto";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayUserApiService } from "./gateway-user-api.service";
import {
  GatewayUserListItemDto,
  GatewayUserUpdateRequestDto,
} from "./user-api.dto";

function requestIdentity(request: GatewayHttpRequest): {
  requestId: string;
  userId: string;
} {
  const requestId = request.requestContext?.requestId;
  const userId = request.user?.userId;
  if (!requestId || !userId) {
    throw new Error("gateway_verified_actor_state_incomplete");
  }
  return { requestId, userId };
}

@ApiTags("Users")
@Controller()
export class GatewayUserController {
  constructor(private readonly users: GatewayUserApiService) {}

  @GatewayApiRoute("users.me.get", { responseType: GatewayUserDto })
  async getSelf(@Req() request: GatewayHttpRequest) {
    const identity = requestIdentity(request);
    return gatewayItemEnvelope(
      await this.users.get(request, identity.userId),
      identity.requestId,
    );
  }

  @GatewayApiRoute("users.me.update", {
    requestType: GatewayUserUpdateRequestDto,
    responseType: GatewayUserDto,
  })
  async updateSelf(
    @Req() request: GatewayHttpRequest,
    @Body() body: GatewayUserUpdateRequestDto,
  ) {
    const identity = requestIdentity(request);
    return gatewayItemEnvelope(
      await this.users.update(request, {
        id: identity.userId,
        email: body.email ?? "",
        newPassword: body.newPassword ?? "",
        currentPassword: body.currentPassword ?? "",
      }),
      identity.requestId,
    );
  }

  @GatewayApiRoute("admin.users.list", {
    responseType: GatewayUserListItemDto,
  })
  async list(@Req() request: GatewayHttpRequest) {
    const identity = requestIdentity(request);
    return gatewayCollectionEnvelope(
      await this.users.list(request),
      { profile: "unpaginated" },
      identity.requestId,
    );
  }

  @GatewayApiRoute("admin.users.get", { responseType: GatewayUserDto })
  async getById(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    const identity = requestIdentity(request);
    return gatewayItemEnvelope(
      await this.users.get(request, params.id),
      identity.requestId,
    );
  }
}
