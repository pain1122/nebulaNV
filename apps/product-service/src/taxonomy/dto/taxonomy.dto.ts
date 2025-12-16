// apps/product-service/src/taxonomy/dto/taxonomy.dto.ts

import { IsOptional, IsString, IsUUID, IsBoolean, IsInt, IsObject, ValidateIf } from "class-validator"

export class CreateTaxonomyDto {
  @IsString()
  slug!: string

  @IsString()
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  /**
   * parentId: null or UUID
   * determines tree behavior automatically inside taxonomy-service
   */
  @IsOptional()
  @IsUUID()
  parentId?: string | null

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>
}

export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  parentId?: string | null

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>
}
