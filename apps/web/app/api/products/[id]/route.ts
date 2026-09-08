import { NextRequest, NextResponse } from "next/server";
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
  productForCurrentUi,
  productPatchInput,
} from "@/lib/gateway/product-adapter";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await serverGatewayClient().request("admin_products_get", {
      accessToken: requireAccessToken(request),
      path: { id },
    });
    if (!result.ok) return gatewayFailureResponse(result);
    const response = NextResponse.json(
      { ...result.data, data: productForCurrentUi(result.data.data) },
      { status: result.status, headers: { "cache-control": "no-store" } },
    );
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/products/:id] gateway read failed");
    return bffExceptionResponse(error, "PRODUCT_READ_GATEWAY_UNAVAILABLE");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    let body;
    try {
      body = productPatchInput(await request.json());
    } catch {
      throw new GatewayBffRequestError(400, "PRODUCT_PATCH_ENVELOPE_REQUIRED");
    }
    const result = await serverGatewayClient().request("admin_products_update", {
      accessToken: requireAccessToken(request),
      idempotencyKey: idempotencyKeyFromRequest(request),
      path: { id },
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
    console.error("[/api/products/:id] gateway update failed");
    return bffExceptionResponse(error, "PRODUCT_UPDATE_GATEWAY_UNAVAILABLE");
  }
}
