import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  MaxLength,
  Matches,
  IsBoolean,
} from "class-validator";

export class MediaMetadataDto {
  @IsInt() @Min(1) @Max(2147483646) expectedVersion!: number;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\P{Cc}*$/u)
  title?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^\P{Cc}*$/u)
  defaultAlt?: string | null;
}

export class MediaMetadataGrpcDto extends MediaMetadataDto {
  @IsUUID("4") id!: string;
  @IsOptional() @IsBoolean() clearTitle?: boolean;
  @IsOptional() @IsBoolean() clearDefaultAlt?: boolean;
}
