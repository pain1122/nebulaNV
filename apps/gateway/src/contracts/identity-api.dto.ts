import { ApiProperty } from "@nestjs/swagger";
import {
  GATEWAY_ACTOR_ROLES,
  type GatewayActorRole,
} from "../application/application.contracts";

/** Public identity projection shared by Auth and User endpoints. */
export class GatewayUserDto {
  @ApiProperty({ example: "01953f6e-7f52-7a21-9b2b-680df5e7077d" })
  id!: string;

  @ApiProperty({ example: "person@example.com", format: "email" })
  email!: string;

  @ApiProperty({ enum: GATEWAY_ACTOR_ROLES })
  role!: GatewayActorRole;
}
