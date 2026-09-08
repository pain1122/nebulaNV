import {
  BadRequestException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayApiException } from "../http/gateway-http-error";

export const GATEWAY_REFRESH_COOKIE_NAME = "refreshToken";
export const GATEWAY_REFRESH_COOKIE_PATH = "/api/auth";

const MAX_COOKIE_HEADER_BYTES = 8192;
const REFRESH_TOKEN_VALUE = /^[A-Za-z0-9._~+/-]+$/;

function rawHeaderValues(
  request: GatewayHttpRequest,
  headerName: string,
): string[] {
  const values: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === headerName) {
      values.push(request.rawHeaders[index + 1] ?? "");
    }
  }
  if (values.length > 0) return values;
  const normalized = request.headers[headerName];
  if (Array.isArray(normalized)) return normalized;
  return normalized === undefined ? [] : [normalized];
}

function invalidSessionInput(field: string): GatewayApiException {
  return new GatewayApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", [
    { field, code: "unsupported_combination" },
  ]);
}

function refreshCookie(request: GatewayHttpRequest): string | undefined {
  const headers = rawHeaderValues(request, "cookie");
  if (headers.length === 0) return undefined;
  if (
    headers.length !== 1 ||
    Buffer.byteLength(headers[0], "utf8") > MAX_COOKIE_HEADER_BYTES
  ) {
    throw new BadRequestException("cookie_header_invalid");
  }

  const matches: string[] = [];
  for (const part of headers[0].split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== GATEWAY_REFRESH_COOKIE_NAME) continue;
    matches.push(part.slice(separator + 1).trim());
  }
  if (matches.length > 1) throw new BadRequestException("cookie_header_invalid");
  const value = matches[0];
  if (value === undefined) return undefined;
  if (!value || !REFRESH_TOKEN_VALUE.test(value)) {
    throw new BadRequestException("refresh_cookie_invalid");
  }
  return value;
}

function requireBrowserCookieCsrf(request: GatewayHttpRequest): void {
  const origins = rawHeaderValues(request, "origin");
  const fetchSites = rawHeaderValues(request, "sec-fetch-site");
  if (
    origins.length !== 1 ||
    !origins[0] ||
    fetchSites.length !== 1 ||
    !["same-origin", "none"].includes(fetchSites[0].toLowerCase())
  ) {
    throw new GatewayApiException(HttpStatus.FORBIDDEN, "ACCESS_DENIED");
  }
  // The application-registry middleware has already compared this single
  // Origin to the immutable record before attaching a web request context.
}

@Injectable()
export class GatewayBrowserSessionService {
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.secure = config.get<string>("NODE_ENV") === "production";
  }

  isBrowser(request: GatewayHttpRequest): boolean {
    const context = request.requestContext;
    if (!context) throw new Error("gateway_request_context_missing");
    return context.channelKind === "web";
  }

  assertBrowserCookieCsrf(request: GatewayHttpRequest): void {
    if (!this.isBrowser(request)) return;
    requireBrowserCookieCsrf(request);
    request.browserCookieCsrfVerified = true;
  }

  private requireBrowserCookieCsrfGate(request: GatewayHttpRequest): void {
    if (request.browserCookieCsrfVerified !== true) {
      throw new Error("gateway_browser_cookie_csrf_gate_missing");
    }
  }

  refreshTokenForRefresh(
    request: GatewayHttpRequest,
    bodyToken: string | undefined,
  ): string {
    if (!this.isBrowser(request)) {
      if (!bodyToken) throw invalidSessionInput("body.refreshToken");
      return bodyToken;
    }
    this.requireBrowserCookieCsrfGate(request);
    const token = refreshCookie(request);
    if (!token) {
      throw new GatewayApiException(
        HttpStatus.UNAUTHORIZED,
        "AUTHENTICATION_REQUIRED",
      );
    }
    return token;
  }

  refreshTokenForLogout(
    request: GatewayHttpRequest,
    bodyToken: string | undefined,
    allDevices: boolean,
  ): string | undefined {
    if (!this.isBrowser(request)) {
      if (!allDevices && !bodyToken) {
        throw invalidSessionInput("body.refreshToken");
      }
      return bodyToken;
    }
    this.requireBrowserCookieCsrfGate(request);
    return refreshCookie(request);
  }

  setRefreshCookie(
    response: Response,
    refreshToken: string,
    expiresInSeconds: number,
  ): void {
    response.cookie(GATEWAY_REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path: GATEWAY_REFRESH_COOKIE_PATH,
      maxAge: expiresInSeconds * 1000,
    });
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(GATEWAY_REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path: GATEWAY_REFRESH_COOKIE_PATH,
    });
  }
}
