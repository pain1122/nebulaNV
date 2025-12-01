import {IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength} from "class-validator"

const SAFE = /^[a-z0-9][a-z0-9._-]*$/

export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  @Matches(SAFE)
  scope?: string

  @IsOptional()
  @IsString()
  @Matches(SAFE)
  kind?: string

  @IsOptional()
  @IsString()
  @Matches(SAFE)
  @MaxLength(80)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isTree?: boolean

  @IsOptional()
  @IsUUID()
  parentId?: string
}
