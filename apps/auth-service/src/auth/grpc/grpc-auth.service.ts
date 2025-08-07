import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { userv1 } from '@nebula/protos';
import { promisifyRpc } from '../../utils/rpc';

type UserServiceClient = userv1.UserServiceClient;
type GetUserRequest = userv1.GetUserRequest;
type FindUserRequest = userv1.FindUserRequest;
type UpdateProfileRequest = userv1.UpdateProfileRequest;
type CreateUserRequest = userv1.CreateUserRequest;
type FindUserWithHashRequest = userv1.FindUserWithHashRequest;
type SetRefreshTokenRequest = userv1.SetRefreshTokenRequest;
type UserResponse = userv1.UserResponse;
type FindUserWithHashResponse = userv1.FindUserWithHashResponse;

@Injectable()
export class GrpcAuthService implements OnModuleInit {
  private client!: UserServiceClient;
  constructor(@Inject('USER_SERVICE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.client = this.grpc.getService<UserServiceClient>('UserService');
  }

  private buildMeta(token = ''): Metadata {
    const md = new Metadata();
    if (token) md.set('authorization', `Bearer ${token}`);
    return md;
  }

  getUser(id: string, token?: string) {
    const req = userv1.GetUserRequest.create({ id });
    return promisifyRpc<GetUserRequest, UserResponse>(
      this.client.getUser.bind(this.client),
      this.buildMeta(token),
    )(req);
  }

  findUser(obj: FindUserRequest, token?: string) {
    // In case callers pass a plain object, normalize it here
    const req = userv1.FindUserRequest.create(obj as any);
    return promisifyRpc<FindUserRequest, UserResponse>(
      this.client.findUser.bind(this.client),
      this.buildMeta(token),
    )(req);
  }

  updateProfile(req: UpdateProfileRequest, token: string) {
    const msg = userv1.UpdateProfileRequest.create(req as any);
    return promisifyRpc<UpdateProfileRequest, UserResponse>(
      this.client.updateProfile.bind(this.client),
      this.buildMeta(token),
    )(msg);
  }

  createUser(req: CreateUserRequest) {
    const msg = userv1.CreateUserRequest.create(req as any);
    return promisifyRpc<CreateUserRequest, UserResponse>(
      this.client.createUser.bind(this.client),
      this.buildMeta(),
    )(msg);
  }

  findUserWithHash(req: FindUserWithHashRequest) {
    const msg = userv1.FindUserWithHashRequest.create(req as any);
    return promisifyRpc<FindUserWithHashRequest, FindUserWithHashResponse>(
      this.client.findUserWithHash.bind(this.client),
      this.buildMeta(),
    )(msg);
  }

  setRefreshToken(req: SetRefreshTokenRequest) {
    const msg = userv1.SetRefreshTokenRequest.create(req as any);
    return promisifyRpc<SetRefreshTokenRequest, UserResponse>(
      this.client.setRefreshToken.bind(this.client),
      this.buildMeta(),
    )(msg);
  }
}
