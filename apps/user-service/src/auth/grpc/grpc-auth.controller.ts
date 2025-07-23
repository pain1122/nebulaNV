import { Controller, UseGuards, UnauthorizedException } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { GrpcJwtAuthGuard } from '../../user/grpc/grpc-jwt-auth.guard';
import { UserResponse } from '../user-service-client.interface';
import { Roles } from '../../common/decorators/roles.decorator';


interface RefreshTokenRequest {
  refreshToken: string;
}
interface TokenPair {
  access_token: string;
  refresh_token: string;
}

@Controller()   // gRPC package/service is set in your main.ts
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  // Expose a GetProfile RPC if you want gRPC → profile
  @Roles('user','admin','root-admin')
  @UseGuards(GrpcJwtAuthGuard)
  @GrpcMethod('AuthService', 'GetProfile')
  async getProfile(
    data: { userId: string }, 
    metadata: any
  ): Promise<UserResponse> {
    const token = (metadata.get('authorization')[0] as string).split(' ')[1];
    try {
      return await this.authService.getUserById(data.userId, token);
    } catch (err: any) {
      throw err instanceof RpcException
        ? err
        : new RpcException({ code: 16, message: err.message });
    }
  }


  // Expose the refresh RPC
  @Roles('user','admin','root-admin')
  @UseGuards(GrpcJwtAuthGuard)
  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: RefreshTokenRequest): Promise<TokenPair> {
    try {
      const result = await this.authService.refreshTokens(data.refreshToken);
      // authService.refreshTokens returns { access_token, refresh_token }
      return result;
    } catch {
      throw new RpcException({ code: 16, message: 'Invalid refresh token' });
    }
  }
}
