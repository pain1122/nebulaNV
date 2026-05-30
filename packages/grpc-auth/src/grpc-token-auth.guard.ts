// -----------------------------------------------------------------------------
// GrpcTokenAuthGuard
//
// Central authentication + authorization guard for both HTTP and gRPC calls.
//
// Responsibilities:
//
// 1. Validate JWT access tokens
//    - Fast local signature check first
//    - Always verify with auth-service (revocation + source of truth)
//
// 2. Enforce service-to-service (S2S) access
//    - INTERNAL_ONLY endpoints require verified internal service identity
//    - S2S verification happens in S2SGuard (this guard only checks presence)
//
// 3. Apply PUBLIC / INTERNAL / ROLE hierarchy
//
//    Priority order:
//      OPEN mode → allow everything as guest
//      INTERNAL_ONLY → require svc identity
//      JWT present → enforce role policies
//      PUBLIC endpoint → allow anonymous depending on PublicMode
//      Otherwise → reject
//
// 4. Attach user context to request or RPC metadata
//
// NOTE:
// verifyS2S() was removed because S2S validation must be centralized in
// a dedicated guard to avoid duplicated logic and security drift.
// This guard trusts svc identity only if upstream S2SGuard validated it.
// -----------------------------------------------------------------------------
// ROLE_MIN_KEY
//   → user must have role >= required role
//
// ROLES_KEY
//   → user must have one of allowed roles
//
// ROLES_ALL_KEY
//   → reserved for multi-role users (future use)
//   → currently checks user role is in allowed list

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  OnModuleInit,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom, Observable } from "rxjs";
import type { Metadata } from "@grpc/grpc-js";
import * as jwt from "jsonwebtoken";

import {
  ROLES_KEY,
  Role,
  ROLE_MIN_KEY,
  ROLES_ALL_KEY,
  hasRoleAtLeast,
} from "./roles.decorator";
import {
  IS_PUBLIC_KEY,
  INTERNAL_ONLY_KEY,
  REQUIRE_USER_ID_KEY,
} from "./public.decorator";

import {
  AUTH_SERVICE,
  AUTH_SERVICE_NAME,
  AUTHORIZATION_HEADER,
  X_USER_ID_HEADER,
  resolvePublicMode,
} from "./tokens";
import {
  firstHeaderValue,
  firstMetadataValue,
  getContextService,
  getContextUser,
  type ContextCarrier,
  type ContextUser,
  type HttpRequestWithContext,
  type MetadataWithContext,
  type RpcContextWithContext,
} from "./context";

import { authv1 } from "@nebula/protos";

// PublicMode controls behavior of endpoints marked @Public()
//
// OPEN
//   → Everything allowed, user becomes {guest}
//
// OPTIONAL_AUTH
//   → Public endpoints allow anonymous access
//   → Private endpoints still require JWT
//
// GATEWAY_ONLY
//   → Public endpoints allowed only through trusted gateway
//   → Requires valid S2S identity (svc present)
type PublicMode = "OPEN" | "OPTIONAL_AUTH" | "GATEWAY_ONLY";

interface AuthGrpc {
  validateToken(
    req: authv1.ValidateTokenRequest,
    meta?: Metadata,
  ): Observable<authv1.ValidateTokenResponse>;
}

function asRole(role: string | undefined): Role | undefined {
  switch (role) {
    case "user":
    case "admin":
    case "root-admin":
      return role;
    default:
      return undefined;
  }
}

@Injectable()
export class GrpcTokenAuthGuard implements CanActivate, OnModuleInit {
  // svc is injected into request context by S2SGuard after
  // validating service-to-service signature.
  // This guard only checks its presence when required.
  private auth!: AuthGrpc;
  private readonly publicMode: PublicMode;

  private getSvc(ctx: ExecutionContext): string | null {
    const req = ctx
      .switchToHttp()
      .getRequest<HttpRequestWithContext | undefined>();
    const reqSvc = getContextService(req);
    if (reqSvc) return reqSvc;

    const call = ctx
      .switchToRpc()
      .getContext<RpcContextWithContext | undefined>();
    const callSvc = getContextService(call);
    if (callSvc) return callSvc;

    const metaSvc = getContextService(this.extractMeta(ctx));
    if (metaSvc) return metaSvc;

    const ctxSvc = getContextService(ctx as ExecutionContext & ContextCarrier);
    if (ctxSvc) return ctxSvc;

    return null;
  }

  constructor(
    @Inject(AUTH_SERVICE) private readonly client: ClientGrpc,
    private readonly reflector: Reflector,
  ) {
    this.publicMode = resolvePublicMode();
  }

  onModuleInit(): void {
    this.auth = this.client.getService<AuthGrpc>(AUTH_SERVICE_NAME);
  }

  // ---------------------------- Helpers ----------------------------
  // Extract "Bearer <token>" safely
  // Works for both HTTP headers and gRPC metadata.

  private parseBearer(h?: string | null): string | null {
    if (!h) return null;
    const [type, val] = h.split(" ");
    return type?.toLowerCase() === "bearer" && val ? val : null;
  }

  // Extract gRPC metadata object from execution context.
  // Used to read headers like Authorization in RPC calls.

  private extractMeta(ctx: ExecutionContext): MetadataWithContext | undefined {
    return ctx.getArgByIndex<MetadataWithContext | undefined>(1);
  }

  // Extract Bearer token from HTTP headers or gRPC metadata.
  // Returns null if no Authorization header is present.

  private extractToken(ctx: ExecutionContext): string | null {
    const httpReq = ctx
      .switchToHttp()
      .getRequest<HttpRequestWithContext | undefined>();
    let token = this.parseBearer(
      firstHeaderValue(httpReq?.headers?.[AUTHORIZATION_HEADER]),
    );
    if (!token) {
      const meta = this.extractMeta(ctx);
      token = this.parseBearer(firstMetadataValue(meta, AUTHORIZATION_HEADER));
    }
    return token;
  }

  // ------------------------- Context utilities -------------------------

  private setCtxUser(ctx: ExecutionContext, user: ContextUser): void {
    const type = ctx.getType<"rpc" | "http">();
    if (process.env.NODE_ENV !== "production") {
      console.debug("[GrpcTokenAuthGuard] user attached", {
        userId: user?.userId,
        role: user?.role,
      });
    }
    if (type === "http") {
      const req = ctx
        .switchToHttp()
        .getRequest<HttpRequestWithContext | undefined>();
      if (req) req.user = user;
    } else if (type === "rpc") {
      const meta = this.extractMeta(ctx);
      if (meta) meta.user = user;
      const call = ctx
        .switchToRpc()
        .getContext<RpcContextWithContext | undefined>();
      if (call) call.user = user;
      (ctx as ExecutionContext & ContextCarrier).user = user;
    }
  }

  private getCtxUser(ctx: ExecutionContext): ContextUser | null {
    const req = ctx
      .switchToHttp()
      .getRequest<HttpRequestWithContext | undefined>();
    const call = ctx
      .switchToRpc()
      .getContext<RpcContextWithContext | undefined>();
    const contextCarrier = ctx as ExecutionContext & ContextCarrier;

    return (
      getContextUser(req) ??
      getContextUser(call) ??
      getContextUser(this.extractMeta(ctx)) ??
      getContextUser(contextCarrier) ??
      null
    );
  }

  // Validate token and attach authenticated user.
  //
  // Step 1: Optional local signature check
  //   - Fast rejection if token is obviously invalid.
  //
  // Step 2: Always call auth-service
  //   - Handles revocation
  //   - Handles role changes
  //   - Auth-service is the source of truth.

  private async attachUserFromToken(
    ctx: ExecutionContext,
    token: string,
  ): Promise<void> {
    // 1️⃣ Try local verify first
    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (secret) {
        jwt.verify(token, secret);
      }
    } catch {
      throw new UnauthorizedException("token_invalid");
    }

    // 2️⃣ Always ask auth-service (source of truth)
    const res = await firstValueFrom(
      this.auth.validateToken(authv1.ValidateTokenRequest.create({ token })),
    );

    if (!res.isValid) {
      throw new UnauthorizedException("token_invalid_or_expired");
    }

    this.setCtxUser(ctx, {
      userId: res.userId,
      role: res.role || undefined,
    });
  }

  private resolveRequiredUserId(ctx: ExecutionContext): string | null {
    const ctxUser = this.getCtxUser(ctx);
    if (ctxUser?.userId) return ctxUser.userId;

    const req = ctx
      .switchToHttp()
      .getRequest<HttpRequestWithContext | undefined>();
    const headerUserId = firstHeaderValue(req?.headers?.[X_USER_ID_HEADER]);
    if (headerUserId?.trim()) return headerUserId.trim();

    const meta = this.extractMeta(ctx);
    const metadataUserId = firstMetadataValue(meta, X_USER_ID_HEADER);
    if (metadataUserId) return metadataUserId;

    return null;
  }

  private enforceRequireUserId(ctx: ExecutionContext, required: boolean): void {
    if (!required) return;

    const userId = this.resolveRequiredUserId(ctx);
    if (!userId) throw new UnauthorizedException("missing_user_id");

    const user = this.getCtxUser(ctx);
    if (!user?.userId) {
      this.setCtxUser(ctx, { userId, role: user?.role ?? "user" });
    }
  }

  // ---------------------------- Core policy ----------------------------
  // Core Access Policy
  // INTERNAL_ONLY endpoints must come from a trusted internal service.
  // svc is injected by upstream S2SGuard after signature verification.
  //
  // Order matters:
  //
  // 1. OPEN mode → allow everything as guest
  // 2. INTERNAL_ONLY → require verified internal service identity
  // 3. JWT present → validate token + enforce role decorators
  // 4. PUBLIC endpoint → allow anonymous depending on PublicMode
  // 5. Otherwise → reject request

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // (optional debug)
    if (process.env.NODE_ENV !== "production") {
      const meta = this.extractMeta(ctx);
      const keys = meta?.getMap ? Object.keys(meta.getMap()) : [];
      if (keys.length > 0)
        console.debug("[GrpcTokenAuthGuard] Metadata keys:", keys);
    }

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || false;
    const internalOnly =
      this.reflector.getAllAndOverride<boolean>(INTERNAL_ONLY_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || false;
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || [];
    const requireUserId =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_USER_ID_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || false;

    const token = this.extractToken(ctx);
    const svc = this.getSvc(ctx);

    // OPEN mode = allow everything as guest
    if (this.publicMode === "OPEN") {
      this.setCtxUser(ctx, { userId: null, role: "guest" });
      this.enforceRequireUserId(ctx, requireUserId);
      return true;
    }

    if (internalOnly && !svc) {
      throw new UnauthorizedException("internal_only");
    }

    // JWT present → authenticate user and enforce role decorators.
    // Service identity is assumed to be already validated by S2SGuard.
    if (token) {
      await this.attachUserFromToken(ctx, token);

      // S2SGuard already verified service identity

      const user = this.getCtxUser(ctx);
      const minRole = this.reflector.getAllAndOverride<Role>(ROLE_MIN_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]);

      const userRole = asRole(user?.role);

      if (minRole && !hasRoleAtLeast(userRole, minRole)) {
        throw new ForbiddenException("role_too_low");
      }

      const rolesAll =
        this.reflector.getAllAndOverride<Role[]>(ROLES_ALL_KEY, [
          ctx.getHandler?.(),
          ctx.getClass?.(),
        ]) || [];

      if (
        requiredRoles.length &&
        (!userRole || !requiredRoles.includes(userRole))
      ) {
        throw new ForbiddenException("role_not_allowed");
      }

      if (rolesAll.length && (!userRole || !rolesAll.includes(userRole))) {
        throw new ForbiddenException("missing_roles");
      }
      this.enforceRequireUserId(ctx, requireUserId);
      return true;
    }

    // 2) No JWT → handle public endpoints according to mode
    if (isPublic) {
      if (this.publicMode === "GATEWAY_ONLY") {
        if (!svc) throw new UnauthorizedException("gateway_only");
        this.enforceRequireUserId(ctx, requireUserId);
        return true;
      }

      if (this.publicMode === "OPTIONAL_AUTH") {
        this.setCtxUser(ctx, { userId: null, role: "guest" });
        this.enforceRequireUserId(ctx, requireUserId);
        return true;
      }
    }

    // No token and not allowed as public → reject request.
    if (process.env.NODE_ENV !== "production") {
      console.warn("Auth failed", { svc });
    }
    throw new UnauthorizedException("missing_token_or_signature");
  }
}
