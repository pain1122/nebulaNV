import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum GatewayBlogPostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export class GatewayBlogListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GatewayBlogSlugPathDto {
  @ApiProperty({ maxLength: 180, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" })
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}

export class GatewayBlogWriteDto {
  @ApiProperty({ maxLength: 180 })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional({ maxLength: 256 })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  excerpt?: string;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: GatewayBlogPostStatus })
  @IsOptional()
  @IsEnum(GatewayBlogPostStatus)
  status?: GatewayBlogPostStatus;

  @ApiPropertyOptional({ type: [String], maxItems: 32 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 32 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaKeywords?: string;
}

export class GatewayBlogPatchDto extends PartialType(
  OmitType(GatewayBlogWriteDto, ["slug"] as const),
) {}

export class GatewayBlogPostDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() excerpt!: string;
  @ApiProperty() coverImageUrl!: string;
  @ApiProperty({ enum: GatewayBlogPostStatus }) status!: GatewayBlogPostStatus;
  @ApiProperty({ type: [String] }) tags!: readonly string[];
  @ApiProperty({ type: [String] }) categories!: readonly string[];
  @ApiProperty() metaTitle!: string;
  @ApiProperty() metaDescription!: string;
  @ApiProperty() metaKeywords!: string;
  @ApiProperty() publishedAt!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
}

export class GatewayBlogDeleteResultDto {
  @ApiProperty() success!: boolean;
}
