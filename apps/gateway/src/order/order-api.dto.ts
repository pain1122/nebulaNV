import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export enum GatewayOrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED",
}

export class GatewayCartAddDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class GatewayCartUpdateDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class GatewayCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class GatewayOrderListQueryDto {
  @ApiPropertyOptional({ enum: GatewayOrderStatus })
  @IsOptional()
  @IsEnum(GatewayOrderStatus)
  status?: GatewayOrderStatus;
}

export class GatewayOrderStatusUpdateDto {
  @ApiProperty({ enum: GatewayOrderStatus })
  @IsEnum(GatewayOrderStatus)
  status!: GatewayOrderStatus;
}

export class GatewayCartItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() meta!: string;
}

export class GatewayCartDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ format: "date-time" }) expiresAt!: string;
  @ApiProperty({ type: [GatewayCartItemDto] }) items!: readonly GatewayCartItemDto[];
}

export class GatewayOrderItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() lineTotal!: string;
  @ApiProperty() meta!: string;
}

export class GatewayOrderDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: GatewayOrderStatus }) status!: GatewayOrderStatus;
  @ApiProperty() currency!: string;
  @ApiProperty() subtotal!: string;
  @ApiProperty() discountTotal!: string;
  @ApiProperty() taxTotal!: string;
  @ApiProperty() total!: string;
  @ApiProperty() shippingAddress!: string;
  @ApiProperty() billingAddress!: string;
  @ApiProperty() meta!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
  @ApiProperty({ type: [GatewayOrderItemDto] }) items!: readonly GatewayOrderItemDto[];
}
