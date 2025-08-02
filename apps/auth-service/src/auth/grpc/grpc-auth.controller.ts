import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import {
  ValidateUserRequest,
  ValidateUserResponse,
  GetTokensRequest,
  GetTokensResponse,
  RefreshTokensRequest,
  ValidateTokenRequest,
  ValidateTokenResponse,
} from '../../generated/auth';
import { UserResponse } from '../../generated/user';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * gRPC controller for AuthService.
 * Handles authentication, token issuance, refresh, and validation.
 */
@Controller()
export class AuthGrpcController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  // --------------------------------------------------------
  // GET PROFILE (protected)
  // --------------------------------------------------------
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'GetProfile')
  async getProfile(
    data: { userId: string },
    metadata: any,
  ): Promise<UserResponse> {
    try {
      return await this.authService.getProfile(data.userId);
    } catch (err: any) {
      throw err instanceof RpcException
        ? err
        : new RpcException({ code: 16, message: err.message });
    }
  }

  // --------------------------------------------------------
  // VALIDATE CREDENTIALS
  // --------------------------------------------------------
  @GrpcMethod('AuthService', 'ValidateUser')
  async validateUser(
    data: ValidateUserRequest,
  ): Promise<ValidateUserResponse> {
    try {
      const user = await this.authService.validateUser(
        data.identifier,
        data.password,
      );
      return { isValid: !!user, userId: user?.id ?? '' };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  // --------------------------------------------------------
  // ISSUE TOKENS
  // --------------------------------------------------------
  @GrpcMethod('AuthService', 'GetTokens')
  async getTokens(
    data: GetTokensRequest,
  ): Promise<GetTokensResponse> {
    try {
      const { access_token, refresh_token } =
        await this.authService.login({ id: data.userId } as any);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (err: any) {
      throw new RpcException(err.message);
    }
  }

  // --------------------------------------------------------
  // ROTATE REFRESH TOKEN (protected)
  // --------------------------------------------------------
  @Roles('user', 'admin', 'root-admin')
  @UseGuards(JwtAuthGuard)
  @GrpcMethod('AuthService', 'RefreshTokens')
  async refreshTokens(
    data: RefreshTokensRequest,
  ): Promise<GetTokensResponse> {
    try {
      const { access_token, refresh_token } =
        await this.authService.refreshTokens(data.refreshToken);
      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (err: any) {
      throw new RpcException({ code: 16, message: err.message });
    }
  }

  // --------------------------------------------------------
  // VALIDATE ACCESS TOKEN
  // --------------------------------------------------------
  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(
    data: ValidateTokenRequest,
  ): Promise<ValidateTokenResponse> {
    try {
      const payload: any = this.jwtService.verify(data.token);
      return {
        isValid: true,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      return { isValid: false, userId: '', email: '', role: '' };
    }
  }
}
