// apps/auth-service/src/auth/grpc/grpc-auth.controller.ts
import { Controller, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { authv1, userv1 } from '@nebula/protos';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '@nebula/grpc-auth';

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

  // -------- Protected example (requires Access Token in gRPC metadata) --------
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'GetProfile')
  async getProfile(data: { userId: string }): Promise<UserResponse> {
    try {
      return await this.authService.getProfile(data.userId);
    } catch (err: any) {
      throw err instanceof RpcException
        ? err
        : new RpcException({ code: 16, message: err.message });
    }
  }

  // ---------------------- PUBLIC ----------------------
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
  @GrpcMethod('AuthService', 'GetTokens')
  async getTokens(data: GetTokensRequest): Promise<GetTokensResponse> {
    try {
      const u = await this.authService.getProfile(data.userId); // or a dedicated getUser()
      const { accessToken, refreshToken } = await this.authService.login({
        id: u.id,
        email: u.email,
        role: u.role,
      });
      return authv1.GetTokensResponse.create({
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  // ❗ PUBLIC: do NOT guard refresh; it’s authenticated by the refresh token itself
  @GrpcMethod('AuthService', 'RefreshTokens')
  async refreshTokens(data: RefreshTokensRequest): Promise<GetTokensResponse> {
    try {
      const { accessToken, refreshToken } =
        await this.authService.refreshTokens(data.refreshToken);
      return authv1.GetTokensResponse.create({
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } catch (err: any) {
      throw new RpcException({ code: 16, message: err.message });
    }
  }

  // PUBLIC
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    try {
      const accessSecret =
        this.cfg.get<string>('JWT_ACCESS_SECRET') ??
        this.cfg.get<string>('JWT_SECRET');
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
      const refreshSecret = this.cfg.get<string>('JWT_REFRESH_SECRET');
      try {
        const payload: any = this.jwtService.verify(data.token, {
          secret: refreshSecret,
        });
        return authv1.ValidateTokenResponse.create({
          isValid: true,
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        });
      } catch {}
      return authv1.ValidateTokenResponse.create({
        isValid: false,
        userId: '',
        email: '',
        role: '',
      });
    }
  }
}
