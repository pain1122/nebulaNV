import {
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export enum BlogPostStatusDto {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export class CreatePostDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(BlogPostStatusDto)
  status?: BlogPostStatusDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaKeywords?: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(BlogPostStatusDto)
  status?: BlogPostStatusDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaKeywords?: string;
}

export class ListPostsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
