import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { userv1 as user } from '@nebula/protos';
import {
  ChannelCredentials,
  Metadata,
  CallOptions,
  ClientOptions,
  ServiceError,
} from '@grpc/grpc-js';

export const USER_RPC = Symbol('USER_RPC');

export interface IUserRpc {
  createUser(req: user.CreateUserRequest): Promise<user.UserResponse>;
  findUserWithHash(req: user.FindUserWithHashRequest): Promise<user.FindUserWithHashResponse>;
  updateProfile(req: user.UpdateProfileRequest, token: string): Promise<user.UserResponse>;
  getUser(req: user.GetUserRequest, token?: string): Promise<user.UserResponse>;
  findUser(req: user.FindUserRequest, token?: string): Promise<user.UserResponse>;
  setRefreshToken(req: user.SetRefreshTokenRequest): Promise<user.UserResponse>;
}

type UnaryMethodName =
  | 'createUser'
  | 'findUserWithHash'
  | 'updateProfile'
  | 'getUser'
  | 'findUser'
  | 'setRefreshToken';

@Injectable()
export class TsProtoUserRpc implements IUserRpc {
  private readonly logger = new Logger(TsProtoUserRpc.name);
  private client: user.UserServiceClient;
  private readonly url: string;

  constructor(private readonly cfg: ConfigService) {
    this.url = this.cfg.get<string>('USER_GRPC_URL') ?? '127.0.0.1:50051';
    // Pass an empty options object so grpc-js has options (prevents interceptors=undefined crash)
    this.client = new user.UserServiceClient(
      this.url,
      ChannelCredentials.createInsecure(),
      {} as Partial<ClientOptions>
    );
    this.logger.log(`UserServiceClient constructed → ${this.url}`);
  }

  // ---------- helpers ----------
  private md(token?: string) {
    if (!token) return undefined;
    const m = new Metadata();
    m.set('authorization', `Bearer ${token}`); // lowercase is fine
    return m;
  }
  private deadline(ms: number) {
    return new Date(Date.now() + ms);
  }

  /** Unified unary caller to avoid TS overload mismatch */
  private callUnary<TReq, TRes>(
    method: UnaryMethodName,
    label: string,
    req: TReq,
    md?: Metadata,
    ms = 5000
  ): Promise<TRes> {
    this.logger.debug(`[${label}] start method=${method} url=${this.url}`);
    // shallow, safe-ish preview (no secrets):
    try {
      const preview = JSON.stringify(req, (k, v) =>
        typeof v === 'string' && /password/i.test(k) ? '***' : v
      );
      this.logger.debug(`[${label}] request=${preview}`);
    } catch {
      /* ignore preview issues */
    }

    const opts: CallOptions = { deadline: this.deadline(ms) };
    const hasMd = !!md;
    this.logger.debug(`[${label}] metadata=${hasMd ? 'present' : 'none'} deadline=${ms}ms`);
    console.time(label);

    return new Promise<TRes>((resolve, reject) => {
      const cb = (err: ServiceError | null, res: TRes) => {
        console.timeEnd(label);
        if (err) {
          this.logger.error(
            `[${label}] gRPC error code=${(err as any)?.code} details=${(err as any)?.details} msg=${err.message}`
          );
          return reject(err);
        }
        // light response log
        try {
          const keys = Object.keys((res as any) ?? {});
          this.logger.debug(`[${label}] success keys=${JSON.stringify(keys)}`);
        } catch {/* ignore */}
        resolve(res);
      };

      try {
        const fn: any = (this.client as any)[method];
        // Overload selection:
        // - with metadata: (req, md, opts, cb)
        // - without metadata: (req, opts, cb)
        if (md) fn.call(this.client, req, md, opts, cb);
        else fn.call(this.client, req, opts, cb);
      } catch (e: any) {
        console.timeEnd(label);
        this.logger.error(`[${label}] client call threw: ${e?.message || e}`);
        reject(e);
      }
    });
  }

  // ---------- RPCs ----------
  async createUser(req: user.CreateUserRequest): Promise<user.UserResponse> {
    const msg = user.CreateUserRequest.create(req as any);
    return this.callUnary<user.CreateUserRequest, user.UserResponse>(
      'createUser',
      'grpc.user::createUser',
      msg
    );
  }

  async findUserWithHash(
    req: user.FindUserWithHashRequest
  ): Promise<user.FindUserWithHashResponse> {
    const msg = user.FindUserWithHashRequest.create(req as any);
    return this.callUnary<user.FindUserWithHashRequest, user.FindUserWithHashResponse>(
      'findUserWithHash',
      'grpc.user::findUserWithHash',
      msg
    );
  }

  async updateProfile(
    req: user.UpdateProfileRequest,
    token: string
  ): Promise<user.UserResponse> {
    const msg = user.UpdateProfileRequest.create(req as any);
    return this.callUnary<user.UpdateProfileRequest, user.UserResponse>(
      'updateProfile',
      'grpc.user::updateProfile',
      msg,
      this.md(token)
    );
  }

  async getUser(req: user.GetUserRequest, token?: string): Promise<user.UserResponse> {
    const msg = user.GetUserRequest.create(req as any);
    return this.callUnary<user.GetUserRequest, user.UserResponse>(
      'getUser',
      'grpc.user::getUser',
      msg,
      this.md(token)
    );
  }

  async findUser(req: user.FindUserRequest, token?: string): Promise<user.UserResponse> {
    const msg = user.FindUserRequest.create(req as any);
    return this.callUnary<user.FindUserRequest, user.UserResponse>(
      'findUser',
      'grpc.user::findUser',
      msg,
      this.md(token)
    );
  }

  async setRefreshToken(req: user.SetRefreshTokenRequest): Promise<user.UserResponse> {
    const msg = user.SetRefreshTokenRequest.create(req as any);
    return this.callUnary<user.SetRefreshTokenRequest, user.UserResponse>(
      'setRefreshToken',
      'grpc.user::setRefreshToken',
      msg
    );
  }
}
