import { NextRequest, NextResponse } from "next/server";
import type { GatewayTaxonomyWriteDto } from "@nebula/api-client";
import {
  GatewayBffRequestError,
  bffExceptionResponse,
  gatewayFailureResponse,
  idempotencyKeyFromRequest,
  relayGatewayHeaders,
  requireAccessToken,
  serverGatewayClient,
} from "@/lib/gateway/server-client";

type UiKind =
  | "product_cat"
  | "product_tag"
  | "product_attribute"
  | "product_variable"
  | "product_brand";

const KIND_MAP: Record<UiKind, string> = {
  product_cat: "category.default",
  product_tag: "tag.default",
  product_attribute: "attribute.default",
  product_variable: "variable.default",
  product_brand: "brand.default",
};

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as {
      kind?: UiKind;
      name?: string;
      title?: string;
      slug?: string;
      parentId?: string | null;
      sortOrder?: number;
      isHidden?: boolean;
    };
    const kind = input.kind ? KIND_MAP[input.kind] : undefined;
    if (!kind || !input.slug || !(input.title || input.name)) {
      throw new GatewayBffRequestError(400, "INVALID_TAXONOMY_INPUT");
    }
    const body: GatewayTaxonomyWriteDto = {
      kind,
      slug: input.slug,
      title: input.title || input.name || "",
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.isHidden === undefined ? {} : { isHidden: input.isHidden }),
    };
    const result = await serverGatewayClient().request(
      "admin_product_taxonomies_create",
      {
        accessToken: requireAccessToken(request),
        idempotencyKey: idempotencyKeyFromRequest(request),
        body,
      },
    );
    if (!result.ok) return gatewayFailureResponse(result);
    const response = NextResponse.json(result.data, { status: result.status });
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/taxonomy/create] gateway create failed");
    return bffExceptionResponse(error, "TAXONOMY_CREATE_GATEWAY_UNAVAILABLE");
  }
}
