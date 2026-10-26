import { BadRequestException } from "@nestjs/common";
import { OrderStatus, Prisma } from "../../prisma/generated/client";

export const VISIBLE_ORDER: Prisma.OrderWhereInput = {
  OR: [
    { checkoutAttempt: { is: null } },
    { checkoutAttempt: { is: { state: "COMPLETED" } } },
  ],
};
export type AdminOrderQuery = {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
};
export function adminOrderId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException("invalid_order_identity");
  return value.toLowerCase();
}
export function adminOrderQuery(input: AdminOrderQuery = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("invalid_order_query");
  const page = input.page === undefined ? 1 : input.page;
  const limit = input.limit === undefined ? 20 : input.limit;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1_000_000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new BadRequestException("invalid_order_pagination");
  if (
    input.status !== undefined &&
    !Object.values(OrderStatus).includes(input.status as OrderStatus)
  )
    throw new BadRequestException("invalid_order_status");
  const userId =
    input.userId === undefined ? undefined : adminOrderId(input.userId);
  return {
    page,
    limit,
    status: input.status as OrderStatus | undefined,
    userId,
  };
}
