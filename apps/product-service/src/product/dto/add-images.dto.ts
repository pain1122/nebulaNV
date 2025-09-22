import { Expose, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

class NewImageDto {
  @IsString() @MaxLength(1024) url!: string;
  @IsOptional() @IsString() @MaxLength(180) alt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) sort?: number;
}

export class AddImagesDto {
  @Expose({ name: 'productId' })
  @IsUUID('4') productId!: string;

  @IsArray() @ArrayMaxSize(50)
  @Type(() => NewImageDto)
  @ValidateNested({ each: true })
  images!: NewImageDto[];
}
