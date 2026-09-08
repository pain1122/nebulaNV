import { NextRequest, NextResponse } from "next/server";
import {
  GatewayBffRequestError,
  assertSameOriginSessionRequest,
  bffExceptionResponse,
  gatewayFailureResponse,
  relayGatewayHeaders,
  serverGatewayClient,
} from "@/lib/gateway/server-client";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginSessionRequest(request);
    const result = await serverGatewayClient().request("auth_refresh", {
      browserCookie: request.headers.get("cookie") ?? undefined,
    });
    if (!result.ok) return gatewayFailureResponse(result);

    const response = NextResponse.json({
      ok: true,
      accessToken: result.data.data.accessToken,
      accessExpiresInSeconds: result.data.data.accessExpiresInSeconds,
      refreshExpiresInSeconds: result.data.data.refreshExpiresInSeconds,
    });
    relayGatewayHeaders(result, response);
    return response;
  } catch (error: unknown) {
    if (!(error instanceof GatewayBffRequestError)) {
      console.error("[/api/auth/refresh] gateway request failed");
    }
    return bffExceptionResponse(error, "REFRESH_GATEWAY_UNAVAILABLE");
  }
}
