import { IsEmail, IsOptional, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  newPassword?: string;

  @ValidateIf((dto) => dto.newPassword !== undefined) // only required if user is trying to change password
  @MinLength(8)
  currentPassword?: string;
}
