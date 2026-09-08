import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export enum GatewayProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum GatewayDiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
  NONE = "NONE",
}

function strictBoolean({ value }: TransformFnParams): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export class GatewayProductListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

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

export class GatewayAdminProductListQueryDto extends GatewayProductListQueryDto {
  @ApiPropertyOptional({ enum: GatewayProductStatus })
  @IsOptional()
  @IsEnum(GatewayProductStatus)
  status?: GatewayProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(strictBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class GatewayProductWriteDto {
  @ApiProperty({ maxLength: 180 })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ maxLength: 8 })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ enum: GatewayProductStatus })
  @IsOptional()
  @IsEnum(GatewayProductStatus)
  status?: GatewayProductStatus;

  @ApiPropertyOptional({ description: "Maps to the internal description field." })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  thumbnailUrl?: string;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  model3dUrl?: string;

  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  model3dFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  model3dLiveView?: boolean;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  model3dPosterUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vrEnabled?: boolean;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  vrPlanImageUrl?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customSchema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  featureSort?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  promoTitle?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoBadge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  promoActive?: boolean;

  @ApiPropertyOptional({ enum: GatewayDiscountType })
  @IsOptional()
  @IsEnum(GatewayDiscountType)
  discountType?: GatewayDiscountType;

  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  @ValidateIf((value: GatewayProductWriteDto) =>
    value.discountType !== undefined &&
    value.discountType !== GatewayDiscountType.NONE,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  discountActive?: boolean;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  discountStart?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  discountEnd?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 64 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 64 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsUUID("4", { each: true })
  complementaryIds?: string[];
}

export class GatewayProductPatchDto extends PartialType(GatewayProductWriteDto) {}

export class GatewayProductBulkDiscountDto {
  @ApiPropertyOptional({ type: [String], maxItems: 1000 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID("4", { each: true })
  ids?: string[];

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

  @ApiPropertyOptional({ enum: GatewayProductStatus })
  @IsOptional()
  @IsEnum(GatewayProductStatus)
  status?: GatewayProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: GatewayDiscountType })
  @IsOptional()
  @IsEnum(GatewayDiscountType)
  discountType?: GatewayDiscountType;

  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  discountActive?: boolean;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  discountStart?: string;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsISO8601()
  discountEnd?: string;
}

export class GatewayGalleryAdminQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(strictBoolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

export class GatewayGalleryRemoveQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(strictBoolean)
  @IsBoolean()
  hardDelete?: boolean;
}

export class GatewayProductGalleryPathDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  imageId!: string;
}

export class GatewayGalleryImageInputDto {
  @ApiProperty({ maxLength: 1024 })
  @IsString()
  @MaxLength(1024)
  url!: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  alt?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1_000_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sort?: number;
}

export class GatewayGalleryAddDto {
  @ApiProperty({ type: [GatewayGalleryImageInputDto], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GatewayGalleryImageInputDto)
  images!: GatewayGalleryImageInputDto[];
}

export class GatewayGalleryOrderItemDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;

  @ApiProperty({ minimum: 0, maximum: 1_000_000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sort!: number;
}

export class GatewayGalleryOrderDto {
  @ApiProperty({ type: [GatewayGalleryOrderItemDto], maxItems: 200 })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GatewayGalleryOrderItemDto)
  orders!: GatewayGalleryOrderItemDto[];
}

export class GatewayProductDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() excerpt!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ enum: GatewayProductStatus }) status!: GatewayProductStatus;
  @ApiProperty() price!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ format: "uuid" }) categoryId!: string;
  @ApiProperty() thumbnailUrl!: string;
  @ApiProperty() model3dUrl!: string;
  @ApiProperty() model3dFormat!: string;
  @ApiProperty() model3dLiveView!: boolean;
  @ApiProperty() model3dPosterUrl!: string;
  @ApiProperty() vrEnabled!: boolean;
  @ApiProperty() vrPlanImageUrl!: string;
  @ApiProperty() metaTitle!: string;
  @ApiProperty() metaDescription!: string;
  @ApiProperty() metaKeywords!: string;
  @ApiProperty() customSchema!: string;
  @ApiProperty() noindex!: boolean;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty() featureSort!: number;
  @ApiProperty() promoTitle!: string;
  @ApiProperty() promoBadge!: string;
  @ApiProperty() promoActive!: boolean;
  @ApiProperty({ enum: GatewayDiscountType }) discountType!: string;
  @ApiProperty() discountValue!: number;
  @ApiProperty() discountActive!: boolean;
  @ApiProperty() discountStart!: string;
  @ApiProperty() discountEnd!: string;
  @ApiProperty() effectivePrice!: number;
  @ApiProperty({ type: [String] }) tags!: readonly string[];
  @ApiProperty({ type: [String] }) complementaryIds!: readonly string[];
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
  @ApiProperty() deletedAt!: string;
}

export class GatewayGalleryImageDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() alt!: string;
  @ApiProperty() sort!: number;
  @ApiProperty() deletedAt!: string;
}

export class GatewayBulkResultDto {
  @ApiProperty({ minimum: 0 }) updated!: number;
}
