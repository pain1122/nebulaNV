import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from "class-validator";
export class ImageMetadataDto {
  @IsInt() @Min(1) @Max(2147483646) expectedVersion!: number;
  @IsOptional() @IsString() @MaxLength(200) title?: string | null;
  @IsOptional() @IsString() @MaxLength(180) alt?: string | null;
}
export class ImageMetadataGrpcDto extends ImageMetadataDto {
  @IsUUID("4") productId!: string;
  @IsUUID("4") imageId!: string;
  @IsOptional() @IsBoolean() clearTitle?: boolean;
  @IsOptional() @IsBoolean() clearAlt?: boolean;
}
