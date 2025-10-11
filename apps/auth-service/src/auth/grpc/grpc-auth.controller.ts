// apps/auth-service/src/auth/grpc/grpc-auth.controller.ts
import { Controller, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';

import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { authv1, userv1 } from '@nebula/protos';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Public, Roles } from '@nebula/grpc-auth';

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

  // -------- Protected (requires Access Token in gRPC metadata) --------
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'GetProfile')
  async getProfile(
    data: { userId: string },
    meta: Metadata,
  ): Promise<UserResponse> {
    try {
      // Forward JWT to user-service (plus S2S + x-user-id handled by client)
      const token = this.tokenFromMeta(meta);
      return await this.authService.getProfile(data.userId, token);
    } catch (err: any) {
      throw err instanceof RpcException
        ? err
        : new RpcException({ code: 16, message: err.message });
    }
  }

  // ---------------------- PUBLIC ----------------------
  @Public()
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
      throw new RpcException(err.message);
    }
  }

  // PUBLIC: client only has userId here, no AT required
  @Public()
  @GrpcMethod('AuthService', 'GetTokens')
  async getTokens(data: GetTokensRequest): Promise<GetTokensResponse> {
    try {
      const u = await this.authService.getProfile(data.userId); // service handles downstream fetch
      const { accessToken, refreshToken } = await this.authService.login({
        id: u.id,
        email: u.email,
        role: u.role,
      });
      return authv1.GetTokensResponse.create({ accessToken, refreshToken });
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  // PUBLIC: refresh is authenticated by the refresh token itself
  @Public()
  @GrpcMethod('AuthService', 'RefreshTokens')
  async refreshTokens(data: RefreshTokensRequest): Promise<GetTokensResponse> {
    try {
      const { accessToken, refreshToken } =
        await this.authService.refreshTokens(data.refreshToken);
      return authv1.GetTokensResponse.create({ accessToken, refreshToken });
    } catch (err: any) {
      throw new RpcException({ code: 16, message: err.message });
    }
  }

  // PUBLIC: used by guards/services to validate either AT or RT
  @Public()
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    try {
      const accessSecret =
        this.cfg.get<string>('JWT_ACCESS_SECRET') ??
        this.cfg.get<string>('JWT_SECRET');
      try {
        const payload: any = this.jwtService.verify(data.token, {
          secret: accessSecret,
        });
        return authv1.ValidateTokenResponse.create({
          isValid: true,
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        });
      } catch {
        // try refresh secret
        const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET');
        const payload: any = this.jwtService.verify(data.token, {
          secret: refreshSecret,
        });
        return authv1.ValidateTokenResponse.create({
          isValid: true,
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        });
      }
    } catch {
      return authv1.ValidateTokenResponse.create({
        isValid: false,
        userId: '',
        email: '',
        role: '',
      });
    }
  }
}
