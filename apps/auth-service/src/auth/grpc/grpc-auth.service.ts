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

// This is the *Nest proxy* interface shape: methods return Observables.
// (We don't rely on the ts-proto callback client here.)
interface UserServiceProxy {
  createUser(req: CreateUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUserWithHash(req: FindUserWithHashRequest, md?: Metadata): import('rxjs').Observable<FindUserWithHashResponse>;
  updateProfile(req: UpdateProfileRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  getUser(req: GetUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUser(req: FindUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  setRefreshToken(req: SetRefreshTokenRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
}

@Injectable()
export class GrpcAuthService implements OnModuleInit {
  private svc!: UserServiceProxy;
  private readonly logger = new Logger(GrpcAuthService.name);

  constructor(@Inject('USER_SERVICE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    // service name must match proto: "user.UserService" => "UserService" here
    this.svc = this.grpc.getService<UserServiceProxy>('UserService');
    this.logger.log(
      `UserClient methods: ` +
        ['createUser','findUserWithHash','updateProfile','getUser','findUser','setRefreshToken']
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
    return this.await$(this.svc.createUser(msg, this.md()), 'grpc.client::createUser');
  }

  async findUserWithHash(req: FindUserWithHashRequest): Promise<FindUserWithHashResponse> {
    this.logger.debug('gRPC → findUserWithHash');
    const msg = user.FindUserWithHashRequest.create(req as any);
    return this.await$(this.svc.findUserWithHash(msg, this.md()), 'grpc.client::findUserWithHash');
  }

  async updateProfile(req: UpdateProfileRequest, token: string): Promise<UserResponse> {
    this.logger.debug('gRPC → updateProfile');
    const msg = user.UpdateProfileRequest.create(req as any);
    return this.await$(this.svc.updateProfile(msg, this.md(token)), 'grpc.client::updateProfile');
  }

  async getUser(id: string, token?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → getUser');
    const msg: GetUserRequest = user.GetUserRequest.create({ id });
    return this.await$(this.svc.getUser(msg, this.md(token)), 'grpc.client::getUser');
  }

  async findUser(obj: FindUserRequest, token?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → findUser');
    const msg = user.FindUserRequest.create(obj as any);
    return this.await$(this.svc.findUser(msg, this.md(token)), 'grpc.client::findUser');
  }

  async setRefreshToken(req: SetRefreshTokenRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → setRefreshToken');
    const msg = user.SetRefreshTokenRequest.create(req as any);
    return this.await$(this.svc.setRefreshToken(msg, this.md()), 'grpc.client::setRefreshToken');
  }
}
