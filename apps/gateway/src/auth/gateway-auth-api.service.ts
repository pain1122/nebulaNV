import {
  BadGatewayException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getAuth, type GrpcRequestInput } from "@nebula/clients";
import { authv1, userv1 } from "@nebula/protos";
import {
  AUTH_SERVICE,
  AUTH_SERVICE_TARGET,
  wrapGrpc,
} from "@nebula/grpc-auth";
import { firstValueFrom } from "rxjs";
import {
  GATEWAY_ACTOR_ROLES,
  type GatewayActorRole,
} from "../application/application.contracts";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import type { GatewayUserDto } from "../contracts/identity-api.dto";
import type {
  GatewayAuthLogoutResultDto,
  GatewayAuthTokenDto,
} from "./auth-api.dto";

function authRole(value: string): GatewayActorRole {
  if (!(GATEWAY_ACTOR_ROLES as readonly string[]).includes(value)) {
    throw new BadGatewayException("auth_response_role_invalid");
  }
  return value as GatewayActorRole;
}

function authUser(
  value: authv1.RegisterResponse | userv1.UserResponse,
): GatewayUserDto {
  if (!value.id || !value.email) {
    throw new BadGatewayException("auth_response_user_invalid");
  }
  return Object.freeze({
    id: value.id,
    email: value.email,
    role: authRole(value.role),
  });
}

function authTokens(value: authv1.GetTokensResponse): GatewayAuthTokenDto & {
  refreshToken: string;
} {
  if (
    !value.accessToken ||
    !value.refreshToken ||
    !Number.isInteger(value.accessExpiresInSeconds) ||
    value.accessExpiresInSeconds < 1 ||
    !Number.isInteger(value.refreshExpiresInSeconds) ||
    value.refreshExpiresInSeconds < 1
  ) {
    throw new BadGatewayException("auth_response_tokens_invalid");
  }
  return Object.freeze({
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    accessExpiresInSeconds: value.accessExpiresInSeconds,
    refreshExpiresInSeconds: value.refreshExpiresInSeconds,
  });
}

@Injectable()
export class GatewayAuthApiService {
  constructor(@Inject(AUTH_SERVICE) private readonly client: ClientGrpc) {}

  private auth(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(
      request,
      AUTH_SERVICE_TARGET,
    );
    return {
      proxy: getAuth(this.client, downstream.signingPolicy),
      metadata: downstream.metadata,
    };
  }

  async register(
    request: GatewayHttpRequest,
    input: GrpcRequestInput<authv1.RegisterRequest>,
  ): Promise<GatewayUserDto> {
    const auth = this.auth(request);
    return authUser(
      await wrapGrpc(
        firstValueFrom(auth.proxy.Register(input, auth.metadata)),
      ),
    );
  }

  async login(
    request: GatewayHttpRequest,
    input: GrpcRequestInput<authv1.ValidateUserRequest>,
  ): Promise<GatewayAuthTokenDto & { refreshToken: string }> {
    const auth = this.auth(request);
    const validation = await wrapGrpc(
      firstValueFrom(auth.proxy.ValidateUser(input, auth.metadata)),
    );
    if (!validation.isValid) {
      throw new UnauthorizedException("invalid_credentials");
    }
    if (!validation.userId) {
      throw new BadGatewayException("auth_response_user_id_invalid");
    }
    return authTokens(
      await wrapGrpc(
        firstValueFrom(
          auth.proxy.GetTokens({ userId: validation.userId }, auth.metadata),
        ),
      ),
    );
  }

  async refresh(
    request: GatewayHttpRequest,
    refreshToken: string,
  ): Promise<GatewayAuthTokenDto & { refreshToken: string }> {
    const auth = this.auth(request);
    return authTokens(
      await wrapGrpc(
        firstValueFrom(
          auth.proxy.RefreshTokens({ refreshToken }, auth.metadata),
        ),
      ),
    );
  }

  async logout(
    request: GatewayHttpRequest,
    input: GrpcRequestInput<authv1.LogoutRequest>,
  ): Promise<GatewayAuthLogoutResultDto> {
    const auth = this.auth(request);
    const result = await wrapGrpc(
      firstValueFrom(auth.proxy.Logout(input, auth.metadata)),
    );
    if (!result.success) throw new BadGatewayException("auth_logout_failed");
    return Object.freeze({ success: true });
  }

  async profile(
    request: GatewayHttpRequest,
    userId: string,
  ): Promise<GatewayUserDto> {
    const auth = this.auth(request);
    const result = authUser(
      await wrapGrpc(
        firstValueFrom(auth.proxy.GetProfile({ userId }, auth.metadata)),
      ),
    );
    if (result.id !== userId) {
      throw new BadGatewayException("auth_profile_actor_mismatch");
    }
    return result;
  }
}
