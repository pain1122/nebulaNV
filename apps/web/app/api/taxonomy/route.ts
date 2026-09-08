import { NextRequest, NextResponse } from "next/server";
import type { GatewayTaxonomyListQueryDto } from "@nebula/api-client";
import {
  GatewayBffRequestError,
  bffExceptionResponse,
  gatewayFailureResponse,
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

function integer(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const input = new URL(request.url).searchParams;
    const kind = KIND_MAP[(input.get("kind") ?? "") as UiKind];
    if (!kind) throw new GatewayBffRequestError(400, "INVALID_TAXONOMY_KIND");
    const query: GatewayTaxonomyListQueryDto = {
      kind,
      ...(input.get("q") ? { q: input.get("q") ?? undefined } : {}),
      ...(input.get("parentId")
        ? { parentId: input.get("parentId") ?? undefined }
        : {}),
      ...(integer(input.get("page")) ? { page: integer(input.get("page")) } : {}),
      ...(integer(input.get("limit"))
        ? { limit: integer(input.get("limit")) }
        : {}),
    };
    const result = await serverGatewayClient().request(
      "product_taxonomies_list",
      { accessToken: requireAccessToken(request), query },
    );
    if (!result.ok) return gatewayFailureResponse(result);
    const pagination = result.data.meta.pagination;
    const response = NextResponse.json(
      {
        data: result.data.data,
        page: "page" in pagination ? pagination.page : query.page ?? 1,
        limit: "limit" in pagination ? pagination.limit : query.limit ?? 20,
        total:
          "total" in pagination ? pagination.total : result.data.data.length,
      },
      { status: result.status },
    );
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/taxonomy] gateway list failed");
    return bffExceptionResponse(error, "TAXONOMY_LIST_GATEWAY_UNAVAILABLE");
  }
}
