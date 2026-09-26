import { Expose, Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ProductPatchDto } from "./product-input.dto";

export class UpdateProductDto {
  @IsUUID("4")
  id!: string;

  // Accept proto field "data" and expose as "patch" for the service
  @Expose({ name: "data" })
  @Type(() => ProductPatchDto)
  @ValidateNested()
  @IsOptional()
  patch?: ProductPatchDto;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedVersion!: number;
}
