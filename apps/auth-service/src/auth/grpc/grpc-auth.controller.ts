import { Controller, UseGuards, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { isEmail } from 'class-validator';
import { GrpcAuthService } from './grpc-auth.service';
import { AuthService } from '../auth.service';
import { authv1, userv1 } from '@nebula/protos';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import {
  Public,
  GatewayOnly,
  Roles,
  toRpc,
  resolveCtxUser,
  AllowedS2SIdentities,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';
import { AuthUserDto, toAuthRole } from '../auth.types';
import { errorMessage } from '../error.utils';
import { AccessTokenValidationService } from '../token/access-token-validation.service';

type ValidateUserRequest = authv1.ValidateUserRequest;
type ValidateUserResponse = authv1.ValidateUserResponse;
type RegisterRequest = authv1.RegisterRequest;
type RegisterResponse = authv1.RegisterResponse;
type GetTokensRequest = authv1.GetTokensRequest;
type GetTokensResponse = authv1.GetTokensResponse;
type RefreshTokensRequest = authv1.RefreshTokensRequest;
type LogoutRequest = authv1.LogoutRequest;
type LogoutResponse = authv1.LogoutResponse;
type ValidateTokenRequest = authv1.ValidateTokenRequest;
type ValidateTokenResponse = authv1.ValidateTokenResponse;

type UserResponse = userv1.UserResponse;

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly grpc: GrpcAuthService,
    private readonly accessTokens: AccessTokenValidationService,
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
    call: RpcContextWithContext,
  ): Promise<UserResponse> {
    const token = this.requireBearer(meta);
    const ctx = resolveCtxUser(meta, call);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, 'missing_user_context');
    const isAdmin = ctx.role === 'admin' || ctx.role === 'root-admin';
    if (!isAdmin && ctx.userId !== data.userId) {
      throw toRpc(status.PERMISSION_DENIED, 'not_owner_or_admin');
    }
    return this.authService.getProfile(data.userId, token);
  }

  // ---------------------- PUBLIC ----------------------
  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const email = data.email?.trim();
    if (!email || !isEmail(email)) {
      throw toRpc(status.INVALID_ARGUMENT, 'validation_failed:email');
    }
    if (typeof data.password !== 'string' || data.password.length < 6) {
      throw toRpc(status.INVALID_ARGUMENT, 'validation_failed:password');
    }

    const user = await this.authService.register(email, data.password);
    return authv1.RegisterResponse.create(user);
  }

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
    } catch (err: unknown) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: errorMessage(err, 'Invalid credentials'),
      });
    }
  }

  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'GetTokens')
  async getTokens(data: GetTokensRequest): Promise<GetTokensResponse> {
    // S2SGuard verifies a gateway caller and binds this request body to its
    // signature. Unlike the removed metadata fallback, this assertion is
    // method-specific and integrity-protected during the pre-JWT login flow.
    const userId = data.userId?.trim();
    if (!userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing login user id',
      });
    }

    const req = userv1.GetUserWithHashRequest.create({ id: userId });
    const uw = await this.grpc.getUserWithHash(req);
    if (!uw.id || uw.id !== userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid login user id',
      });
    }

    const user: AuthUserDto = {
      id: uw.id,
      email: uw.email,
      role: toAuthRole(uw.role),
    };

    return authv1.GetTokensResponse.create(await this.authService.login(user));
  }

  @Public({ gatewayOnly: true })
  @GrpcMethod('AuthService', 'RefreshTokens')
  async refreshTokens(data: RefreshTokensRequest): Promise<GetTokensResponse> {
    try {
      return authv1.GetTokensResponse.create(
        await this.authService.refreshTokens(data.refreshToken),
      );
    } catch (err: unknown) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: errorMessage(err, 'Invalid refresh token'),
      });
    }
  }

  @GatewayOnly()
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'Logout')
  async logout(
    data: LogoutRequest,
    meta: Metadata,
    call: RpcContextWithContext,
  ): Promise<LogoutResponse> {
    const token = this.requireBearer(meta);
    const ctx = resolveCtxUser(meta, call);
    if (!ctx?.userId || !ctx.sessionRef) {
      throw toRpc(status.UNAUTHENTICATED, 'missing_user_context');
    }

    const validation = await this.accessTokens.validate(token);
    if (
      !validation.valid ||
      validation.payload.sub !== ctx.userId ||
      validation.sessionRef !== ctx.sessionRef
    ) {
      throw toRpc(status.UNAUTHENTICATED, 'actor_session_mismatch');
    }

    await this.authService.logout({
      userId: validation.payload.sub,
      sessionId: validation.payload.sid,
      refreshToken: data.refreshToken || undefined,
      allDevices: data.allDevices,
    });
    return authv1.LogoutResponse.create({ success: true });
  }

  // PUBLIC: used by guards/services to validate AT
  @Public()
  @AllowedS2SIdentities(
    { kind: 'gateway', caller: 'gateway' },
    { kind: 'service', caller: 'auth-service' },
    { kind: 'service', caller: 'user-service' },
    { kind: 'service', caller: 'settings-service' },
    { kind: 'service', caller: 'blog-service' },
    { kind: 'service', caller: 'product-service' },
    { kind: 'service', caller: 'media-service' },
    { kind: 'service', caller: 'taxonomy-service' },
    { kind: 'service', caller: 'order-service' },
  )
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    try {
      const validation = await this.accessTokens.validate(data.token);
      if (!validation.valid) {
        return authv1.ValidateTokenResponse.create({
          isValid: false,
          userId: '',
          email: '',
          role: '',
        });
      }

      return authv1.ValidateTokenResponse.create({
        isValid: true,
        userId: validation.payload.sub,
        email: validation.payload.email,
        role: validation.payload.role,
        sessionRef: validation.sessionRef,
      });
    } catch {
      this.logger.error('validateToken() failed: validation unavailable');
      return authv1.ValidateTokenResponse.create({
        isValid: false,
        userId: '',
        email: '',
        role: '',
      });
    }
  }
}
