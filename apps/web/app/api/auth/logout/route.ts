import { NextRequest, NextResponse } from "next/server";
import type { GatewayAuthLogoutRequestDto } from "@nebula/api-client";
import {
  GatewayBffRequestError,
  accessTokenFromRequest,
  assertSameOriginSessionRequest,
  bffExceptionResponse,
  clearRefreshCookie,
  gatewayFailureResponse,
  idempotencyKeyFromRequest,
  relayGatewayHeaders,
  serverGatewayClient,
} from "@/lib/gateway/server-client";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginSessionRequest(request);
    const accessToken = accessTokenFromRequest(request);
    if (!accessToken) {
      throw new GatewayBffRequestError(401, "AUTHENTICATION_REQUIRED");
    }
    const input = (await request.json().catch(() => ({}))) as Pick<
      GatewayAuthLogoutRequestDto,
      "allDevices"
    >;
    const result = await serverGatewayClient().request("auth_logout", {
      accessToken,
      browserCookie: request.headers.get("cookie") ?? undefined,
      idempotencyKey: idempotencyKeyFromRequest(request),
      body: input.allDevices === true ? { allDevices: true } : {},
    });
    if (!result.ok) {
      const response = gatewayFailureResponse(result);
      if (!result.headers.get("set-cookie")) clearRefreshCookie(response);
      return response;
    }

    const response = NextResponse.json(result.data);
    relayGatewayHeaders(result, response);
    if (!result.headers.get("set-cookie")) clearRefreshCookie(response);
    return response;
  } catch (error: unknown) {
    console.error("[/api/auth/logout] gateway request failed");
    const response = bffExceptionResponse(error, "LOGOUT_GATEWAY_UNAVAILABLE");
    clearRefreshCookie(response);
    return response;
  }
}
