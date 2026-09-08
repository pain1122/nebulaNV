import { NextRequest, NextResponse } from "next/server";
import type { GatewayAuthLoginRequestDto } from "@nebula/api-client";
import {
  bffExceptionResponse,
  gatewayFailureResponse,
  relayGatewayHeaders,
  serverGatewayClient,
} from "@/lib/gateway/server-client";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GatewayAuthLoginRequestDto & {
      remember?: boolean;
    };
    const result = await serverGatewayClient().request("auth_login", {
      body: { identifier: body.identifier, password: body.password },
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
    console.error("[/api/auth/login] gateway request failed");
    return bffExceptionResponse(error, "LOGIN_GATEWAY_UNAVAILABLE");
  }
}
