import {
  createGatewayClient,
  type GatewayClient,
  type GatewayFailure,
  type GatewayFetch,
  type GatewayResult,
} from "@nebula/api-client";
import { NextResponse } from "next/server";

type HeaderSource = Readonly<{
  headers: Readonly<{ get(name: string): string | null }>;
}>;

type BrowserRequestSource = HeaderSource & Readonly<{ url: string }>;

export class GatewayBffRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

function configured(name: string, developmentFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`web_gateway_configuration_missing:${name}`);
  }
  return developmentFallback;
}

function normalizedOrigin(value: string, errorCode: string): string {
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(errorCode);
    }
    return parsed.origin;
  } catch {
    throw new Error(errorCode);
  }
}

export function webGatewayConfiguration() {
  const baseUrl = normalizedOrigin(
    configured(
      "NEBULA_GATEWAY_API_BASE_URL",
      "http://127.0.0.1:3002",
    ),
    "web_gateway_base_url_invalid",
  );
  const applicationOrigin = normalizedOrigin(
    configured("NEBULA_APPLICATION_ORIGIN", "http://localhost:3000"),
    "web_gateway_application_origin_invalid",
  );
  const publicClientId = configured(
    "NEBULA_PUBLIC_CLIENT_ID",
    "admin-web-local",
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(publicClientId)) {
    throw new Error("web_gateway_public_client_id_invalid");
  }
  return Object.freeze({ baseUrl, applicationOrigin, publicClientId });
}

const serverFetch: GatewayFetch = async (url, init) =>
  fetch(url, {
    method: init.method,
    headers: { ...init.headers },
    ...(init.body === undefined ? {} : { body: init.body }),
    cache: "no-store",
  });

export function serverGatewayClient(): GatewayClient {
  return createGatewayClient({
    ...webGatewayConfiguration(),
    fetch: serverFetch,
  });
}

export function assertSameOriginSessionRequest(
  request: BrowserRequestSource,
): void {
  const configuredOrigin = webGatewayConfiguration().applicationOrigin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  let requestOrigin: string | undefined;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = undefined;
  }
  if (
    requestOrigin !== configuredOrigin ||
    origin !== configuredOrigin ||
    !fetchSite ||
    !["same-origin", "none"].includes(fetchSite)
  ) {
    throw new GatewayBffRequestError(403, "BROWSER_SESSION_REQUEST_DENIED");
  }
}

export function accessTokenFromRequest(request: HeaderSource): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

export function requireAccessToken(request: HeaderSource): string {
  const token = accessTokenFromRequest(request);
  if (!token) {
    throw new GatewayBffRequestError(401, "AUTHENTICATION_REQUIRED");
  }
  return token;
}

export function idempotencyKeyFromRequest(request: HeaderSource): string {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) throw new GatewayBffRequestError(400, "IDEMPOTENCY_KEY_REQUIRED");
  return key;
}

export function gatewayFailureResponse(failure: GatewayFailure): NextResponse {
  const response = NextResponse.json(failure.error ?? {
    error: {
      code: "UPSTREAM_ERROR",
      message: "Gateway request failed",
      requestId: failure.requestId ?? "unavailable",
    },
  }, { status: failure.status });
  relayGatewayHeaders(failure, response);
  return response;
}

export function relayGatewayHeaders(
  result: GatewayResult<unknown>,
  response: NextResponse,
): void {
  const requestId = result.headers.get("x-request-id");
  if (requestId) response.headers.set("x-request-id", requestId);
  const setCookie = result.headers.get("set-cookie");
  if (setCookie) response.headers.append("set-cookie", setCookie);
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

export function bffExceptionResponse(
  error: unknown,
  fallbackCode: string,
): NextResponse {
  const status = error instanceof GatewayBffRequestError ? error.status : 502;
  const code = error instanceof GatewayBffRequestError ? error.code : fallbackCode;
  return NextResponse.json(
    {
      error: {
        code,
        message: status === 502 ? "Gateway request failed" : "Request denied",
        requestId: "unavailable",
      },
    },
    { status },
  );
}
