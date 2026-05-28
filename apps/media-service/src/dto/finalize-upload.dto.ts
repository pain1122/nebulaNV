import { IsOptional, IsString, IsIn, Matches } from "class-validator";
import { Transform, type TransformFnParams } from "class-transformer";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const upperTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class FinalizeUploadDto {
  // storage location (object key)
  @IsString()
  path!: string;

  // optional overrides / hints
  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsString()
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
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
  scope?: string;

  // optional integrity hint (future scanners / dedupe)
  @IsOptional()
  @IsString()
  sha256?: string;
}
