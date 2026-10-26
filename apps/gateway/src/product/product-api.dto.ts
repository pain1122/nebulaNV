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
  IsObject,
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

export enum GatewayProductSelectionMode {
  BASE = "BASE",
  VARIANT = "VARIANT",
}

export enum GatewayDiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
  NONE = "NONE",
}

export enum GatewayProductAvailability {
  AVAILABLE = "AVAILABLE",
  OUT_OF_STOCK = "OUT_OF_STOCK",
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

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ maxLength: 8 })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({ enum: GatewayProductStatus })
  @IsOptional()
  @IsEnum(GatewayProductStatus)
  status?: GatewayProductStatus;

  @ApiPropertyOptional({ enum: GatewayProductSelectionMode })
  @IsOptional()
  @IsEnum(GatewayProductSelectionMode)
  selectionMode?: GatewayProductSelectionMode;

  @ApiPropertyOptional({
    description: "Maps to the internal description field.",
  })
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

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  brandId?: string;

  @ApiPropertyOptional({ type: [String], format: "uuid", maxItems: 64 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsUUID("4", { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  thumbnailMediaId?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  thumbnailTitle?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  thumbnailAlt?: string | null;

  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  model3dFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  model3dLiveView?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vrEnabled?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 })
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

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1_000_000,
    description: "Percentage discounts are additionally limited to 100.",
  })
  @ValidateIf(
    (value: GatewayProductWriteDto) =>
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  stockQuantity?: number;
}

export class GatewayProductPatchDto extends PartialType(
  GatewayProductWriteDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clearBrand?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clearThumbnailMedia?: boolean;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedVersion!: number;
}

export class GatewayVariantFieldsDto {
  @ApiProperty({ maxLength: 120 }) @IsString() @MaxLength(120) sku!: string;
  @ApiProperty({
    type: "object",
    additionalProperties: { type: "string" },
    description: "One to three option names mapped to values.",
  })
  @IsObject()
  options!: Record<string, string>;
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  stockQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;
}

export class GatewayVariantWriteDto extends GatewayVariantFieldsDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedVersion!: number;
}

export class GatewayVariantPatchDto extends PartialType(
  GatewayVariantFieldsDto,
) {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedVersion!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clearPriceOverride?: boolean;
}

export class GatewayVariantDeleteQueryDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedVersion!: number;
}

export class GatewayProductVariantPathDto {
  @ApiProperty({ format: "uuid" }) @IsUUID("4") id!: string;
  @ApiProperty({ format: "uuid" }) @IsUUID("4") variantId!: string;
}

export class GatewayProductVariantDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty({ type: "object", additionalProperties: { type: "string" } })
  options!: Readonly<Record<string, string>>;
  @ApiProperty() price!: number;
  @ApiProperty({ type: Number, nullable: true }) priceOverride!: number | null;
  @ApiProperty() effectivePrice!: number;
  @ApiProperty({ minimum: 0 }) stockQuantity!: number;
  @ApiProperty({ enum: GatewayProductAvailability })
  availability!: GatewayProductAvailability;
  @ApiProperty() active!: boolean;
  @ApiProperty({ minimum: 0 }) sortOrder!: number;
  @ApiProperty() deletedAt!: string;
}

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

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1_000_000,
    description: "Percentage discounts are additionally limited to 100.",
  })
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
  @ApiPropertyOptional({ maxLength: 1024, deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  url?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  mediaId!: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  alt?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

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
  @ApiProperty() brandId!: string;
  @ApiProperty({ type: [String] }) tagIds!: readonly string[];
  @ApiProperty() thumbnailMediaId!: string;
  @ApiProperty() thumbnailTitle!: string;
  @ApiProperty() thumbnailAlt!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  thumbnailTitleOverride?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) thumbnailAltOverride?:
    | string
    | null;
  @ApiProperty() model3dFormat!: string;
  @ApiProperty() model3dLiveView!: boolean;
  @ApiProperty() vrEnabled!: boolean;
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
  @ApiProperty({ enum: GatewayDiscountType })
  discountType!: GatewayDiscountType;
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
  @ApiProperty() trackInventory!: boolean;
  @ApiProperty({ minimum: 0 }) stockQuantity!: number;
  @ApiProperty({ enum: GatewayProductAvailability })
  availability!: GatewayProductAvailability;
  @ApiProperty({ minimum: 1 }) version!: number;
  @ApiProperty({ enum: GatewayProductSelectionMode })
  selectionMode!: GatewayProductSelectionMode;
  @ApiProperty({ type: [GatewayProductVariantDto] })
  variants!: readonly GatewayProductVariantDto[];
}

export class GatewayGalleryImageDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() mediaId!: string;
  @ApiProperty() alt!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) altOverride?:
    | string
    | null;
  @ApiPropertyOptional({ type: String, nullable: true }) titleOverride?:
    | string
    | null;
  @ApiProperty({ minimum: 1 }) metadataVersion!: number;
  @ApiProperty() sort!: number;
  @ApiProperty() deletedAt!: string;
}

export class GatewayBulkResultDto {
  @ApiProperty({ minimum: 0 }) updated!: number;
}
