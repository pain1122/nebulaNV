import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getUser, type GrpcRequestInput } from "@nebula/clients";
import { userv1 } from "@nebula/protos";
import {
  USER_SERVICE,
  USER_SERVICE_TARGET,
  wrapGrpc,
} from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import {
  GATEWAY_ACTOR_ROLES,
  type GatewayActorRole,
} from "../application/application.contracts";
import type { GatewayUserDto } from "../contracts/identity-api.dto";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import type { GatewayUserListItemDto } from "./user-api.dto";

function userRole(value: string): GatewayActorRole {
  if (!(GATEWAY_ACTOR_ROLES as readonly string[]).includes(value)) {
    throw new BadGatewayException("user_response_role_invalid");
  }
  return value as GatewayActorRole;
}

function user(value: userv1.UserResponse): GatewayUserDto {
  if (!value.id || !value.email) {
    throw new BadGatewayException("user_response_invalid");
  }
  return Object.freeze({
    id: value.id,
    email: value.email,
    role: userRole(value.role),
  });
}

function userListItem(value: userv1.UserListItem): GatewayUserListItemDto {
  if (!value.id || !value.email || !value.createdAt) {
    throw new BadGatewayException("user_list_response_invalid");
  }
  const parsedDate = new Date(value.createdAt);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString() !== value.createdAt
  ) {
    throw new BadGatewayException("user_list_date_invalid");
  }
  return Object.freeze({
    id: value.id,
    email: value.email,
    ...(value.phone ? { phone: value.phone } : {}),
    role: userRole(value.role),
    createdAt: value.createdAt,
  });
}

@Injectable()
export class GatewayUserApiService {
  constructor(@Inject(USER_SERVICE) private readonly client: ClientGrpc) {}

  private users(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(
      request,
      USER_SERVICE_TARGET,
    );
    return {
      proxy: getUser(this.client, downstream.signingPolicy),
      metadata: downstream.metadata,
    };
  }

  async get(
    request: GatewayHttpRequest,
    id: string,
  ): Promise<GatewayUserDto> {
    const users = this.users(request);
    const result = user(
      await wrapGrpc(
        firstValueFrom(users.proxy.GetUser({ id }, users.metadata)),
      ),
    );
    if (result.id !== id) {
      throw new BadGatewayException("user_response_identity_mismatch");
    }
    return result;
  }

  async update(
    request: GatewayHttpRequest,
    input: GrpcRequestInput<userv1.UpdateProfileRequest>,
  ): Promise<GatewayUserDto> {
    const users = this.users(request);
    const result = user(
      await wrapGrpc(
        firstValueFrom(users.proxy.UpdateProfile(input, users.metadata)),
      ),
    );
    if (result.id !== input.id) {
      throw new BadGatewayException("user_response_identity_mismatch");
    }
    return result;
  }

  async list(
    request: GatewayHttpRequest,
  ): Promise<readonly GatewayUserListItemDto[]> {
    const users = this.users(request);
    const result = await wrapGrpc(
      firstValueFrom(users.proxy.ListUsers({}, users.metadata)),
    );
    return Object.freeze(result.users.map(userListItem));
  }
}
