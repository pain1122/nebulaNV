import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export enum OrderStatusDto {
  PENDING = "PENDING",
  PAID = "PAID",
  FULFILLED = "FULFILLED",
  CANCELLED = "CANCELLED",
}

export class AddToCartDto {
  @IsUUID("4")
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  note?: string;
}
