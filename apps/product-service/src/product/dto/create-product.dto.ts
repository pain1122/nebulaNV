import { Type } from "class-transformer";
import { IsDefined, ValidateNested } from "class-validator";
import { ProductInputDto } from "./product-input.dto";

export class CreateProductDto {
  @IsDefined()
  @Type(() => ProductInputDto)
  @ValidateNested()
  data!: ProductInputDto;
}
