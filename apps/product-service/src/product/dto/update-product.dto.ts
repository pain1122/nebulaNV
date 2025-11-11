import { Expose, Type } from 'class-transformer';
import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ProductInputDto } from './product-input.dto';

export class UpdateProductDto {
  @IsUUID('4')
  id!: string;

  // Accept proto field "data" and expose as "patch" for the service
  @Expose({ name: 'data' })
  @Type(() => ProductInputDto)
  @ValidateNested()
  @IsOptional()
  patch?: Partial<ProductInputDto>;
}
