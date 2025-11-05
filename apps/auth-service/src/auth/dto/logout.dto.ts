import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class LogoutDto {
  /**
   * Optional refresh token to revoke a specific session.
   */
  @IsOptional()
  @IsString()
  refreshToken?: string;

  /**
   * If true, revoke all of the user's sessions.
   */
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;

  /**
   * Optional device identifier (useful if you support per-device sessions).
   */
  @IsOptional()
  @IsString()
  deviceId?: string;
}
