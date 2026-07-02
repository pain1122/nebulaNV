import { Type, Transform, type TransformFnParams } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class PublicLibraryDeleteItemDto {
  @IsString()
  @Transform(trim)
  @IsIn(["file", "folder"])
  type!: "file" | "folder";

  @ValidateIf((item: PublicLibraryDeleteItemDto) => item.type === "file")
  @IsUUID()
  id?: string;

  @ValidateIf((item: PublicLibraryDeleteItemDto) => item.type === "folder")
  @IsString()
  @Transform(trim)
  folderPath?: string;
}

export class PublicLibraryDeletePreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicLibraryDeleteItemDto)
  items!: PublicLibraryDeleteItemDto[];

  @IsOptional()
  @IsBoolean()
  recursive?: boolean;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Matches(SAFE_CONTEXT_VALUE, { message: "scope is not safe" })
  scope?: string;
}

export class PublicLibraryDeleteConfirmDto extends PublicLibraryDeletePreviewDto {
  @IsString()
  @Transform(trim)
  confirmToken!: string;
}
