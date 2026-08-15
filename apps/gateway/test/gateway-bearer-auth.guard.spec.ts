import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  ROLE_MIN_KEY,
  ROLES_KEY,
  type Role,
} from "@nebula/grpc-auth";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import { GatewayBearerAuthGuard } from "../src/auth/gateway-bearer-auth.guard";
import type { GatewayAuthResolver } from "../src/auth/gateway-auth-resolver";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { gatewayRateLimitTracker } from "../src/http/rate-limit";
import { GATEWAY_ROUTE_POLICY_METADATA } from "../src/http/gateway-route-policy";

const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-auth-123",
  applicationId: "storefront-web",
  applicationProfile: "storefront-web",
  tenantId: "tenant-main",
  siteId: "site-main",
  channelId: "web",
  channelKind: "web",
  rateLimitProfile: "default",
});

function handlerWith(options: {
  public?: boolean;
  internalOnly?: boolean;
  roles?: Role[];
  minimumRole?: Role;
  routeId?: string;
}): () => void {
  const handler = () => undefined;
  if (options.public) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  if (options.internalOnly) {
    Reflect.defineMetadata(INTERNAL_ONLY_KEY, true, handler);
  }
  if (options.roles) Reflect.defineMetadata(ROLES_KEY, options.roles, handler);
  if (options.minimumRole) {
    Reflect.defineMetadata(ROLE_MIN_KEY, options.minimumRole, handler);
  }
  if (options.routeId) {
    Reflect.defineMetadata(
      GATEWAY_ROUTE_POLICY_METADATA,
      options.routeId,
      handler,
    );
  }
  return handler;
}

function gatewayRequest(
  authorization?: string,
  rawAuthorizationValues?: string[],
): GatewayHttpRequest {
  const rawHeaders = (rawAuthorizationValues ?? []).flatMap((value) => [
    "Authorization",
    value,
  ]);
  return {
    headers: authorization ? { authorization } : {},
    rawHeaders,
    requestContext,
    socket: { remoteAddress: "127.0.0.1" },
  } as GatewayHttpRequest;
}

function httpContext(
  request: GatewayHttpRequest,
  handler: () => void,
): ExecutionContext {
  return {
    getType: () => "http",
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getArgByIndex: () => undefined,
    getArgs: () => [],
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe("GatewayBearerAuthGuard", () => {
  const resolve = jest.fn();
  let guard: GatewayBearerAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new GatewayBearerAuthGuard(new Reflector(), {
      resolve,
    } as unknown as GatewayAuthResolver);
  });

  it("keeps public requests anonymous when no bearer is supplied", async () => {
    const request = gatewayRequest();

    await expect(
      guard.canActivate(httpContext(request, handlerWith({ public: true }))),
    ).resolves.toBe(true);
    expect(request.actor).toEqual({ kind: "anonymous" });
    expect(request.user).toBeUndefined();
    expect(request.accessToken).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("requires a bearer for private or role-protected routes", async () => {
    await expect(
      guard.canActivate(httpContext(gatewayRequest(), handlerWith({}))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(
        httpContext(
          gatewayRequest(),
          handlerWith({ public: true, roles: ["admin"] }),
        ),
      ),
    ).rejects.toMatchObject({ message: "bearer_required" });
  });

  it("rejects malformed, duplicate, and oversized Authorization values", async () => {
    const handler = handlerWith({ public: true });
    for (const request of [
      gatewayRequest("Basic copied"),
      gatewayRequest(undefined, ["Bearer one", "Bearer two"]),
      gatewayRequest(`Bearer ${"x".repeat(8193)}`),
    ]) {
      await expect(
        guard.canActivate(httpContext(request, handler)),
      ).rejects.toMatchObject({ message: "authorization_header_invalid" });
    }
    expect(resolve).not.toHaveBeenCalled();
  });

  it("attaches only resolver truth and makes rate limiting actor-aware", async () => {
    resolve.mockResolvedValue({
      kind: "authenticated",
      identity: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    });
    const request = gatewayRequest("Bearer opaque-not-locally-decoded");

    await expect(
      guard.canActivate(httpContext(request, handlerWith({}))),
    ).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledWith(
      "opaque-not-locally-decoded",
      requestContext,
    );
    expect(request.user).toEqual({
      userId: "user-1",
      role: "user",
      sessionRef: "session-ref-1",
    });
    expect(request.accessToken).toBe("opaque-not-locally-decoded");
    expect(gatewayRateLimitTracker(request)).toBe(
      '["application","storefront-web","actor","user-1"]',
    );
  });

  it("enforces exact and minimum roles after Auth resolution", async () => {
    resolve.mockResolvedValue({
      kind: "authenticated",
      identity: {
        userId: "user-1",
        role: "user",
        sessionRef: "session-ref-1",
      },
    });
    await expect(
      guard.canActivate(
        httpContext(
          gatewayRequest("Bearer opaque"),
          handlerWith({ roles: ["admin", "root-admin"] }),
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        httpContext(
          gatewayRequest("Bearer opaque"),
          handlerWith({ minimumRole: "admin" }),
        ),
      ),
    ).rejects.toMatchObject({ message: "role_too_low" });
  });

  it("enforces the manifest application profile before route execution", async () => {
    await expect(
      guard.canActivate(
        httpContext(
          gatewayRequest(),
          handlerWith({ public: true, routeId: "admin.products.create" }),
        ),
      ),
    ).rejects.toMatchObject({ message: "application_profile_not_allowed" });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("fails closed on invalid Auth truth, missing API context, and internal-only routes", async () => {
    resolve.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        httpContext(gatewayRequest("Bearer expired"), handlerWith({})),
      ),
    ).rejects.toMatchObject({ message: "token_invalid_or_expired" });

    const missingContext = gatewayRequest();
    delete missingContext.requestContext;
    await expect(
      guard.canActivate(httpContext(missingContext, handlerWith({}))),
    ).rejects.toMatchObject({ message: "gateway_request_context_missing" });
    await expect(
      guard.canActivate(
        httpContext(gatewayRequest(), handlerWith({ internalOnly: true })),
      ),
    ).rejects.toMatchObject({
      message: "gateway_internal_route_not_supported",
    });
  });

  it("leaves unversioned public operational routes independent of API identity", async () => {
    const health = gatewayRequest("Bearer ignored-on-operational-route");
    delete health.requestContext;
    await expect(
      guard.canActivate(httpContext(health, handlerWith({ public: true }))),
    ).resolves.toBe(true);
    expect(resolve).not.toHaveBeenCalled();
  });
});
