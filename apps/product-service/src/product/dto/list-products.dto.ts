import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ProductStatusDto } from './product-input.dto';

export class ListProductsDto {
  @IsOptional() @IsString() q?: string;

  @Expose({ name: 'category_id' })
  @IsOptional() @IsUUID() categoryId?: string;

  @IsOptional() @IsEnum(ProductStatusDto) status?: ProductStatusDto;

  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;

  @Expose({ name: 'include_deleted' })
  @IsOptional() @IsBoolean() includeDeleted?: boolean;
}
