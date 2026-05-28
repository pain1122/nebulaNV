import type { TaxonomyDto } from "@nebula/clients";

export type BlogTaxonomyRecord = TaxonomyDto & {
  hasChildren?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export function dateishToString(value: string | Date | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}
