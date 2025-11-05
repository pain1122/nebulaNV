import { Controller, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { GrpcAuthService } from './grpc-auth.service';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { authv1, userv1 } from '@nebula/protos';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import {
  Public,
  Roles,
  wrapGrpc,
  toRpc,
  resolveCtxUser,
  RequireUserId,
} from '@nebula/grpc-auth';
import * as jsonwebtoken from 'jsonwebtoken';

type ValidateUserRequest = authv1.ValidateUserRequest;
type ValidateUserResponse = authv1.ValidateUserResponse;
type GetTokensRequest = authv1.GetTokensRequest;
type GetTokensResponse = authv1.GetTokensResponse;
type RefreshTokensRequest = authv1.RefreshTokensRequest;
type ValidateTokenRequest = authv1.ValidateTokenRequest;
type ValidateTokenResponse = authv1.ValidateTokenResponse;

type UserResponse = userv1.UserResponse;

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
    private readonly grpc: GrpcAuthService,
  ) {}

  /** Utility: read Bearer from gRPC metadata */
  private tokenFromMeta(meta?: Metadata): string | undefined {
    if (!meta) return undefined;
    const raw = meta.get('authorization')?.[0] as string | undefined;
    if (!raw) return undefined;
    const [type, val] = raw.split(' ');
    if (type?.toLowerCase() === 'bearer' && val) return val;
    return undefined;
  }

  private requireBearer(meta: Metadata): string {
    const raw = meta?.get('authorization')?.[0] as string | undefined;
    const m = raw && /^Bearer\s+(.+)$/i.exec(raw);
    const token = m?.[1];
    if (!token) throw toRpc(status.UNAUTHENTICATED, 'missing_bearer');
    return token;
  }

  // -------- Protected (requires Access Token in gRPC metadata) --------
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'GetProfile')
  async getProfile(
    data: { userId: string },
    meta: Metadata,
    call: any,
  ): Promise<UserResponse> {
    try {
      const token = this.requireBearer(meta);
      const ctx = resolveCtxUser(meta, call);
      if (!ctx) throw toRpc(status.UNAUTHENTICATED, 'missing_user_context');
      const isAdmin = ctx.role === 'admin' || ctx.role === 'root-admin';
      if (!isAdmin && ctx.userId !== data.userId) {
        throw toRpc(status.PERMISSION_DENIED, 'not_owner_or_admin');
      }
      return await wrapGrpc(
        this.authService.getProfile(data.userId, token, ctx.userId),
      );
    } catch (err: any) {
      throw err instanceof RpcException
        ? err
        : new RpcException({
            code: status.UNAUTHENTICATED,
            message: err.message,
          });
    }
  }

  // ---------------------- PUBLIC ----------------------
  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'ValidateUser')
  async validateUser(data: ValidateUserRequest): Promise<ValidateUserResponse> {
    try {
      const user = await this.authService.validateUser(
        data.identifier,
        data.password,
      );
      return authv1.ValidateUserResponse.create({
        isValid: !!user,
        userId: user?.id ?? '',
      });
    } catch (err: any) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: err.message || 'Invalid credentials',
      });
    }
  }

  @Public({ gatewayOnly: true })
  @RequireUserId()
  @GrpcMethod('AuthService', 'GetTokens')
  async getTokens(
    _data: GetTokensRequest,
    meta: Metadata,
    call: any,
  ): Promise<GetTokensResponse> {
    // never trust input.userId; take it from the (guarded) context
    const ctx = resolveCtxUser(meta, call);
    if (!ctx?.userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing user context',
      });
    }

    // fetch & mint for the *context* user
    const req = userv1.GetUserWithHashRequest.create({ id: ctx.userId });
    const uw = await this.grpc.getUserWithHash(req, ctx.userId);

    const { accessToken, refreshToken } = await this.authService.login({
      id: String((uw as any).id),
      email: (uw as any).email,
      role: (uw as any).role,
    });

    return authv1.GetTokensResponse.create({ accessToken, refreshToken });
  }

  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'RefreshTokens')
  async refreshTokens(data: RefreshTokensRequest): Promise<GetTokensResponse> {
    try {
      const { accessToken, refreshToken } =
        await this.authService.refreshTokens(data.refreshToken);
      return authv1.GetTokensResponse.create({ accessToken, refreshToken });
    } catch (err: any) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: err.message,
      });
    }
  }

  // PUBLIC: used by guards/services to validate either AT or RT
  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    const accessSecret =
      this.cfg.get<string>('JWT_ACCESS_SECRET') ??
      this.cfg.get<string>('JWT_SECRET');
    const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      console.error('[ValidateToken] missing JWT secrets in environment');
      return authv1.ValidateTokenResponse.create({
        isValid: false,
        userId: '',
        email: '',
        role: '',
      });
    }

    try {
      const payload: any = jsonwebtoken.verify(
        data.token,
        accessSecret as jsonwebtoken.Secret,
      );
      return authv1.ValidateTokenResponse.create({
        isValid: true,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    } catch (err1: any) {
      try {
        const payload: any = jsonwebtoken.verify(
          data.token,
          refreshSecret as jsonwebtoken.Secret,
        );
        return authv1.ValidateTokenResponse.create({
          isValid: true,
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        });
      } catch (err2: any) {
        console.error(
          '[ValidateToken] failed:',
          err1?.message || err2?.message || 'unknown',
        );
        return authv1.ValidateTokenResponse.create({
          isValid: false,
          userId: '',
          email: '',
          role: '',
        });
      }
    }
  }
}
