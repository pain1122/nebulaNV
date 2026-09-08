import type {
  GatewayProductDto,
  GatewayProductPatchDto,
  GatewayProductWriteDto,
} from "@nebula/api-client";

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function productCreateInput(value: unknown): GatewayProductWriteDto {
  const input = record(record(value)?.data);
  if (!input) throw new Error("product_data_envelope_required");
  return input as GatewayProductWriteDto;
}

export function productPatchInput(value: unknown): GatewayProductPatchDto {
  const input = record(record(value)?.patch);
  if (!input) throw new Error("product_patch_envelope_required");
  return input as GatewayProductPatchDto;
}

export function productForCurrentUi(product: GatewayProductDto) {
  return Object.freeze({ ...product, content: product.description });
}
