import { Transform, type TransformFnParams } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
} from "class-validator";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const MAX_INT_32 = 2_147_483_647;

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;
const upperTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const numberOrUndefined = ({ value }: TransformFnParams): number | undefined =>
  value === undefined ? undefined : Number(value);
export class CreateMediaDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @IsIn(["local", "s3", "minio", "r2"])
  storage?: string; // default: "local"

  @IsOptional()
  @IsString()
  @Transform(trim)
  bucket?: string | null;

  @IsString()
  @Transform(trim)
  path!: string;

  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename!: string;

  @IsString()
  @Transform(trim)
  mimeType!: string;

  // Keep as string for HTTP + gRPC parity, service converts via Number()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsOptional()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(0)
  @Max(MAX_INT_32)
  width?: number;

  @IsOptional()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(0)
  @Max(MAX_INT_32)
  height?: number;

  @IsOptional()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(0)
  @Max(MAX_INT_32)
  durationSec?: number;

  @IsOptional()
  @IsUUID()
  // Optional admin override target owner. Never trusted as caller identity.
  ownerId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(upperTrim)
  @IsIn(["PUBLIC", "PROTECTED", "STRICT"])
  accessClass?: string;

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: string;

  @IsOptional()
  @IsIn(["panel", "user", "system"])
  scope?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  sha256?: string | null;
}
