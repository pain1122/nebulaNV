import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  applyDecorators,
  SetMetadata,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { from, mergeMap, Observable, of } from "rxjs";
import type { GatewayHttpRequest } from "./public-client-boundary";
import {
  GATEWAY_IDEMPOTENCY_HEADER,
  validateIdempotencyKey,
  validRefreshCookieDeletion,
  type GatewayStoredResponse,
} from "../contracts/idempotency";
import {
  gatewayRoutePolicy,
  type GatewayRoutePolicy,
} from "../contracts/route-policy";
import { validateGatewayInput } from "../contracts/input-profiles";
import { GatewayApiException } from "./gateway-http-error";
import { Public, Roles } from "@nebula/grpc-auth";
import {
  GatewayIdempotencyService,
  type GatewayIdempotencyLease,
} from "../state/gateway-idempotency.service";

export const GATEWAY_ROUTE_POLICY_METADATA = "gateway:route-policy" as const;

export function GatewayRoutePolicyRef(routeId: string): MethodDecorator {
  const policy = gatewayRoutePolicy(routeId);
  const actorDecorator =
    policy.actor === "admin"
      ? Roles("admin", "root-admin")
      : policy.actor === "user"
        ? Roles("user")
      : policy.actor === "authenticated"
        ? Roles("user", "admin", "root-admin")
        : Public({ optionalAuth: policy.actor === "optional" });
  return applyDecorators(
    SetMetadata(GATEWAY_ROUTE_POLICY_METADATA, routeId),
    actorDecorator,
  );
}

function singleHeader(
  request: GatewayHttpRequest,
  name: string,
): string | undefined {
  const value = request.headers[name];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    throw new GatewayApiException(
      HttpStatus.BAD_REQUEST,
      "IDEMPOTENCY_KEY_INVALID",
    );
  }
  const rawMatches = request.rawHeaders.filter(
    (header, index) => index % 2 === 0 && header.toLowerCase() === name,
  );
  if (rawMatches.length !== 1) {
    throw new GatewayApiException(
      HttpStatus.BAD_REQUEST,
      "IDEMPOTENCY_KEY_INVALID",
    );
  }
  return value.trim();
}

function responseHeaders(
  response: Response,
): Readonly<Record<string, string | readonly string[]>> {
  const headers: Record<string, string | readonly string[]> = {};
  for (const name of ["location", "etag"] as const) {
    const value = response.getHeader(name);
    if (typeof value === "string") headers[name] = value;
  }
  const setCookie = response.getHeader("set-cookie");
  const cookieValues =
    typeof setCookie === "string"
      ? [setCookie]
      : Array.isArray(setCookie)
        ? setCookie.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
  if (validRefreshCookieDeletion(cookieValues)) {
    headers["set-cookie"] = Object.freeze([...cookieValues]);
  }
  return Object.freeze(headers);
}

function currentRequestResponse(body: unknown, requestId: string): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return body;
  return { ...(body as Record<string, unknown>), requestId };
}

@Injectable()
export class GatewayRoutePolicyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: GatewayIdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const routeId = this.reflector.getAllAndOverride<string>(
      GATEWAY_ROUTE_POLICY_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!routeId) return next.handle();
    const policy = gatewayRoutePolicy(routeId);
    const http = context.switchToHttp();
    const request = http.getRequest<GatewayHttpRequest>();
    const response = http.getResponse<Response>();
    const requestContext = request.requestContext;
    if (!requestContext) {
      throw new GatewayApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
      );
    }
    const issues = validateGatewayInput(policy.input, {
      body: request.body,
      query: request.query,
      params: request.params,
      applicationProfile: requestContext.applicationProfile,
    });
    if (issues.length > 0) {
      throw new GatewayApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_FAILED",
        issues.map((issue) => ({
          field: issue.field,
          code:
            issue.code === "invalid_container"
              ? "invalid_type"
              : issue.code === "unsupported_value"
                ? "invalid_value"
                : issue.code,
        })),
      );
    }
    const key = singleHeader(request, GATEWAY_IDEMPOTENCY_HEADER);

    if (policy.retry !== "key") {
      if (key !== undefined) {
        throw new GatewayApiException(
          HttpStatus.BAD_REQUEST,
          "IDEMPOTENCY_NOT_SUPPORTED",
        );
      }
      return next.handle();
    }
    if (key === undefined) {
      throw new GatewayApiException(
        HttpStatus.BAD_REQUEST,
        "IDEMPOTENCY_KEY_REQUIRED",
      );
    }
    if (!validateIdempotencyKey(key)) {
      throw new GatewayApiException(
        HttpStatus.BAD_REQUEST,
        "IDEMPOTENCY_KEY_INVALID",
      );
    }

    return from(
      this.begin(
        policy,
        key,
        request,
        requestContext.applicationId,
        request.user?.userId ?? "anonymous",
      ),
    ).pipe(
      mergeMap((begin) => {
        if (begin.kind === "conflict") {
          throw new GatewayApiException(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_CONFLICT",
          );
        }
        if (begin.kind === "in-progress") {
          throw new GatewayApiException(
            HttpStatus.CONFLICT,
            "IDEMPOTENCY_IN_PROGRESS",
          );
        }
        if (begin.kind === "replay") {
          response.status(begin.response.status);
          for (const [name, value] of Object.entries(begin.response.headers)) {
            response.setHeader(name, Array.isArray(value) ? [...value] : value);
          }
          return of(
            currentRequestResponse(
              begin.response.body,
              request.requestId ?? requestContext.requestId,
            ),
          );
        }
        return next
          .handle()
          .pipe(
            mergeMap((body) =>
              from(this.complete(begin.lease, response, body)).pipe(
                mergeMap(() => of(body)),
              ),
            ),
          );
      }),
    );
  }

  private async begin(
    policy: GatewayRoutePolicy,
    key: string,
    request: GatewayHttpRequest,
    applicationId: string,
    actorId: string,
  ) {
    try {
      return await this.idempotency.begin(
        { applicationId, actorId, routeId: policy.id, key },
        {
          method: policy.method,
          routeId: policy.id,
          params: request.params,
          query: request.query,
          body: request.body,
        },
      );
    } catch {
      throw new GatewayApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "IDEMPOTENCY_STORE_UNAVAILABLE",
      );
    }
  }

  private async complete(
    lease: GatewayIdempotencyLease,
    response: Response,
    body: unknown,
  ): Promise<void> {
    const stored: GatewayStoredResponse = Object.freeze({
      status: response.statusCode,
      body: body ?? null,
      headers: responseHeaders(response),
    });
    try {
      await this.idempotency.complete(lease, stored);
    } catch {
      throw new GatewayApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "IDEMPOTENCY_STORE_UNAVAILABLE",
      );
    }
  }
}
