import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class GatewayTaxonomyListQueryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  kind!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  parentId?: string;
}

export class GatewayTaxonomyWriteDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  kind!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @MaxLength(180)
  slug!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class GatewayTaxonomyPatchDto extends PartialType(
  OmitType(GatewayTaxonomyWriteDto, ["kind"] as const),
) {}

export class GatewayTaxonomyDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ enum: ["product", "blog"] }) scope!: "product" | "blog";
  @ApiProperty() kind!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() parentId!: string;
  @ApiProperty() path!: string;
  @ApiProperty() isHidden!: boolean;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() hasChildren!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class GatewayTaxonomyDeleteResultDto {
  @ApiProperty() success!: boolean;
}
