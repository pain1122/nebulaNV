import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateIf,
} from "class-validator";

export enum GatewayOrderStatus {
  PENDING = "PENDING",
  PAYMENT_PROCESSING = "PAYMENT_PROCESSING",
  PAID = "PAID",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED",
}

export enum GatewayDemoPaymentOutcome {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN",
}

export class GatewayDemoPaymentStartDto {
  @ApiProperty({ minimum: 1, maximum: 2147483645 })
  @IsInt()
  @Min(1)
  @Max(2147483645)
  expectedVersion!: number;
}

export class GatewayDemoPaymentOutcomeDto {
  @ApiProperty({ minimum: 1, maximum: 2147483646 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
  @ApiProperty({ enum: GatewayDemoPaymentOutcome })
  @IsEnum(GatewayDemoPaymentOutcome)
  outcome!: GatewayDemoPaymentOutcome;
}

export class GatewayDemoPaymentPathDto {
  @ApiProperty({ format: "uuid" }) @IsUUID("4") id!: string;
  @ApiProperty({ format: "uuid" }) @IsUUID("4") attemptId!: string;
}

export class GatewayAdminOrderListQueryDto {
  @ApiPropertyOptional({ enum: GatewayOrderStatus })
  @IsOptional()
  @IsEnum(GatewayOrderStatus)
  status?: GatewayOrderStatus;
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  userId?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1_000_000, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GatewayCartAddDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  productId!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID("4")
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  quantity!: number;
}

export class GatewayCartUpdateDto {
  @ApiProperty({ minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
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
  @ApiProperty({ minimum: 1, maximum: 2147483646 })
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
}

export class GatewayCartItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() meta!: string;
  @ApiPropertyOptional({ format: "uuid" }) variantId?: string;
  @ApiProperty({ type: "object", additionalProperties: { type: "string" } })
  selectedOptions!: Readonly<Record<string, string>>;
  @ApiProperty() lineTotal!: string;
}

export class GatewayCartDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ format: "date-time" }) expiresAt!: string;
  @ApiProperty({ type: [GatewayCartItemDto] })
  items!: readonly GatewayCartItemDto[];
  @ApiProperty() subtotal!: string;
  @ApiProperty() total!: string;
}

export class GatewayOrderItemDto {
  @ApiPropertyOptional({ format: "uuid" }) variantId?: string;
  @ApiProperty({ type: "object", additionalProperties: { type: "string" } })
  selectedOptions!: Readonly<Record<string, string>>;
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
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 2147483647,
    description:
      "Current Order version; absent only on historical immutable Checkout replay.",
  })
  version?: number;
  @ApiProperty({ enum: ["DEMO_NO_PAYMENT"] }) checkoutMode!: "DEMO_NO_PAYMENT";
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
  @ApiProperty({ type: [GatewayOrderItemDto] })
  items!: readonly GatewayOrderItemDto[];
}

export class GatewayDemoPaymentAttemptDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) orderId!: string;
  @ApiProperty({ enum: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED"] })
  state!: "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  @ApiProperty({ enum: ["DEMO"] }) mode!: "DEMO";
  @ApiProperty() amount!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: ["", "SELECTION_CHANGED"] }) failureCode!:
    | ""
    | "SELECTION_CHANGED";
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
}

export class GatewayDemoPaymentReplyDto {
  @ApiProperty({ type: GatewayOrderDto }) order!: GatewayOrderDto;
  @ApiProperty({ type: GatewayDemoPaymentAttemptDto })
  attempt!: GatewayDemoPaymentAttemptDto;
}
