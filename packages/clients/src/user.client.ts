import type { ClientGrpc } from "@nestjs/microservices";
import { USER_SERVICE_TARGET } from "@nebula/grpc-auth";
import { userv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type Raw = {
  GetUser: RawGrpcUnary<userv1.GetUserRequest, userv1.UserResponse>;
  ListUsers: RawGrpcUnary<userv1.ListUsersRequest, userv1.ListUsersResponse>;
  UpdateProfile: RawGrpcUnary<userv1.UpdateProfileRequest, userv1.UserResponse>;
};

export interface UserProxy {
  GetUser: SignedGrpcUnary<userv1.GetUserRequest, userv1.UserResponse>;
  ListUsers: SignedGrpcUnary<userv1.ListUsersRequest, userv1.ListUsersResponse>;
  UpdateProfile: SignedGrpcUnary<
    userv1.UpdateProfileRequest,
    userv1.UserResponse
  >;
}

export function getUser(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): UserProxy {
  const raw = client.getService<Raw>("UserService");
  const common = { policy: signingPolicy, target: USER_SERVICE_TARGET };
  return {
    GetUser: createSignedGrpcUnary({
      ...common,
      method: raw.GetUser.bind(raw),
      definition: userv1.UserServiceService.getUser,
    }),
    ListUsers: createSignedGrpcUnary({
      ...common,
      method: raw.ListUsers.bind(raw),
      definition: userv1.UserServiceService.listUsers,
    }),
    UpdateProfile: createSignedGrpcUnary({
      ...common,
      method: raw.UpdateProfile.bind(raw),
      definition: userv1.UserServiceService.updateProfile,
    }),
  };
}
