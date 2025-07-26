import { Injectable, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import {
  UserServiceClient,
  GetUserRequest,
  FindUserRequest,
  UpdateProfileRequest,
  UserResponse,
} from './user-service-client.interface';

@Injectable()
export class GrpcAuthService {
  private client!: UserServiceClient;

  constructor(@Inject('USER_SERVICE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    // initialize the typed Observable client
    this.client = this.grpc.getService<UserServiceClient>('UserService');
  }

  /** Build metadata carrying the Bearer token */
  private buildMeta(token: string): Metadata {
    const meta = new Metadata();
    meta.set('authorization', `Bearer ${token}`);
    return meta;
  }

  /** fetch user by ID, forwarding JWT metadata */
  getUser(id: string, token: string): Promise<UserResponse> {
    const req: GetUserRequest = { id };
    return firstValueFrom(this.client.GetUser(req, this.buildMeta(token)));
  }

  /** find user by email or phone */
  findUser(obj: FindUserRequest, token: string): Promise<UserResponse> {
    return firstValueFrom(this.client.FindUser(obj, this.buildMeta(token)));
  }

  /** update profile, forwarding JWT metadata */
  updateProfile(req: UpdateProfileRequest, token: string): Promise<UserResponse> {
    return firstValueFrom(this.client.UpdateProfile(req, this.buildMeta(token)));
  }
}