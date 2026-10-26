import { Prisma, DiscountType, type Product } from "../../prisma/generated";

// One calculation for catalogue replies and the stock transaction's price check.
export function effectiveProductPrice(
  product: Pick<
    Product,
    | "price"
    | "discountType"
    | "discountValue"
    | "discountActive"
    | "discountStart"
    | "discountEnd"
  >,
  now = new Date(),
  basePrice = new Prisma.Decimal(product.price),
): Prisma.Decimal {
  const value = product.discountValue
    ? new Prisma.Decimal(product.discountValue)
    : null;
  const outsideWindow =
    (product.discountStart !== null && now < product.discountStart) ||
    (product.discountEnd !== null && now > product.discountEnd);
  if (
    !product.discountActive ||
    !product.discountType ||
    value === null ||
    value.isNegative() ||
    outsideWindow
  )
    return basePrice;
  const discounted =
    product.discountType === DiscountType.PERCENTAGE
      ? basePrice.mul(new Prisma.Decimal(100).minus(value)).div(100)
      : basePrice.minus(value);
  return (
    discounted.isNegative() ? new Prisma.Decimal(0) : discounted
  ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
