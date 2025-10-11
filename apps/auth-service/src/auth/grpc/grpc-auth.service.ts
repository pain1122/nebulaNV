import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
import { userv1 as user } from '@nebula/protos';

import {
  bearer,
} from '@nebula/grpc-auth'; // packages/grpc-auth/src/metadata.ts

import {
  buildS2SMetadata,
} from '@nebula/grpc-auth'; // packages/grpc-auth/src/s2s.ts

import {
  X_USER_ID_HEADER,
} from '@nebula/grpc-auth'; // packages/grpc-auth/src/tokens.ts

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
      ].join(', ')}`
    );
  }

  /** Merge Bearer + S2S + x-user-id (as available) */
  private composeMd(opts?: { token?: string; userId?: string | null }): Metadata | undefined {
    const parts: Metadata[] = [];

    // S2S HMAC (always add for internal hops; safe to include even if not strictly required)
    parts.push(buildS2SMetadata());

    // Bearer (if we have a user token)
    if (opts?.token) {
      const b = bearer(opts.token);
      if (b) parts.push(b);
    }

    // x-user-id (propagate initiator)
    if (opts?.userId) {
      const md = new Metadata();
      md.set(X_USER_ID_HEADER, String(opts.userId));
      parts.push(md);
    }

    if (!parts.length) return undefined;
    // merge into one Metadata instance
    const merged = new Metadata();
    for (const p of parts) {
      for (const [key, vals] of (p as any).internalRepr) {
        for (const v of vals) merged.add(key, v);
      }
    }
    return merged;
  }

  // ---- Helpers to await Observables with a deadline ----
  private async await$<T>(obs: import('rxjs').Observable<T>, label: string, ms = 8000): Promise<T> {
    console.time(label);
    try {
      return await firstValueFrom(obs.pipe(timeout(ms)));
    } finally {
      console.timeEnd(label);
    }
  }

  // ---------------- RPCs ----------------

  /** Registration path → no user yet; still send S2S */
  async createUser(req: CreateUserRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → createUser');
    const msg = user.CreateUserRequest.create(req as any);
    const md = this.composeMd(); // S2S only
    const obs = md ? this.svc.createUser(msg, md) : this.svc.createUser(msg);
    return this.await$(obs, 'grpc.client::createUser');
  }

  /** Login pre-JWT → S2S only */
  async findUserWithHash(req: FindUserWithHashRequest): Promise<FindUserWithHashResponse> {
    this.logger.debug('gRPC → findUserWithHash');
    const msg = user.FindUserWithHashRequest.create(req as any);
    const md = this.composeMd(); // S2S only
    const obs = md ? this.svc.findUserWithHash(msg, md) : this.svc.findUserWithHash(msg);
    return this.await$(obs, 'grpc.client::findUserWithHash');
  }

  /** Authenticated profile update → JWT + S2S + x-user-id */
  async updateProfile(req: UpdateProfileRequest, token: string): Promise<UserResponse> {
    this.logger.debug('gRPC → updateProfile');
    const msg = user.UpdateProfileRequest.create(req as any);
    const md = this.composeMd({ token, userId: req.id }); // initiator is the same user here
    return this.await$(this.svc.updateProfile(msg, md), 'grpc.client::updateProfile');
  }

  /** Read profile → prefer JWT + S2S + x-user-id (user is reading own profile) */
  async getUser(id: string, token?: string, initiatorId?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → getUser');
    const msg: GetUserRequest = user.GetUserRequest.create({ id });
    const md = this.composeMd({ token, userId: initiatorId ?? id });
    const obs = md ? this.svc.getUser(msg, md) : this.svc.getUser(msg);
    return this.await$(obs, 'grpc.client::getUser');
  }

  /** Admin lookups only → JWT + S2S + x-user-id (admin’s id) */
  async findUser(obj: FindUserRequest, token?: string, initiatorId?: string): Promise<UserResponse> {
    this.logger.debug('gRPC → findUser');
    const msg = user.FindUserRequest.create(obj as any);
    const md = this.composeMd({ token, userId: initiatorId });
    const obs = md ? this.svc.findUser(msg, md) : this.svc.findUser(msg);
    return this.await$(obs, 'grpc.client::findUser');
  }

  /** Token rotation → system path, but still propagate the userId */
  async setRefreshToken(req: SetRefreshTokenRequest): Promise<UserResponse> {
    this.logger.debug('gRPC → setRefreshToken');
    const msg = user.SetRefreshTokenRequest.create(req as any);
    const md = this.composeMd({ userId: req.userId }); // S2S + x-user-id
    const obs = md ? this.svc.setRefreshToken(msg, md) : this.svc.setRefreshToken(msg);
    return this.await$(obs, 'grpc.client::setRefreshToken');
  }

  /** Refresh flow: ID-only lookup → S2S + x-user-id (payload.sub) */
  async getUserWithHash(req: user.GetUserWithHashRequest, initiatorId?: string): Promise<user.GetUserWithHashResponse> {
    this.logger.debug('gRPC → getUserWithHash');
    const msg = user.GetUserWithHashRequest.create(req as any);
    const md = this.composeMd({ userId: initiatorId ?? req.id });
    const obs = md ? this.svc.getUserWithHash(msg, md) : this.svc.getUserWithHash(msg);
    return this.await$(obs, 'grpc.client::getUserWithHash');
  }
}
