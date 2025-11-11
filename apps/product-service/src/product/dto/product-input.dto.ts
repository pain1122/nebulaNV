import {IsArray, ArrayMaxSize, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, IsInt} from "class-validator"
import {Expose, Transform, Type} from "class-transformer"
import {ValidateNested} from "class-validator"
const toBool = (v: any) => v === true || v === "true" || v === "1" || v === 1

export enum ProductStatusDto {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}
export enum DiscountTypeDto {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
  NONE = "NONE",
}

export class ProductInputDto {
  @IsString() @MaxLength(180) title!: string
  @IsOptional() @IsString() @MaxLength(120) slug?: string
  @IsOptional() @IsString() @MaxLength(120) sku?: string

  @Type(() => Number) // ← coerce "100" -> 100
  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional() @IsString() @MaxLength(8) currency?: string
  @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto

  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() excerpt?: string

  @Expose({name: "categoryId"})
  @IsOptional()
  @IsUUID("4")
  categoryId?: string

  @Expose({name: "thumbnailUrl"})
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  thumbnailUrl?: string

  @Expose({name: "model3dUrl"})
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  model3dUrl?: string

  @Expose({name: "model3dFormat"})
  @IsOptional()
  @IsString()
  @MaxLength(16)
  model3dFormat?: string

  @Expose({name: "model3dLiveView"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  model3dLiveView?: boolean

  @Expose({name: "model3dPosterUrl"})
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  model3dPosterUrl?: string

  @Expose({name: "vrEnabled"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  vrEnabled?: boolean

  @Expose({name: "vrPlanImageUrl"})
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  vrPlanImageUrl?: string

  @Expose({name: "metaTitle"})
  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string

  @Expose({name: "metaDescription"})
  @IsOptional()
  @IsString()
  metaDescription?: string

  @Expose({name: "metaKeywords"})
  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaKeywords?: string

  @Expose({name: "customSchema"})
  @IsOptional()
  @IsString()
  customSchema?: string

  @IsOptional() @Transform(({value}) => toBool(value)) @IsBoolean() noindex?: boolean

  @Expose({name: "isFeatured"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  isFeatured?: boolean

  @Expose({name: "featureSort"})
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  featureSort?: number

  @Expose({name: "promoTitle"})
  @IsOptional()
  @IsString()
  @MaxLength(120)
  promoTitle?: string

  @Expose({name: "promoBadge"})
  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoBadge?: string

  @Expose({name: "promoActive"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  promoActive?: boolean

  @Expose({name: "discountType"})
  @IsOptional()
  @IsEnum(DiscountTypeDto)
  discountType?: DiscountTypeDto

  @Expose({name: "discountValue"})
  @ValidateIf((o) => o.discountType && o.discountType !== "NONE")
  @Type(() => Number) // ← coerce to number when present
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  discountValue?: number

  @Expose({name: "discountActive"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  discountActive?: boolean

  @Expose({name: "discountStart"})
  @IsOptional()
  @IsISO8601()
  discountStart?: string

  @Expose({name: "discountEnd"})
  @IsOptional()
  @IsISO8601()
  discountEnd?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({each: true}) // ← validate items
  tags?: string[]

  @Expose({name: "complementaryIds"})
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsUUID("4", {each: true}) // ← these are IDs; validate items
  complementaryIds?: string[]
}

export class CreateProductRequestDto {
  @ValidateNested()
  @Type(() => ProductInputDto)
  data!: ProductInputDto
}

export class UpdateProductRequestDto {
  @ValidateNested()                      // 👈 accept nested patch
  @Type(() => ProductInputDto)
  patch!: Partial<ProductInputDto>;      // 👈 remove the `id` field here
}

export class IdRequestDto {
  @IsUUID("4") id!: string
}

export class ListProductsRequestDto {
  @IsOptional() @IsString() q?: string
  @Expose({name: "categoryId"}) @IsOptional() @IsUUID("4") categoryId?: string

  @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number // ← coerce
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) limit?: number

  @Expose({name: "includeDeleted"})
  @IsOptional()
  @Transform(({value}) => toBool(value))
  @IsBoolean()
  includeDeleted?: boolean // ← coerce
}
