import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProfileRequest } from './grpc/user-service-client.interface';

/**
 * Convert the HTTP UpdateProfileDto into the gRPC UpdateProfileRequest,
 * filling empty strings for optional fields.
 */
export function dtoToProtoUpdate(
  userId: string,
  dto: UpdateProfileDto,
): UpdateProfileRequest {
  return {
    id: userId,
    email: dto.email ?? '',
    newPassword: dto.newPassword ?? '',
    currentPassword: dto.currentPassword ?? '',
  };
}
