import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GATEWAY_ROUTE_POLICY_METADATA } from "../http/gateway-route-policy";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayBrowserSessionService } from "./browser-session";

const COOKIE_SESSION_ROUTES = new Set(["auth.refresh", "auth.logout"]);

/**
 * Runs before the idempotency interceptor, so rejected browser cookie traffic
 * cannot reserve a mutation key before exact-origin/Fetch-Metadata checks pass.
 */
@Injectable()
export class GatewaySessionTransportGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly browserSession: GatewayBrowserSessionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const routeId = this.reflector.getAllAndOverride<string>(
      GATEWAY_ROUTE_POLICY_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!routeId || !COOKIE_SESSION_ROUTES.has(routeId)) return true;

    const request = context.switchToHttp().getRequest<GatewayHttpRequest>();
    this.browserSession.assertBrowserCookieCsrf(request);
    return true;
  }
}
