import { Type } from 'class-transformer';
import { ValidateNested, IsUUID } from 'class-validator';
import { ProductInputDto } from './product-input.dto';

export class UpdateProductDto {
  @IsUUID()
  id!: string;

  @Type(() => ProductInputDto)
  @ValidateNested()
  patch!: ProductInputDto;
}
