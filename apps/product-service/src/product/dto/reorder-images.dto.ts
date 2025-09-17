import { Expose, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

class OrderDto {
  @IsUUID() id!: string;
  @IsInt() @Min(0) @Max(1_000_000) sort!: number;
}

export class ReorderImagesDto {
  @Expose({ name: 'product_id' })
  @IsUUID() productId!: string;

  @IsArray() @ArrayMaxSize(200)
  @Type(() => OrderDto)
  @ValidateNested({ each: true })
  orders!: OrderDto[];
}
