import { NextRequest, NextResponse } from "next/server";
import type { GatewayAdminProductListQueryDto } from "@nebula/api-client";
import {
  GatewayBffRequestError,
  bffExceptionResponse,
  gatewayFailureResponse,
  idempotencyKeyFromRequest,
  relayGatewayHeaders,
  requireAccessToken,
  serverGatewayClient,
} from "@/lib/gateway/server-client";
import {
  productCreateInput,
  productForCurrentUi,
} from "@/lib/gateway/product-adapter";

function positiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function listQuery(request: NextRequest): GatewayAdminProductListQueryDto {
  const input = new URL(request.url).searchParams;
  const status = input.get("status");
  return {
    ...(input.get("q") ? { q: input.get("q") ?? undefined } : {}),
    ...(input.get("categoryId")
      ? { categoryId: input.get("categoryId") ?? undefined }
      : {}),
    ...(positiveInteger(input.get("page"))
      ? { page: positiveInteger(input.get("page")) }
      : {}),
    ...(positiveInteger(input.get("limit"))
      ? { limit: positiveInteger(input.get("limit")) }
      : {}),
    ...(status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED"
      ? { status }
      : {}),
    ...(input.get("includeDeleted") === "true" ? { includeDeleted: true } : {}),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = listQuery(request);
    const result = await serverGatewayClient().request("admin_products_list", {
      accessToken: requireAccessToken(request),
      query,
    });
    if (!result.ok) return gatewayFailureResponse(result);

    const pagination = result.data.meta.pagination;
    const page = "page" in pagination ? pagination.page : query.page ?? 1;
    const limit = "limit" in pagination ? pagination.limit : query.limit ?? 20;
    const total = "total" in pagination ? pagination.total : result.data.data.length;
    const response = NextResponse.json(
      {
        ok: true,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        items: result.data.data.map(productForCurrentUi),
      },
      { status: result.status, headers: { "cache-control": "no-store" } },
    );
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/products] gateway list failed");
    return bffExceptionResponse(error, "PRODUCT_LIST_GATEWAY_UNAVAILABLE");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = productCreateInput(await request.json());
    } catch {
      throw new GatewayBffRequestError(400, "PRODUCT_DATA_ENVELOPE_REQUIRED");
    }
    const result = await serverGatewayClient().request("admin_products_create", {
      accessToken: requireAccessToken(request),
      idempotencyKey: idempotencyKeyFromRequest(request),
      body,
    });
    if (!result.ok) return gatewayFailureResponse(result);
    const response = NextResponse.json(
      { ...result.data, data: productForCurrentUi(result.data.data) },
      { status: result.status },
    );
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/products] gateway create failed");
    return bffExceptionResponse(error, "PRODUCT_CREATE_GATEWAY_UNAVAILABLE");
  }
}
