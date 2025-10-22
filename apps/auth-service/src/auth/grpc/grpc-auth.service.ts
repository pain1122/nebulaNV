import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
import { userv1 as user } from '@nebula/protos';
import { authAndS2S } from '@nebula/grpc-auth';

// ----- Types -----
type GetUserRequest = user.GetUserRequest;
type FindUserRequest = user.FindUserRequest;
type UpdateProfileRequest = user.UpdateProfileRequest;
type CreateUserRequest = user.CreateUserRequest;
type FindUserWithHashRequest = user.FindUserWithHashRequest;
type SetRefreshTokenRequest = user.SetRefreshTokenRequest;

type UserResponse = user.UserResponse;
type FindUserWithHashResponse = user.FindUserWithHashResponse;

// NOTE: method names are camelCase (Nest gRPC client proxy maps from RPC names)
interface UserServiceProxy {
  createUser(req: CreateUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUserWithHash(req: FindUserWithHashRequest, md?: Metadata): import('rxjs').Observable<FindUserWithHashResponse>;
  updateProfile(req: UpdateProfileRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  getUser(req: GetUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  findUser(req: FindUserRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  setRefreshToken(req: SetRefreshTokenRequest, md?: Metadata): import('rxjs').Observable<UserResponse>;
  getUserWithHash(req: user.GetUserWithHashRequest, md?: Metadata): import('rxjs').Observable<user.GetUserWithHashResponse>;
}

@Injectable()
export class GrpcAuthService implements OnModuleInit {
  private svc!: UserServiceProxy;
  private readonly logger = new Logger(GrpcAuthService.name);

  constructor(@Inject('USER_SERVICE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.svc = this.grpc.getService<UserServiceProxy>('UserService');
    this.logger.log(
      `UserClient ready: ${[
        'createUser',
        'findUserWithHash',
        'updateProfile',
        'getUser',
        'findUser',
        'setRefreshToken',
        'getUserWithHash',
      ].join(', ')}`,
    );
  }

  // ---- Helpers ----
  private async await$<T>(obs: import('rxjs').Observable<T>, label: string, ms = 12000): Promise<T> {
    console.time(label);
    try {
      return await firstValueFrom(obs.pipe(timeout(ms)));
    } catch (err: any) {
      this.logger.error(`[${label}] gRPC error ${err?.code ?? '?'}: ${err?.message}`);
      throw err;
    } finally {
      console.timeEnd(label);
    }
  }

  // ---------------- RPCs ----------------

  /** Registration path → internal-only & @RequireUserId; use a sentinel user id */
  async createUser(req: CreateUserRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → createUser');
    const msg = user.CreateUserRequest.create(req as any);
    // satisfy @RequireUserId without a JWT during signup
    const md  = authAndS2S(undefined, { userId: 'self-register' });
    return this.await$(this.svc.createUser(msg, md), 'grpc.client::createUser');
  }

  /** Login pre-JWT → S2S only (no user required) */
  async findUserWithHash(req: FindUserWithHashRequest): Promise<FindUserWithHashResponse> {
    this.logger.debug('gRPC → findUserWithHash');
    const msg = user.FindUserWithHashRequest.create(req as any);
    const md  = authAndS2S(); // S2S signature only
    return this.await$(this.svc.findUserWithHash(msg, md), 'grpc.client::findUserWithHash');
  }

  /** Authenticated profile update → JWT + S2S + x-user-id (owner/admin id) */
  async updateProfile(req: UpdateProfileRequest, accessToken: string): Promise<UserResponse> {
    this.logger.debug('gRPC → updateProfile');
    const msg = user.UpdateProfileRequest.create(req as any);
    const md  = authAndS2S(accessToken, { userId: req.id });
    return this.await$(this.svc.updateProfile(msg, md), 'grpc.client::updateProfile');
  }

  /** Read profile → JWT + S2S + x-user-id (initiator: owner/admin) */
  async getUser(id: string, accessToken: string, initiatorId?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → getUser');
    const msg: GetUserRequest = user.GetUserRequest.create({ id });
    const md  = authAndS2S(accessToken, { userId: initiatorId ?? id });
    return this.await$(this.svc.getUser(msg, md), 'grpc.client::getUser');
  }

  /** Admin lookups → JWT + S2S + x-user-id (admin id) */
  async findUser(obj: FindUserRequest, accessToken: string, adminId: string): Promise<UserResponse> {
    this.logger.debug('gRPC → findUser');
    const msg = user.FindUserRequest.create(obj as any);
    const md  = authAndS2S(accessToken, { userId: adminId });
    return this.await$(this.svc.findUser(msg, md), 'grpc.client::findUser');
  }

  /** Token rotation → internal-only + @RequireUserId */
  async setRefreshToken(req: SetRefreshTokenRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → setRefreshToken');
    const msg = user.SetRefreshTokenRequest.create(req as any);
    const md  = authAndS2S(undefined, { userId: req.userId });
    return this.await$(this.svc.setRefreshToken(msg, md), 'grpc.client::setRefreshToken');
  }

  /** Refresh flow → internal-only + @RequireUserId (subject id) */
  async getUserWithHash(req: user.GetUserWithHashRequest, initiatorId?: string): Promise<user.GetUserWithHashResponse> {
    this.logger.debug('gRPC → getUserWithHash');
    const msg = user.GetUserWithHashRequest.create(req as any);
    const md  = authAndS2S(undefined, { userId: initiatorId ?? req.id });
    return this.await$(this.svc.getUserWithHash(msg, md), 'grpc.client::getUserWithHash');
  }
}
