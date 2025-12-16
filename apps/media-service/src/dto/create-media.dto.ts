import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator"
import { Transform } from "class-transformer"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  storage?: string // default: "local"

  @IsOptional()
  @IsString()
  bucket?: string

  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  path!: string

  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename!: string

  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  mimeType!: string

  // Prisma BigInt -> accept as string (e.g. "12345")
  @IsString()
  @Matches(/^\d+$/, { message: "sizeBytes must be a numeric string" })
  sizeBytes!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number

  @IsOptional()
  @IsUUID()
  ownerId?: string

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: string

  @IsOptional()
  @IsIn(["panel", "user", "system"])
  scope?: string

  @IsOptional()
  @IsString()
  sha256?: string
}
