import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";
export class GatewayMetadataTitleDto {
  @ApiProperty({ minimum: 1, maximum: 2147483646 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\P{Cc}*$/u)
  title?: string | null;
}
export class GatewayMediaMetadataDto extends GatewayMetadataTitleDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^\P{Cc}*$/u)
  defaultAlt?: string | null;
}
export class GatewayGalleryMetadataDto extends GatewayMetadataTitleDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^\P{Cc}*$/u)
  alt?: string | null;
}
