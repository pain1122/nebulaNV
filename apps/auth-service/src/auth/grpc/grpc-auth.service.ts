import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import {
  UserServiceClient,
  GetUserRequest,
  FindUserRequest,
  UpdateProfileRequest,
  CreateUserRequest,
  FindUserWithHashRequest,
  SetRefreshTokenRequest,
  UserResponse,
  FindUserWithHashResponse,
} from '../../generated/user';
import { promisifyRpc } from '../../utils/rpc';

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
    return promisifyRpc<GetUserRequest, UserResponse>(
      this.client.getUser.bind(this.client),
      this.buildMeta(token),
    )({ id });
  }

  findUser(obj: FindUserRequest, token?: string) {
    return promisifyRpc<FindUserRequest, UserResponse>(
      this.client.findUser.bind(this.client),
      this.buildMeta(token),
    )(obj);
  }

  updateProfile(req: UpdateProfileRequest, token: string) {
    return promisifyRpc<UpdateProfileRequest, UserResponse>(
      this.client.updateProfile.bind(this.client),
      this.buildMeta(token),
    )(req);
  }

  createUser(req: CreateUserRequest) {
    return promisifyRpc<CreateUserRequest, UserResponse>(
      this.client.createUser.bind(this.client),
      this.buildMeta(),
    )(req);
  }

  findUserWithHash(req: FindUserWithHashRequest) {
    return promisifyRpc<FindUserWithHashRequest, FindUserWithHashResponse>(
      this.client.findUserWithHash.bind(this.client),
      this.buildMeta(),
    )(req);
  }

  setRefreshToken(req: SetRefreshTokenRequest) {
    return promisifyRpc<SetRefreshTokenRequest, UserResponse>(
      this.client.setRefreshToken.bind(this.client),
      this.buildMeta(),
    )(req);
  }
}
