import { BadRequestException } from "@nestjs/common";

export function descriptiveText(
  value: unknown,
  field: string,
  limit: number,
): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (
    typeof value !== "string" ||
    Array.from(value).length > limit ||
    /\p{Cc}/u.test(value)
  ) {
    throw new BadRequestException(`${field}_invalid`);
  }
  return value;
}

export function textPatch(
  value: unknown,
  clear: unknown,
  field: string,
  limit: number,
) {
  if (clear !== undefined && typeof clear !== "boolean")
    throw new BadRequestException(`${field}_clear_invalid`);
  if (clear === true && value !== undefined)
    throw new BadRequestException(`${field}_patch_conflict`);
  return clear === true ? null : descriptiveText(value, field, limit);
}
