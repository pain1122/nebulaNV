import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength } from "class-validator";

const SAFE_SETTING_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;

export class GatewaySettingPathDto {
  @ApiProperty({ pattern: SAFE_SETTING_SEGMENT.source })
  @IsString()
  @Matches(SAFE_SETTING_SEGMENT)
  ns!: string;

  @ApiProperty({ pattern: SAFE_SETTING_SEGMENT.source })
  @IsString()
  @Matches(SAFE_SETTING_SEGMENT)
  key!: string;
}

export class GatewaySettingWriteRequestDto {
  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MaxLength(4000)
  value!: string;
}

export class GatewaySettingReadDto {
  @ApiProperty()
  value!: string;

  @ApiProperty()
  found!: boolean;
}

export class GatewaySettingValueDto {
  @ApiProperty()
  value!: string;
}

export class GatewaySettingDeleteResultDto {
  @ApiProperty()
  deleted!: boolean;
}
