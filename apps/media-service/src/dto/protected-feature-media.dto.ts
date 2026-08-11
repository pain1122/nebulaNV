import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from "class-validator";
import { Transform, type TransformFnParams } from "class-transformer";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const lowerTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

export class ProtectedFeatureReadUrlDto {
  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "scope is not safe" })
  scope!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityType is not safe" })
  entityType!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityId is not safe" })
  entityId!: string;

  @IsOptional()
  @IsString()
  @Transform(lowerTrim)
  @IsIn(["true", "false", "1", "0"])
  download?: string;
}

export class MyProtectedReadUrlGrpcDto {
  @IsUUID()
  id!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "scope is not safe" })
  scope!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityType is not safe" })
  entityType!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityId is not safe" })
  entityId!: string;

  @IsOptional()
  @IsBoolean()
  download?: boolean;
}
