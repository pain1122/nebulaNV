import { UpdateProfileDto } from './dto/update-profile.dto';
import { userv1 } from '@nebula/protos';

type UpdateProfileRequest = userv1.UpdateProfileRequest;

export function dtoToProtoUpdate(
  userId: string,
  dto: UpdateProfileDto,
): UpdateProfileRequest {
  return userv1.UpdateProfileRequest.create({
    id: userId,
    email: dto.email ?? undefined,
    newPassword: dto.newPassword ?? undefined,
    currentPassword: dto.currentPassword ?? undefined,
  });
}
