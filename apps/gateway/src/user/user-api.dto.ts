import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import {
  GATEWAY_ACTOR_ROLES,
  type GatewayActorRole,
} from "../application/application.contracts";

export class GatewayUserUpdateRequestDto {
  @ApiPropertyOptional({ format: "email" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ minLength: 8, format: "password", writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @ApiPropertyOptional({ minLength: 8, format: "password", writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;
}

export class GatewayUserListItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty({ enum: GATEWAY_ACTOR_ROLES })
  role!: GatewayActorRole;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
