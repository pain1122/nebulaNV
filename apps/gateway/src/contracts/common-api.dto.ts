import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class GatewayUuidPathDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;
}
