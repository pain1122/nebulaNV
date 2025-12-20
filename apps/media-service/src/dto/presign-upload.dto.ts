import { Transform } from "class-transformer"
import { IsIn, IsOptional, IsString, IsUUID, Matches } from "class-validator"

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/
const trim = ({ value }: any) => (typeof value === "string" ? value.trim() : value)

export class PresignUploadDto {
  @IsString()
  @Transform(trim)
  @Matches(SAFE_FILENAME, { message: "filename is not safe" })
  filename!: string

  @IsString()
  @Transform(trim)
  mimeType!: string

  @IsOptional()
  @IsUUID()
  ownerId?: string

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: string

  @IsOptional()
  @IsIn(["panel", "user", "system"])
  scope?: string
}
