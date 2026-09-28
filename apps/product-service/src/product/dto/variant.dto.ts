import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class VariantInputDto {
  @IsString() @MaxLength(120) sku!: string;
  @IsObject() options!: Record<string, string>;
  @IsOptional() @IsNumber() @Min(0) priceOverride?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2_147_483_647) stockQuantity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) sortOrder?: number;
}

export class VariantPatchDto {
  @IsOptional() @IsString() @MaxLength(120) sku?: string;
  @IsOptional() @IsObject() options?: Record<string, string>;
  @IsOptional() @IsNumber() @Min(0) priceOverride?: number;
  @IsOptional() @IsBoolean() clearPriceOverride?: boolean;
  @IsOptional() @IsBoolean() replaceOptions?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(2_147_483_647) stockQuantity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) sortOrder?: number;
}

export class CreateVariantDto {
  @IsUUID("4") productId!: string;
  @IsInt() @Min(1) @Max(2_147_483_647) expectedVersion!: number;
  @IsDefined()
  @ValidateNested()
  @Type(() => VariantInputDto)
  data!: VariantInputDto;
}

export class UpdateVariantDto {
  @IsUUID("4") productId!: string;
  @IsUUID("4") variantId!: string;
  @IsInt() @Min(1) @Max(2_147_483_647) expectedVersion!: number;
  @IsDefined()
  @ValidateNested()
  @Type(() => VariantPatchDto)
  data!: VariantPatchDto;
}

export class DeleteVariantDto {
  @IsUUID("4") productId!: string;
  @IsUUID("4") variantId!: string;
  @IsInt() @Min(1) @Max(2_147_483_647) expectedVersion!: number;
}
