import {
    IsArray, ArrayMaxSize, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional,
    IsString, IsUUID, Max, MaxLength, Min, ValidateIf
  } from 'class-validator';
  import { Expose, Type } from 'class-transformer';
  
  export enum ProductStatusDto { DRAFT='DRAFT', ACTIVE='ACTIVE', ARCHIVED='ARCHIVED' }
  export enum DiscountTypeDto { PERCENTAGE='PERCENTAGE', FIXED='FIXED', NONE='NONE' }
  
  export class ProductInputDto {
    @IsString() @MaxLength(180) title!: string;
    @IsOptional() @IsString() @MaxLength(120) slug?: string;
    @IsOptional() @IsString() @MaxLength(120) sku?: string;
  
    @IsNumber() @Min(0) price!: number;
    @IsOptional() @IsString() @MaxLength(8)  currency?: string;
    @IsOptional() @IsEnum(ProductStatusDto)  status?: ProductStatusDto;
  
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() excerpt?: string;
  
    @Expose({ name: 'category_id' })
    @IsOptional() @IsUUID() categoryId?: string;
  
    @Expose({ name: 'thumbnail_url' })
    @IsOptional() @IsString() @MaxLength(1024) thumbnailUrl?: string;
  
    @Expose({ name: 'model3d_url' })
    @IsOptional() @IsString() @MaxLength(1024) model3dUrl?: string;
  
    @Expose({ name: 'model3d_format' })
    @IsOptional() @IsString() @MaxLength(16) model3dFormat?: string;
  
    @Expose({ name: 'model3d_live_view' })
    @IsOptional() @IsBoolean() model3dLiveView?: boolean;
  
    @Expose({ name: 'model3d_poster_url' })
    @IsOptional() @IsString() @MaxLength(1024) model3dPosterUrl?: string;
  
    @Expose({ name: 'vr_enabled' })
    @IsOptional() @IsBoolean() vrEnabled?: boolean;
  
    @Expose({ name: 'vr_plan_image_url' })
    @IsOptional() @IsString() @MaxLength(1024) vrPlanImageUrl?: string;
  
    @Expose({ name: 'meta_title' })
    @IsOptional() @IsString() @MaxLength(180) metaTitle?: string;
  
    @Expose({ name: 'meta_description' })
    @IsOptional() @IsString() metaDescription?: string;
  
    @Expose({ name: 'meta_keywords' })
    @IsOptional() @IsString() @MaxLength(512) metaKeywords?: string;
  
    @Expose({ name: 'custom_schema' })
    @IsOptional() @IsString() customSchema?: string;
  
    @IsOptional() @IsBoolean() noindex?: boolean;
  
    @Expose({ name: 'is_featured' })
    @IsOptional() @IsBoolean() isFeatured?: boolean;
  
    @Expose({ name: 'feature_sort' })
    @IsOptional() @IsNumber() featureSort?: number;
  
    @Expose({ name: 'promo_title' })
    @IsOptional() @IsString() @MaxLength(120) promoTitle?: string;
  
    @Expose({ name: 'promo_badge' })
    @IsOptional() @IsString() @MaxLength(32)  promoBadge?: string;
  
    @Expose({ name: 'promo_active' })
    @IsOptional() @IsBoolean() promoActive?: boolean;
  
    @Expose({ name: 'discount_type' })
    @IsOptional() @IsEnum(DiscountTypeDto) discountType?: DiscountTypeDto;
  
    @Expose({ name: 'discount_value' })
    @ValidateIf(o => o.discountType && o.discountType !== 'NONE')
    @IsNumber() @Min(0) @Max(1_000_000) discountValue?: number;
  
    @Expose({ name: 'discount_active' })
    @IsOptional() @IsBoolean() discountActive?: boolean;
  
    @Expose({ name: 'discount_start' })
    @IsOptional() @IsISO8601() discountStart?: string;
  
    @Expose({ name: 'discount_end' })
    @IsOptional() @IsISO8601() discountEnd?: string;
  
    @IsOptional() @IsArray() @ArrayMaxSize(64) tags?: string[];
  
    @Expose({ name: 'complementary_ids' })
    @IsOptional() @IsArray() @ArrayMaxSize(64) complementaryIds?: string[];
  }
  
  export class CreateProductRequestDto {
    @Type(() => ProductInputDto) data!: ProductInputDto;
  }
  
  export class UpdateProductRequestDto {
    @IsString() @IsUUID() id!: string;
    @Type(() => ProductInputDto) patch!: ProductInputDto;
  }
  
  export class IdRequestDto { @IsString() @IsUUID() id!: string; }
  
  export class ListProductsRequestDto {
    @IsOptional() @IsString() q?: string;
    @Expose({ name: 'category_id' }) @IsOptional() @IsUUID() categoryId?: string;
    @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto;
    @IsOptional() @IsNumber() @Min(1) page?: number;
    @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
    @Expose({ name: 'include_deleted' }) @IsOptional() @IsBoolean() includeDeleted?: boolean;
  }
  