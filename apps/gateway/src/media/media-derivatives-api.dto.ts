import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from "class-validator";

export const IMAGE_VIEWS = ["thumbnail", "card", "detail", "mobile"] as const;
export type ImageView = (typeof IMAGE_VIEWS)[number];

export class ImageCropDto {
  @ApiProperty() @IsInt() @Min(0) left!: number;
  @ApiProperty() @IsInt() @Min(0) top!: number;
  @ApiProperty() @IsInt() @Min(1) width!: number;
  @ApiProperty() @IsInt() @Min(1) height!: number;
}
export class ImageFocalPointDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(1) x!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(1) y!: number;
}
export class ImageWatermarkDto {
  @ApiProperty({ enum: ["text", "image"] }) @IsIn(["text", "image"]) kind!:
    | "text"
    | "image";
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  text?: string;
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  mediaId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024)
  width?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(256)
  height?: number;
  @ApiPropertyOptional({
    enum: ["top-left", "top-right", "bottom-left", "bottom-right"],
  })
  @IsOptional()
  @IsIn(["top-left", "top-right", "bottom-left", "bottom-right"])
  position?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(256)
  margin?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  opacity?: number;
}
export class ImageRecipeDto {
  @ApiProperty({ enum: IMAGE_VIEWS }) @IsIn(IMAGE_VIEWS) view!: ImageView;
  @ApiProperty() @IsInt() @Min(1) @Max(4096) width!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(4096) height!: number;
  @ApiPropertyOptional({ enum: ["inside", "cover"] })
  @IsOptional()
  @IsIn(["inside", "cover"])
  fit?: "inside" | "cover";
  @ApiPropertyOptional({ enum: ["webp", "png", "jpeg"] })
  @IsOptional()
  @IsIn(["webp", "png", "jpeg"])
  format?: "webp" | "png" | "jpeg";
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;
  @ApiPropertyOptional({ type: ImageCropDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageCropDto)
  crop?: ImageCropDto;
  @ApiPropertyOptional({ type: ImageFocalPointDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageFocalPointDto)
  focalPoint?: ImageFocalPointDto;
  @ApiPropertyOptional({ type: ImageWatermarkDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageWatermarkDto)
  watermark?: ImageWatermarkDto;
}
export class GatewayImageRegenerationDto {
  @ApiPropertyOptional({ type: [ImageRecipeDto], minItems: 1, maxItems: 4 })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => ImageRecipeDto)
  recipes?: ImageRecipeDto[];
  @ApiPropertyOptional({ default: false })
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  retryFailed?: boolean;
}
export class GatewaySavedImageSizeDto {
  @ApiProperty({ enum: IMAGE_VIEWS }) view!: ImageView;
  @ApiProperty({ format: "uuid" }) generationId!: string;
  @ApiProperty() recipeHash!: string;
  @ApiProperty() sha256!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() renderPath!: string;
}
export class GatewayImageDerivativesDto {
  @ApiProperty({ format: "uuid" }) mediaId!: string;
  @ApiProperty() desiredGenerationId!: string;
  @ApiProperty() approvedGenerationId!: string;
  @ApiProperty({
    enum: ["NONE", "QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
  })
  status!: string;
  @ApiProperty() lastError!: string;
  @ApiProperty() attempts!: number;
  @ApiProperty({ type: [GatewaySavedImageSizeDto] })
  outputs!: readonly GatewaySavedImageSizeDto[];
}
