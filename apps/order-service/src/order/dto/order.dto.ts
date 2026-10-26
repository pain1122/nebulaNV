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
import { Type } from "class-transformer";

export enum OrderStatusDto {
  PENDING = "PENDING",
  PAYMENT_PROCESSING = "PAYMENT_PROCESSING",
  PAID = "PAID",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED",
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatusDto)
  status!: OrderStatusDto;
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
}

export enum DemoPaymentOutcomeDto {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN",
}

export class StartDemoPaymentDto {
  @IsInt()
  @Min(1)
  @Max(2147483645)
  expectedVersion!: number;
}

export class ResolveDemoPaymentDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion!: number;
  @IsEnum(DemoPaymentOutcomeDto)
  outcome!: DemoPaymentOutcomeDto;
}

export class AddToCartDto {
  @IsUUID("4")
  productId!: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID("4")
  variantId?: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity!: number;
}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminOrderListDto {
  @IsOptional() @IsEnum(OrderStatusDto) status?: OrderStatusDto;
  @IsOptional() @IsUUID("4") userId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
