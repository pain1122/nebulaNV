import { Controller, ForbiddenException, UseGuards  } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { UserService } from '../user.service';
import { GrpcJwtAuthGuard } from './grpc-jwt-auth.guard';
import { UpdateProfileDto } from '../../auth/dto/update-profile.dto';

// These interfaces mirror your .proto definitions
interface GetUserRequest {
  id: string;
}
interface UserResponse {
  id: string;
  email: string;
  role: string;
}
interface UpdateProfileRequest {
  id: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

@Controller() // no path needed, gRPC uses the package/service from .proto
export class UserGrpcController {
  constructor(private readonly userService: UserService) {}
  
  @UseGuards(GrpcJwtAuthGuard)
  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: GetUserRequest): Promise<UserResponse> {
    console.log('[gRPC][GetUser] incoming request, id=', data.id);
    try {
      const user = await this.userService.getUserById(data.id);
      if (!user) {
        // convert a “not found” to an RPC error
        throw new RpcException({ code: 5, message: 'User not found' });
      }
      return { id: user.id, email: user.email ?? '', role: user.role };
    } catch (err: any) {
      console.error('[gRPC][GetUser] error:', err);
      // rethrow any RpcException, wrap others
      throw err instanceof RpcException ? err : new RpcException(err.message);
    }
  }

  @UseGuards(GrpcJwtAuthGuard)
  @GrpcMethod('UserService', 'UpdateProfile')
  async updateProfile(data: UpdateProfileRequest): Promise<UserResponse> {
    try {
      // Reuse your existing DTO & service
      const dto = new UpdateProfileDto();
      if (data.email) dto.email = data.email;
      if (data.newPassword) dto.newPassword = data.newPassword;
      if (data.currentPassword) dto.currentPassword = data.currentPassword;

      const updated = await this.userService.updateProfile(data.id, dto);

      return {
        id: updated.id,
        email: updated.email ?? '',
        role: updated.role,
      };
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        throw new RpcException({ code: 7, message: 'Permission denied' });
      }
      throw err.getStatus && err.getStatus() === 400
        ? new RpcException({ code: 3, message: err.message })
        : new RpcException(err.message);
    }
  }

  @GrpcMethod('UserService', 'FindUser')
  async findUser(data: { email?: string; phone?: string }): Promise<UserResponse> {
    const user = data.email
  ? await this.userService.getUserByEmail(data.email)
  : await this.userService.getUserByPhone(data.phone!);

    if (!user) throw new RpcException({ code: 5, message: 'User not found' });
    return { id: user.id, email: user.email ?? '', role: user.role };
  }
}
