import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class GatewayAuthRegisterRequestDto {
  @ApiProperty({ example: "person@example.com", format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6, format: "password", writeOnly: true })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class GatewayAuthLoginRequestDto {
  @ApiProperty({ example: "person@example.com" })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ format: "password", writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class GatewayAuthRefreshRequestDto {
  @ApiPropertyOptional({
    writeOnly: true,
    description:
      "Required for native mobile. Browser refresh uses the HttpOnly refreshToken cookie and must omit this field.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class GatewayAuthLogoutRequestDto {
  @ApiPropertyOptional({
    description: "Revoke every refresh session owned by the authenticated user.",
  })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;

  @ApiPropertyOptional({
    writeOnly: true,
    description:
      "Native-mobile current-session refresh token. Browser clients must omit it.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

export class GatewayAuthTokenDto {
  @ApiProperty({ description: "Short-lived access bearer." })
  accessToken!: string;

  @ApiPropertyOptional({
    description:
      "Returned only to native-mobile clients. Browser clients receive this value only in an HttpOnly cookie.",
  })
  refreshToken?: string;

  @ApiProperty({ minimum: 1 })
  accessExpiresInSeconds!: number;

  @ApiProperty({ minimum: 1 })
  refreshExpiresInSeconds!: number;
}

export class GatewayAuthLogoutResultDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
