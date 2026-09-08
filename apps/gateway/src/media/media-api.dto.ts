import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type, type TransformFnParams } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._()-]*$/;
const SAFE_CONTEXT = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;

function strictBoolean({ value }: TransformFnParams): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export type GatewayMediaLane = "public" | "protected" | "strict";
export type GatewayMediaAccessClass = "PUBLIC" | "PROTECTED" | "STRICT";

export class GatewayMediaListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() path?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) take?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) skip?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) scope?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional({ enum: ["image", "video", "audio", "document"] })
  @IsOptional() @IsIn(["image", "video", "audio", "document"]) mediaType?: string;
  @ApiPropertyOptional({ enum: ["name", "createdAt", "updatedAt", "size"] })
  @IsOptional() @IsIn(["name", "createdAt", "updatedAt", "size"]) sortBy?: string;
  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional() @IsIn(["asc", "desc"]) order?: string;
  @ApiPropertyOptional({ enum: ["PENDING", "READY", "BLOCKED", "DELETED"] })
  @IsOptional() @IsIn(["PENDING", "READY", "BLOCKED", "DELETED"]) status?: string;
  @ApiPropertyOptional({ enum: ["NONE", "QUEUED", "SCANNING", "CLEAN", "INFECTED", "FAILED"] })
  @IsOptional() @IsIn(["NONE", "QUEUED", "SCANNING", "CLEAN", "INFECTED", "FAILED"]) scanStatus?: string;
}

export class GatewayMediaAdminListQueryDto extends GatewayMediaListQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional() @IsUUID("4") ownerId?: string;
}

export class GatewayMediaPresignDto {
  @ApiProperty() @IsString() @Matches(SAFE_FILENAME) filename!: string;
  @ApiProperty() @IsString() mimeType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_FILENAME) displayName?: string;
  @ApiPropertyOptional({ format: "uuid" }) @IsOptional() @IsUUID("4") ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) scope?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityId?: string;
}

export class GatewayMediaFinalizeDto {
  @ApiProperty({ enum: ["s3"] }) @IsIn(["s3"]) storage!: string;
  @ApiProperty() @IsString() path!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() folderPath?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_FILENAME) displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_FILENAME) originalFilename?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bucket?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_FILENAME) filename?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional({ format: "uuid" }) @IsOptional() @IsUUID("4") ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) scope?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sha256?: string;
}

export class GatewayMediaReadUrlQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(strictBoolean) @IsBoolean() download?: boolean;
}

export class GatewayMediaOwnedReadUrlQueryDto extends GatewayMediaReadUrlQueryDto {
  @ApiProperty() @IsString() @Matches(SAFE_CONTEXT) scope!: string;
  @ApiProperty() @IsString() @Matches(SAFE_CONTEXT) entityType!: string;
  @ApiProperty() @IsString() @Matches(SAFE_CONTEXT) entityId!: string;
}

export class GatewayMediaDeleteItemDto {
  @ApiProperty({ enum: ["file", "folder"] })
  @IsIn(["file", "folder"]) type!: "file" | "folder";

  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((item: GatewayMediaDeleteItemDto) => item.type === "file")
  @IsUUID("4") id?: string;

  @ApiPropertyOptional()
  @ValidateIf((item: GatewayMediaDeleteItemDto) => item.type === "folder")
  @IsString() folderPath?: string;
}

export class GatewayMediaDeletePreviewDto {
  @ApiProperty({ type: [GatewayMediaDeleteItemDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => GatewayMediaDeleteItemDto)
  items!: GatewayMediaDeleteItemDto[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() recursive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(SAFE_CONTEXT) scope?: string;
}

export class GatewayMediaDeleteConfirmDto extends GatewayMediaDeletePreviewDto {
  @ApiProperty() @IsString() confirmToken!: string;
}

export class GatewayMediaRenderQueryDto {
  @ApiPropertyOptional({ enum: ["web"] }) @IsOptional() @IsIn(["web"]) variant?: "web";
}

export class GatewayMediaDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() storage!: string;
  @ApiProperty() bucket!: string;
  @ApiProperty() path!: string;
  @ApiProperty() filename!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() sizeBytes!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty() durationSec!: number;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ enum: ["private", "public"] }) visibility!: string;
  @ApiProperty() scope!: string;
  @ApiProperty() sha256!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty() status!: string;
  @ApiProperty() scanStatus!: string;
  @ApiProperty() quarantineReason!: string;
  @ApiProperty() etag!: string;
  @ApiProperty() promotedAt!: string;
  @ApiProperty({ enum: ["PUBLIC", "PROTECTED", "STRICT"] }) accessClass!: GatewayMediaAccessClass;
  @ApiProperty() folderPath!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() originalFilename!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
}

export class GatewayMediaPresignResultDto {
  @ApiProperty() storage!: string;
  @ApiProperty() bucket!: string;
  @ApiProperty() path!: string;
  @ApiProperty({ format: "uri" }) uploadUrl!: string;
  @ApiProperty() expiresIn!: number;
  @ApiProperty() filename!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() visibility!: string;
  @ApiProperty() scope!: string;
  @ApiProperty() accessClass!: GatewayMediaAccessClass;
  @ApiProperty() folderPath!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() originalFilename!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
  @ApiProperty() ownerId!: string;
}

export class GatewayMediaReadUrlResultDto {
  @ApiProperty({ format: "uri" }) url!: string;
  @ApiProperty() expiresIn!: number;
  @ApiProperty() accessClass!: GatewayMediaAccessClass;
  @ApiProperty() filename!: string;
  @ApiProperty() mimeType!: string;
}

export class GatewayMediaDeleteResultDto {
  @ApiProperty() deleted!: boolean;
}

export class GatewayMediaDeleteWarningDto {
  @ApiProperty() code!: string;
  @ApiProperty() folderPath!: string;
  @ApiProperty() fileCount!: number;
  @ApiProperty() limit!: number;
}

export class GatewayMediaDeleteFolderDto {
  @ApiProperty() type!: string;
  @ApiProperty() folderPath!: string;
  @ApiProperty() fileCount!: number;
}

export class GatewayMediaDeleteFileDto {
  @ApiProperty() type!: string;
  @ApiProperty() id!: string;
  @ApiProperty() folderPath!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() path!: string;
  @ApiProperty() sizeBytes!: string;
  @ApiProperty() mimeType!: string;
}

export class GatewayMediaDeletePreviewResultDto {
  @ApiProperty() scope!: string;
  @ApiProperty() recursive!: boolean;
  @ApiProperty() canDelete!: boolean;
  @ApiProperty({ type: [GatewayMediaDeleteWarningDto] }) warnings!: readonly GatewayMediaDeleteWarningDto[];
  @ApiProperty() fileCount!: number;
  @ApiProperty() folderCount!: number;
  @ApiProperty() totalSizeBytes!: string;
  @ApiProperty({ type: [GatewayMediaDeleteFolderDto] }) folders!: readonly GatewayMediaDeleteFolderDto[];
  @ApiProperty({ type: [GatewayMediaDeleteFileDto] }) files!: readonly GatewayMediaDeleteFileDto[];
  @ApiProperty() confirmToken!: string;
  @ApiProperty() expiresIn!: number;
}

export class GatewayMediaDeleteConfirmResultDto {
  @ApiProperty() deleted!: boolean;
  @ApiProperty() fileCount!: number;
  @ApiProperty() folderCount!: number;
  @ApiProperty() totalSizeBytes!: string;
}
