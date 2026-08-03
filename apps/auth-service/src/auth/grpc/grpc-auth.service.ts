import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
import { userv1 as user } from '@nebula/protos';
import { USER_SERVICE_TARGET, authAndS2S } from '@nebula/grpc-auth';
import { safeErrorName } from '@packages/config';

// ----- Types -----
type GetUserRequest = user.GetUserRequest;
type FindUserRequest = user.FindUserRequest;
type UpdateProfileRequest = user.UpdateProfileRequest;
type CreateUserRequest = user.CreateUserRequest;
type FindUserWithHashRequest = user.FindUserWithHashRequest;

type UserResponse = user.UserResponse;
type FindUserWithHashResponse = user.FindUserWithHashResponse;

// NOTE: method names are camelCase (Nest gRPC client proxy maps from RPC names)
interface UserServiceProxy {
  createUser(
    req: CreateUserRequest,
    md?: Metadata,
  ): import('rxjs').Observable<UserResponse>;
  findUserWithHash(
    req: FindUserWithHashRequest,
    md?: Metadata,
  ): import('rxjs').Observable<FindUserWithHashResponse>;
  updateProfile(
    req: UpdateProfileRequest,
    md?: Metadata,
  ): import('rxjs').Observable<UserResponse>;
  getUser(
    req: GetUserRequest,
    md?: Metadata,
  ): import('rxjs').Observable<UserResponse>;
  findUser(
    req: FindUserRequest,
    md?: Metadata,
  ): import('rxjs').Observable<UserResponse>;
  getUserWithHash(
    req: user.GetUserWithHashRequest,
    md?: Metadata,
  ): import('rxjs').Observable<user.GetUserWithHashResponse>;
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
        'getUserWithHash',
      ].join(', ')}`,
    );
  }

  // ---- Helpers ----
  private async await$<T>(
    obs: import('rxjs').Observable<T>,
    label: string,
    ms = 12000,
  ): Promise<T> {
    const startedAt = performance.now();
    try {
      const result = await firstValueFrom(obs.pipe(timeout(ms)));
      this.logger.debug(
        `grpc_client_completed operation=${label} durationMs=${Math.max(0, Math.round(performance.now() - startedAt))}`,
      );
      return result;
    } catch (err: unknown) {
      this.logger.error(
        `grpc_client_failed operation=${label} durationMs=${Math.max(0, Math.round(performance.now() - startedAt))} cause=${safeErrorName(err)}`,
      );
      throw err;
    }
  }

  // ---------------- RPCs ----------------

  /** Registration path: verified auth-service caller plus signed request body. */
  async createUser(req: CreateUserRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → createUser');
    const msg = user.CreateUserRequest.create(req);
    const md = authAndS2S(undefined, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.createUser,
      request: msg,
    });
    return this.await$(this.svc.createUser(msg, md), 'grpc.client::createUser');
  }

  /** Login pre-JWT → S2S only (no user required) */
  async findUserWithHash(
    req: FindUserWithHashRequest,
  ): Promise<FindUserWithHashResponse> {
    this.logger.debug('gRPC → findUserWithHash');
    const msg = user.FindUserWithHashRequest.create(req);
    const md = authAndS2S(undefined, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.findUserWithHash,
      request: msg,
    });
    return this.await$(
      this.svc.findUserWithHash(msg, md),
      'grpc.client::findUserWithHash',
    );
  }

  /** Authenticated profile update: JWT actor plus verified S2S caller. */
  async updateProfile(
    req: UpdateProfileRequest,
    accessToken: string,
  ): Promise<UserResponse> {
    this.logger.debug('gRPC → updateProfile');
    const msg = user.UpdateProfileRequest.create(req);
    const md = authAndS2S(accessToken, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.updateProfile,
      request: msg,
    });
    return this.await$(
      this.svc.updateProfile(msg, md),
      'grpc.client::updateProfile',
    );
  }

  /** Read profile: JWT actor plus verified S2S caller. */
  async getUser(id: string, accessToken: string): Promise<UserResponse> {
    this.logger.debug('gRPC → getUser');
    const msg: GetUserRequest = user.GetUserRequest.create({ id });
    const md = authAndS2S(accessToken, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.getUser,
      request: msg,
    });
    this.logger.debug(`gRPC → getUser for ${id}`);
    return this.await$(this.svc.getUser(msg, md), 'grpc.client::getUser');
  }

  /** Admin lookup: JWT role is validated by user-service. */
  async findUser(
    obj: FindUserRequest,
    accessToken: string,
  ): Promise<UserResponse> {
    this.logger.debug('gRPC → findUser');
    const msg = user.FindUserRequest.create(obj);
    const md = authAndS2S(accessToken, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.findUser,
      request: msg,
    });
    return this.await$(this.svc.findUser(msg, md), 'grpc.client::findUser');
  }

  /** Refresh flow: auth-service-only method with a signed request body. */
  async getUserWithHash(
    req: user.GetUserWithHashRequest,
  ): Promise<user.GetUserWithHashResponse> {
    this.logger.debug('gRPC → getUserWithHash');
    const msg = user.GetUserWithHashRequest.create(req);
    const md = authAndS2S(undefined, {
      target: USER_SERVICE_TARGET,
      definition: user.UserServiceService.getUserWithHash,
      request: msg,
    });
    return this.await$(
      this.svc.getUserWithHash(msg, md),
      'grpc.client::getUserWithHash',
    );
  }
}
