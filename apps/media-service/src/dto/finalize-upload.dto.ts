import { IsOptional, IsString, IsIn, IsUUID, Matches } from "class-validator";
import { Transform, type TransformFnParams } from "class-transformer";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._()-]*$/;
const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;
const upperTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class FinalizeUploadDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @IsIn(["s3"])
  storage?: string;

  // storage location (object key)
  @IsString()
  @Transform(trim)
  path!: string;

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
  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "originalFilename is not safe" })
  originalFilename?: string;

  // optional overrides / hints
  @IsOptional()
  @IsString()
  @Transform(trim)
  bucket?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  mimeType?: string;

  @IsOptional()
  @IsUUID()
  // Optional admin override target owner. Do not use as authenticated actor identity.
  ownerId?: string;

  @IsOptional()
  @IsString()
  @Transform(upperTrim)
  @IsIn(["PUBLIC", "PROTECTED", "STRICT"])
  accessClass?: string;

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: "private" | "public";

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

  // optional integrity hint (future scanners / dedupe)
  @IsOptional()
  @IsString()
  @Transform(trim)
  sha256?: string;
}
