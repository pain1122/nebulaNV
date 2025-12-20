import {IsOptional, IsString, IsIn, Matches} from "class-validator"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/


export class FinalizeUploadDto {
  // storage location (object key)
  @IsString()
  path!: string

  // optional overrides / hints
  @IsOptional()
  @IsString()
  bucket?: string

  @IsOptional()
  @IsString()
  @Matches(SAFE_FILENAME, {message: "filename is not safe"})
  filename?: string

  @IsOptional()
  @IsString()
  mimeType?: string

  @IsOptional()
  @IsString()
  ownerId?: string

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: "private" | "public"

  @IsOptional()
  @IsString()
  scope?: string

  // optional integrity hint (future scanners / dedupe)
  @IsOptional()
  @IsString()
  sha256?: string
}
