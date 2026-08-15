import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  INTERNAL_ONLY_KEY,
  IS_PUBLIC_KEY,
  REQUIRE_USER_ID_KEY,
  ROLE_MIN_KEY,
  ROLES_ALL_KEY,
  ROLES_KEY,
  hasRoleAtLeast,
  type Role,
} from "@nebula/grpc-auth";
import { ANONYMOUS_ACTOR } from "../application/trusted-request";
import type { AuthenticatedActorState } from "../application/application.contracts";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GATEWAY_ROUTE_POLICY_METADATA } from "../http/gateway-route-policy";
import { gatewayRoutePolicy } from "../contracts/route-policy";
import { GatewayAuthResolver } from "./gateway-auth-resolver";

const MAX_BEARER_BYTES = 8192;
const BEARER_VALUE = /^Bearer ([A-Za-z0-9._~+/-]+)$/i;

function authorizationValues(request: GatewayHttpRequest): string[] {
  const values: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === "authorization") {
      values.push(request.rawHeaders[index + 1] ?? "");
    }
  }
  if (values.length > 0) return values;

  const header = request.headers.authorization;
  if (Array.isArray(header)) return header;
  return header === undefined ? [] : [header];
}

function bearerToken(request: GatewayHttpRequest): string | null {
  const values = authorizationValues(request);
  if (values.length === 0) return null;
  if (
    values.length !== 1 ||
    Buffer.byteLength(values[0], "utf8") > MAX_BEARER_BYTES
  ) {
    throw new UnauthorizedException("authorization_header_invalid");
  }
  const match = BEARER_VALUE.exec(values[0]);
  if (!match) throw new UnauthorizedException("authorization_header_invalid");
  return match[1];
}

function attachActor(
  request: GatewayHttpRequest,
  actor: AuthenticatedActorState,
  accessToken: string,
): void {
  request.actor = actor;
  request.user = actor.identity;
  request.accessToken = accessToken;
}

@Injectable()
export class GatewayBearerAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authResolver: GatewayAuthResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler?.();
    const controller = context.getClass?.();
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        handler,
        controller,
      ]) ?? false;
    const internalOnly =
      this.reflector.getAllAndOverride<boolean>(INTERNAL_ONLY_KEY, [
        handler,
        controller,
      ]) ?? false;
    if (internalOnly) {
      throw new ForbiddenException("gateway_internal_route_not_supported");
    }

    const request = context
      .switchToHttp()
      .getRequest<GatewayHttpRequest | undefined>();
    if (!request) throw new UnauthorizedException("gateway_request_missing");

    if (!request.requestContext) {
      if (isPublic) return true;
      throw new UnauthorizedException("gateway_request_context_missing");
    }

    const routeId = this.reflector.getAllAndOverride<string>(
      GATEWAY_ROUTE_POLICY_METADATA,
      [handler, controller],
    );
    if (
      routeId &&
      !gatewayRoutePolicy(routeId).applications.includes(
        request.requestContext.applicationProfile,
      )
    ) {
      throw new ForbiddenException("application_profile_not_allowed");
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        handler,
        controller,
      ]) ?? [];
    const allRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_ALL_KEY, [
        handler,
        controller,
      ]) ?? [];
    const minimumRole = this.reflector.getAllAndOverride<Role>(ROLE_MIN_KEY, [
      handler,
      controller,
    ]);
    const requireUserId =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_USER_ID_KEY, [
        handler,
        controller,
      ]) ?? false;
    const requiresActor =
      !isPublic ||
      requiredRoles.length > 0 ||
      allRoles.length > 0 ||
      minimumRole !== undefined ||
      requireUserId;

    const token = bearerToken(request);
    if (!token) {
      request.actor = ANONYMOUS_ACTOR;
      delete request.user;
      delete request.accessToken;
      if (requiresActor) throw new UnauthorizedException("bearer_required");
      return true;
    }

    const actor = await this.authResolver.resolve(
      token,
      request.requestContext,
    );
    if (!actor) throw new UnauthorizedException("token_invalid_or_expired");
    attachActor(request, actor, token);

    const role = actor.identity.role;
    if (minimumRole && !hasRoleAtLeast(role, minimumRole)) {
      throw new ForbiddenException("role_too_low");
    }
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      throw new ForbiddenException("role_not_allowed");
    }
    if (allRoles.length > 0 && !allRoles.every((item) => item === role)) {
      throw new ForbiddenException("missing_required_roles");
    }
    if (requireUserId && !actor.identity.userId) {
      throw new UnauthorizedException("missing_user_id");
    }

    return true;
  }
}
