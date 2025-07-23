import { Injectable, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import {
  UserServiceClient,
  UserResponse,
  UpdateProfileRequest,
} from '../user-service-client.interface';

@Injectable()
export class GrpcAuthService {
  private clientStub!: UserServiceClient;

  constructor(@Inject('USER_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.clientStub = this.client.getService<UserServiceClient>('UserService');
  }

  private buildMeta(token: string) {
    const m = new Metadata();
    m.add('Authorization', `Bearer ${token}`);
    return m;
  }

  getUser(id: string, token: string): Promise<UserResponse> {
    return firstValueFrom(
      this.clientStub.GetUser({ id }, this.buildMeta(token)),
    );
  }

  updateProfile(
    req: UpdateProfileRequest,
    token: string,
  ): Promise<UserResponse> {
    return firstValueFrom(
      this.clientStub.UpdateProfile(req, this.buildMeta(token)),
    );
  }
}
