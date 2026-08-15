import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  GATEWAY_ERROR_CODES,
  GATEWAY_VALIDATION_CODES,
  type GatewayErrorCode,
  type GatewayValidationCode,
} from "./api-envelope";

export class GatewayValidationDetailDto {
  @ApiProperty({ example: "body.email" })
  field!: string;

  @ApiProperty({ enum: GATEWAY_VALIDATION_CODES })
  code!: GatewayValidationCode;
}

export class GatewayErrorBodyDto {
  @ApiProperty({ enum: GATEWAY_ERROR_CODES })
  code!: GatewayErrorCode;

  @ApiProperty({ example: "Request validation failed" })
  message!: string;

  @ApiPropertyOptional({ type: () => [GatewayValidationDetailDto] })
  details?: GatewayValidationDetailDto[];
}

export class GatewayErrorEnvelopeDto {
  @ApiProperty({ type: () => GatewayErrorBodyDto })
  error!: GatewayErrorBodyDto;

  @ApiProperty({ example: "01953f6e-7f52-7a21-9b2b-680df5e7077d" })
  requestId!: string;
}

export class GatewayItemEnvelopeDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  data!: Record<string, unknown>;

  @ApiProperty({ example: "01953f6e-7f52-7a21-9b2b-680df5e7077d" })
  requestId!: string;
}

export class PageLimitTotalPaginationDto {
  @ApiProperty({ enum: ["page-limit-total"] })
  profile!: "page-limit-total";

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;
}

export class TotalOnlyPaginationDto {
  @ApiProperty({ enum: ["total-only"] })
  profile!: "total-only";

  @ApiProperty({ minimum: 0 })
  total!: number;
}

export class OffsetTakePaginationDto {
  @ApiProperty({ enum: ["offset-take"] })
  profile!: "offset-take";

  @ApiProperty({ minimum: 0 })
  skip!: number;

  @ApiProperty({ minimum: 1 })
  take!: number;
}

export class UnpaginatedPaginationDto {
  @ApiProperty({ enum: ["unpaginated"] })
  profile!: "unpaginated";
}

export class GatewayCollectionMetaDto {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(PageLimitTotalPaginationDto) },
      { $ref: getSchemaPath(TotalOnlyPaginationDto) },
      { $ref: getSchemaPath(OffsetTakePaginationDto) },
      { $ref: getSchemaPath(UnpaginatedPaginationDto) },
    ],
  })
  pagination!:
    | PageLimitTotalPaginationDto
    | TotalOnlyPaginationDto
    | OffsetTakePaginationDto
    | UnpaginatedPaginationDto;
}

export class GatewayCollectionEnvelopeDto {
  @ApiProperty({
    type: "array",
    items: { type: "object", additionalProperties: true },
  })
  data!: Record<string, unknown>[];

  @ApiProperty({ type: () => GatewayCollectionMetaDto })
  meta!: GatewayCollectionMetaDto;

  @ApiProperty({ example: "01953f6e-7f52-7a21-9b2b-680df5e7077d" })
  requestId!: string;
}

export const GATEWAY_OPENAPI_EXTRA_MODELS = Object.freeze([
  GatewayValidationDetailDto,
  GatewayErrorBodyDto,
  GatewayErrorEnvelopeDto,
  GatewayItemEnvelopeDto,
  PageLimitTotalPaginationDto,
  TotalOnlyPaginationDto,
  OffsetTakePaginationDto,
  UnpaginatedPaginationDto,
  GatewayCollectionMetaDto,
  GatewayCollectionEnvelopeDto,
]);
