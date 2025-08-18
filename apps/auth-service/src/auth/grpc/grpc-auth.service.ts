import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
import { userv1 as user } from '@nebula/protos';

// Type aliases from your generated module
type GetUserRequest = user.GetUserRequest;
type FindUserRequest = user.FindUserRequest;
type UpdateProfileRequest = user.UpdateProfileRequest;
type CreateUserRequest = user.CreateUserRequest;
type FindUserWithHashRequest = user.FindUserWithHashRequest;
type SetRefreshTokenRequest = user.SetRefreshTokenRequest;

type UserResponse = user.UserResponse;
type FindUserWithHashResponse = user.FindUserWithHashResponse;

// Nest proxy interface (Observable-returning)
interface UserServiceProxy {
  createUser(req: CreateUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUserWithHash(req: FindUserWithHashRequest, md?: Metadata): import('rxjs').Observable<FindUserWithHashResponse>;
  updateProfile(req: UpdateProfileRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  getUser(req: GetUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUser(req: FindUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  setRefreshToken(req: SetRefreshTokenRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  getUserWithHash(req: user.GetUserWithHashRequest, md?: Metadata): import('rxjs').Observable<user.GetUserWithHashResponse>; // ← add this
}

@Injectable()
export class GrpcAuthService implements OnModuleInit {
  private svc!: UserServiceProxy;
  private userClient!: user.UserServiceClient;
  private readonly logger = new Logger(GrpcAuthService.name);

  constructor(@Inject('USER_SERVICE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.svc = this.grpc.getService<UserServiceProxy>('UserService');
    this.userClient = this.grpc.getService<user.UserServiceClient>('UserService');
    this.logger.log(
      `UserClient methods: ` +
        ['createUser','findUserWithHash','updateProfile','getUser','findUser','setRefreshToken','getUserWithHash']
          .map(m => `${m}=${typeof (this.svc as any)[m]}`)
          .join(', ')
    );
  }

  private md(token?: string): Metadata | undefined {
    if (!token) return undefined;
    const m = new Metadata();
    m.set('authorization', `Bearer ${token}`); // lowercase is conventional
    return m;
  }

  // ---- Helpers to await Observables with a deadline ----
  private async await$<T>(obs: import('rxjs').Observable<T>, label: string, ms = 5000): Promise<T> {
    console.time(label);
    try {
      return await firstValueFrom(obs.pipe(timeout(ms)));
    } finally {
      console.timeEnd(label);
    }
  }

  // ---------------- RPCs (Observable style) ----------------

  async createUser(req: CreateUserRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → createUser');
    const msg = user.CreateUserRequest.create(req as any);
    const md = this.md(); // none at register time
    const obs = md ? this.svc.createUser(msg, md) : this.svc.createUser(msg);
    return this.await$(obs, 'grpc.client::createUser');
  }

  async findUserWithHash(req: FindUserWithHashRequest): Promise<FindUserWithHashResponse> {
    this.logger.debug('gRPC → findUserWithHash');
    const msg = user.FindUserWithHashRequest.create(req as any);
    const md = this.md(); // likely none for login pre-JWT
    const obs = md ? this.svc.findUserWithHash(msg, md) : this.svc.findUserWithHash(msg);
    return this.await$(obs, 'grpc.client::findUserWithHash');
  }

  async updateProfile(req: UpdateProfileRequest, token: string): Promise<UserResponse> {
    this.logger.debug('gRPC → updateProfile');
    const msg = user.UpdateProfileRequest.create(req as any);
    const md = this.md(token); // required
    return this.await$(this.svc.updateProfile(msg, md), 'grpc.client::updateProfile');
  }

  async getUser(id: string, token?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → getUser');
    const msg: GetUserRequest = user.GetUserRequest.create({ id });
    const md = this.md(token);
    const obs = md ? this.svc.getUser(msg, md) : this.svc.getUser(msg);
    return this.await$(obs, 'grpc.client::getUser');
  }

  async findUser(obj: FindUserRequest, token?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → findUser');
    const msg = user.FindUserRequest.create(obj as any);
    const md = this.md(token);
    const obs = md ? this.svc.findUser(msg, md) : this.svc.findUser(msg);
    return this.await$(obs, 'grpc.client::findUser');
  }

  async setRefreshToken(req: SetRefreshTokenRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → setRefreshToken');
    const msg = user.SetRefreshTokenRequest.create(req as any);
    const md = this.md(); // none during issuance
    const obs = md ? this.svc.setRefreshToken(msg, md) : this.svc.setRefreshToken(msg);
    return this.await$(obs, 'grpc.client::setRefreshToken');
  }

  async getUserWithHash(req: user.GetUserWithHashRequest): Promise<user.GetUserWithHashResponse> {
    this.logger.debug('gRPC → getUserWithHash');
    const msg = user.GetUserWithHashRequest.create(req as any);
    const md = this.md();
    const obs = md ? this.svc.getUserWithHash(msg, md) : this.svc.getUserWithHash(msg);
    return this.await$(obs, 'grpc.client::getUserWithHash');
  }
}
