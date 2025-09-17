import { Expose } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional,
  IsString, IsUUID, Max, Min
} from 'class-validator';
import { DiscountTypeDto, ProductStatusDto } from './product-input.dto';

export class ApplyDiscountBulkDto {
  // set/clear
  @Expose({ name: 'discount_type' })
  @IsOptional() @IsEnum(DiscountTypeDto) discountType?: DiscountTypeDto;

  @Expose({ name: 'discount_value' })
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) discountValue?: number;

  @Expose({ name: 'discount_active' })
  @IsOptional() @IsBoolean() discountActive?: boolean;

  @Expose({ name: 'discount_start' })
  @IsOptional() @IsISO8601() discountStart?: string;

  @Expose({ name: 'discount_end' })
  @IsOptional() @IsISO8601() discountEnd?: string;

  // filters
  @IsOptional() @IsArray() @ArrayMaxSize(1000)
  ids?: string[];

  @Expose({ name: 'category_id' })
  @IsOptional() @IsUUID() categoryId?: string;

  @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto;
  @IsOptional() @IsString() q?: string;
}
