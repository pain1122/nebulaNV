import { Expose } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional,
  IsString, IsUUID, Max, Min
} from 'class-validator';
import { DiscountTypeDto, ProductStatusDto } from './product-input.dto';

export class ApplyDiscountBulkDto {
  // set/clear
  @Expose({ name: 'discountType' })
  @IsOptional() @IsEnum(DiscountTypeDto) discountType?: DiscountTypeDto;

  @Expose({ name: 'discountValue' })
  @IsOptional() @IsNumber() @Min(0) @Max(1_000_000) discountValue?: number;

  @Expose({ name: 'discountActive' })
  @IsOptional() @IsBoolean() discountActive?: boolean;

  @Expose({ name: 'discountStart' })
  @IsOptional() @IsISO8601() discountStart?: string;

  @Expose({ name: 'discountEnd' })
  @IsOptional() @IsISO8601() discountEnd?: string;

  // filters
  @IsOptional() @IsArray() @ArrayMaxSize(1000)
  ids?: string[];

  @Expose({ name: 'categoryId' })
  @IsOptional() @IsUUID('4') categoryId?: string;

  @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto;
  @IsOptional() @IsString() q?: string;
}
