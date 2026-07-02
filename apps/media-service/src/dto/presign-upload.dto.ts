import { Transform, type TransformFnParams } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._()\-]*$/;
const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const upperTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class PresignUploadDto {
  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename!: string;

  @IsString()
  @Transform(trim)
  mimeType!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  folderPath?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "displayName is not safe" })
  displayName?: string;

  @IsOptional()
  @IsUUID()
  // Optional admin override target owner. Caller identity is from auth context.
  ownerId?: string;

  @IsOptional()
  @IsString()
  @Transform(upperTrim)
  @IsIn(["PUBLIC", "PROTECTED", "STRICT"])
  accessClass?: string;

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "scope is not safe" })
  scope?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityType is not safe" })
  entityType?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "entityId is not safe" })
  entityId?: string;
}
