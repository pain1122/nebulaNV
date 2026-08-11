import type { CorsOptionsDelegate } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { NextFunction, Request, Response } from "express";
import {
  GATEWAY_PUBLIC_CLIENT_HEADER,
  PUBLIC_CLIENT_ID_PATTERN,
  type ApplicationRegistry,
  type AuthenticatedActorIdentity,
  type GatewayActorState,
  type GatewayRequestContext,
} from "../application/application.contracts";
import {
  ANONYMOUS_ACTOR,
  createGatewayRequestContext,
} from "../application/application-context";
import { normalizeLookupOrigin } from "../application/application-origin";

export const GATEWAY_CORS_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Nebula-Client-ID",
  "Idempotency-Key",
  "X-Request-ID",
] as const;

export const GATEWAY_CORS_EXPOSED_HEADERS = ["X-Request-ID"] as const;

const UNTRUSTED_CONTEXT_HEADERS = new Set([
  "x-application-id",
  "x-application-profile",
  "x-channel-id",
  "x-channel-kind",
  "x-request-id",
  "x-site-id",
  "x-tenant-id",
  "x-user-id",
  "x-user-role",
]);

export type GatewayHttpRequest = Request & {
  requestId?: string;
  requestContext?: GatewayRequestContext;
  actor?: GatewayActorState;
  user?: AuthenticatedActorIdentity;
  accessToken?: string;
};

function requestPath(request: Request): string {
  return (request.path || request.originalUrl || request.url || "/").split(
    "?",
    1,
  )[0];
}

function isGatewayApiRequest(request: Request): boolean {
  const path = requestPath(request);
  return path === "/api/v1" || path.startsWith("/api/v1/");
}

function rawHeaderValues(request: Request, headerName: string): string[] {
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

function stripUntrustedContextHeaders(request: Request): void {
  for (const headerName of Object.keys(request.headers)) {
    if (
      headerName.startsWith("x-s2s-") ||
      headerName === "x-svc" ||
      headerName.startsWith("x-svc-") ||
      UNTRUSTED_CONTEXT_HEADERS.has(headerName)
    ) {
      delete request.headers[headerName];
    }
  }
}

function identityFailure(
  response: Response,
  status: number,
  message: string,
): void {
  response.status(status).json({
    statusCode: status,
    error:
      status === 400
        ? "Bad Request"
        : status === 403
          ? "Forbidden"
          : "Internal Server Error",
    message,
  });
}

export function createGatewayApplicationContextMiddleware(
  registry: ApplicationRegistry,
): (
  request: GatewayHttpRequest,
  response: Response,
  next: NextFunction,
) => void {
  return (request, response, next) => {
    if (!isGatewayApiRequest(request) || request.method === "OPTIONS") {
      next();
      return;
    }

    const clientIds = rawHeaderValues(request, GATEWAY_PUBLIC_CLIENT_HEADER);
    const origins = rawHeaderValues(request, "origin");
    stripUntrustedContextHeaders(request);

    if (
      clientIds.length !== 1 ||
      !PUBLIC_CLIENT_ID_PATTERN.test(clientIds[0] ?? "")
    ) {
      identityFailure(
        response,
        400,
        "A single valid x-nebula-client-id header is required",
      );
      return;
    }
    if (origins.length > 1) {
      identityFailure(response, 400, "At most one Origin header is allowed");
      return;
    }

    void registry
      .resolve({ clientId: clientIds[0], origin: origins[0] })
      .then((record) => {
        if (!record) {
          identityFailure(
            response,
            403,
            "Application identity was not accepted",
          );
          return;
        }
        if (!request.requestId) {
          identityFailure(
            response,
            500,
            "Trusted request identity is unavailable",
          );
          return;
        }

        request.requestContext = createGatewayRequestContext(
          record,
          request.requestId,
        );
        request.actor = ANONYMOUS_ACTOR;
        delete request.user;
        delete request.accessToken;
        next();
      })
      .catch(next);
  };
}

function acceptedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): string | false {
  if (!origin) return false;
  try {
    return allowedOrigins.includes(normalizeLookupOrigin(origin))
      ? origin
      : false;
  } catch {
    return false;
  }
}

export function createGatewayCorsOptionsDelegate(
  registry: ApplicationRegistry,
): CorsOptionsDelegate<Request> {
  return (request, callback) => {
    if (!isGatewayApiRequest(request)) {
      callback(null, { origin: false });
      return;
    }

    const originValues = rawHeaderValues(request, "origin");
    if (originValues.length > 1) {
      callback(null, { origin: false });
      return;
    }

    void registry
      .allowedBrowserOrigins()
      .then((allowedOrigins) => {
        callback(null, {
          origin: acceptedCorsOrigin(originValues[0], allowedOrigins),
          credentials: false,
          methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: [...GATEWAY_CORS_ALLOWED_HEADERS],
          exposedHeaders: [...GATEWAY_CORS_EXPOSED_HEADERS],
          maxAge: 600,
          optionsSuccessStatus: 204,
        });
      })
      .catch(() => callback(null, { origin: false }));
  };
}
