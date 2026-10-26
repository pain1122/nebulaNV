import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class ImageDerivativesDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  recipes?: unknown[];
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  retryFailed?: boolean;
}

export class ImageDerivativesGrpcDto {
  @IsUUID() id!: string;
  @IsString() @MaxLength(16_384) recipesJson!: string;
  @IsBoolean() retryFailed!: boolean;
}
