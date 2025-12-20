import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator"
import { Transform } from "class-transformer"

export class ListMediaDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  q?: string

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  skip?: number

  @IsOptional()
  @IsUUID()
  ownerId?: string

  @IsOptional()
  @IsIn(["private", "public"])
  visibility?: string

  @IsOptional()
  @IsIn(["panel", "user", "system"])
  scope?: string

  // ✅ new lifecycle filters (DTO-only, no Prisma typing)
  @IsOptional()
  @IsIn(["PENDING", "READY", "BLOCKED", "DELETED"])
  status?: string

  @IsOptional()
  @IsIn(["NONE", "QUEUED", "SCANNING", "CLEAN", "INFECTED", "FAILED"])
  scanStatus?: string
}
