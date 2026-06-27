import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Transform, type TransformFnParams } from "class-transformer";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const upperTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const lowerTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const numberOrUndefined = ({ value }: TransformFnParams): number | undefined =>
  value === undefined ? undefined : Number(value);

export class ListMediaDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  q?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  search?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  path?: string;

  @IsOptional()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @IsOptional()
  @Transform(numberOrUndefined)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsUUID()
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
  @IsIn(["panel", "user", "system"])
  scope?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  folderPath?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @Transform(lowerTrim)
  @IsIn(["image", "video", "audio", "document"])
  mediaType?: string;

  @IsOptional()
  @IsString()
  @Transform(lowerTrim)
  @IsIn(["name", "createdAt", "updatedAt", "size"])
  sortBy?: string;

  @IsOptional()
  @IsString()
  @Transform(lowerTrim)
  @IsIn(["asc", "desc"])
  order?: string;

  @IsOptional()
  @IsIn(["PENDING", "READY", "BLOCKED", "DELETED"])
  status?: string;

  @IsOptional()
  @IsIn(["NONE", "QUEUED", "SCANNING", "CLEAN", "INFECTED", "FAILED"])
  scanStatus?: string;
}
