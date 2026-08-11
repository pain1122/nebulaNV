import type { ClientGrpc } from "@nestjs/microservices";
import { AUTH_SERVICE_TARGET } from "@nebula/grpc-auth";
import { authv1, userv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type Raw = {
  Register: RawGrpcUnary<authv1.RegisterRequest, authv1.RegisterResponse>;
  ValidateUser: RawGrpcUnary<
    authv1.ValidateUserRequest,
    authv1.ValidateUserResponse
  >;
  GetTokens: RawGrpcUnary<authv1.GetTokensRequest, authv1.GetTokensResponse>;
  RefreshTokens: RawGrpcUnary<
    authv1.RefreshTokensRequest,
    authv1.GetTokensResponse
  >;
  Logout: RawGrpcUnary<authv1.LogoutRequest, authv1.LogoutResponse>;
  ValidateToken: RawGrpcUnary<
    authv1.ValidateTokenRequest,
    authv1.ValidateTokenResponse
  >;
  GetProfile: RawGrpcUnary<authv1.GetProfileRequest, userv1.UserResponse>;
};

export interface AuthProxy {
  Register: SignedGrpcUnary<authv1.RegisterRequest, authv1.RegisterResponse>;
  ValidateUser: SignedGrpcUnary<
    authv1.ValidateUserRequest,
    authv1.ValidateUserResponse
  >;
  GetTokens: SignedGrpcUnary<authv1.GetTokensRequest, authv1.GetTokensResponse>;
  RefreshTokens: SignedGrpcUnary<
    authv1.RefreshTokensRequest,
    authv1.GetTokensResponse
  >;
  Logout: SignedGrpcUnary<authv1.LogoutRequest, authv1.LogoutResponse>;
  ValidateToken: SignedGrpcUnary<
    authv1.ValidateTokenRequest,
    authv1.ValidateTokenResponse
  >;
  GetProfile: SignedGrpcUnary<authv1.GetProfileRequest, userv1.UserResponse>;
}

export function getAuth(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): AuthProxy {
  const raw = client.getService<Raw>("AuthService");
  const common = { policy: signingPolicy, target: AUTH_SERVICE_TARGET };
  return {
    Register: createSignedGrpcUnary({
      ...common,
      method: raw.Register.bind(raw),
      definition: authv1.AuthServiceService.register,
    }),
    ValidateUser: createSignedGrpcUnary({
      ...common,
      method: raw.ValidateUser.bind(raw),
      definition: authv1.AuthServiceService.validateUser,
    }),
    GetTokens: createSignedGrpcUnary({
      ...common,
      method: raw.GetTokens.bind(raw),
      definition: authv1.AuthServiceService.getTokens,
    }),
    RefreshTokens: createSignedGrpcUnary({
      ...common,
      method: raw.RefreshTokens.bind(raw),
      definition: authv1.AuthServiceService.refreshTokens,
    }),
    Logout: createSignedGrpcUnary({
      ...common,
      method: raw.Logout.bind(raw),
      definition: authv1.AuthServiceService.logout,
    }),
    ValidateToken: createSignedGrpcUnary({
      ...common,
      method: raw.ValidateToken.bind(raw),
      definition: authv1.AuthServiceService.validateToken,
    }),
    GetProfile: createSignedGrpcUnary({
      ...common,
      method: raw.GetProfile.bind(raw),
      definition: authv1.AuthServiceService.getProfile,
    }),
  };
}
