import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

import { ROLES_KEY, Role } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

import {
  AUTH_SERVICE,
  AUTH_SERVICE_NAME,
  AUTHORIZATION_HEADER,
  X_USER_ID_HEADER,
  X_SVC_HEADER,
  resolveS2SSignHeader,
  resolveInboundS2SSecrets,
  resolvePublicMode,
} from './tokens';

import { authv1 } from '@nebula/protos';

type PublicMode = 'OPEN' | 'OPTIONAL_AUTH' | 'GATEWAY_ONLY';

interface AuthGrpc {
  validateToken(
    req: authv1.ValidateTokenRequest,
    meta?: Metadata
  ): Observable<authv1.ValidateTokenResponse>;
}

function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

@Injectable()
export class GrpcTokenAuthGuard implements CanActivate, OnModuleInit {
  private auth!: AuthGrpc;
  private readonly publicMode: PublicMode;

  constructor(
    @Inject(AUTH_SERVICE) private readonly client: ClientGrpc,
    private readonly reflector: Reflector
  ) {
    this.publicMode = resolvePublicMode();
  }

  onModuleInit() {
    this.auth = this.client.getService<AuthGrpc>(AUTH_SERVICE_NAME);
  }

  // ---------------------------- Helpers ----------------------------
  private parseBearer(h?: string | null): string | null {
    if (!h) return null;
    const [type, val] = h.split(' ');
    return type?.toLowerCase() === 'bearer' && val ? val : null;
  }

  private extractMeta(ctx: ExecutionContext): Metadata | undefined {
    return ctx.getArgByIndex?.(1) as Metadata | undefined;
  }

  private extractToken(ctx: ExecutionContext): string | null {
    const httpReq = ctx.switchToHttp().getRequest?.();
    let token = this.parseBearer(httpReq?.headers?.[AUTHORIZATION_HEADER]);
    if (!token) {
      const meta = this.extractMeta(ctx);
      token = this.parseBearer(meta?.get?.(AUTHORIZATION_HEADER)?.[0] as string);
    }
    return token;
  }

  private extractUserId(meta?: Metadata): string | null {
    const v = meta?.get?.(X_USER_ID_HEADER)?.[0] as string | undefined;
    return v && typeof v === 'string' && v.length > 0 ? v : null;
  }

  /** Accept HMACs signed with any inbound secret; payloads:
   *  - `${svc}:${bucket}` (preferred)
   *  - `${bucket}` (compat)
   *  Check both current and previous bucket.
   */
  private verifyS2S(meta?: Metadata): boolean {
    const header = resolveS2SSignHeader();
    const sig = meta?.get?.(header)?.[0] as string | undefined;
    if (!sig) return false;

    const svc = (meta?.get?.(X_SVC_HEADER)?.[0] as string | undefined) ?? '';
    const now = minuteBucket();
    const secrets = resolveInboundS2SSecrets();
    if (secrets.length === 0) return false;

    for (const secret of secrets) {
      const candidates = [
        hmac(secret, `${svc}:${now}`),
        hmac(secret, `${svc}:${now - 1}`),
        hmac(secret, `${now}`),
        hmac(secret, `${now - 1}`),
      ];
      if (candidates.includes(sig)) return true;
    }
    return false;
  }

  // --------------- Attach / get user on ctx (HTTP or RPC) ---------------
  private setCtxUser(ctx: ExecutionContext, user: any) {
    const type = ctx.getType<'rpc' | 'http'>();
    if (type === 'http') {
      const req = ctx.switchToHttp().getRequest?.();
      if (req) (req as any).user = user;
    } else if (type === 'rpc') {
      const meta = this.extractMeta(ctx) as any;
      if (meta && typeof meta.set === 'function') meta.user = user;
      const call = ctx.switchToRpc().getContext?.();
      if (call) (call as any).user = user;
      (ctx as any).user = user;
    }
  }

  private getCtxUser(ctx: ExecutionContext): any {
    return (
      (ctx.switchToHttp().getRequest?.() as any)?.user ??
      (ctx.switchToRpc().getContext?.() as any)?.user ??
      (this.extractMeta(ctx) as any)?.user ??
      (ctx as any)?.user
    );
  }

  // ------------------------- JWT validation -------------------------
  private async attachUserFromToken(ctx: ExecutionContext, token: string) {
    const res = await firstValueFrom(
      this.auth.validateToken(authv1.ValidateTokenRequest.create({ token }))
    );
    if (!res.isValid) throw new UnauthorizedException('token_invalid_or_expired');

    const payload = jwt.decode(token) as jwt.JwtPayload | null;
    if (payload?.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      const SKEW_SEC = 30;
      if (payload.exp + SKEW_SEC < nowSec) {
        throw new UnauthorizedException('token_expired');
      }
    }

    this.setCtxUser(ctx, { userId: res.userId, email: res.email, role: res.role });
  }

  // ---------------------------- Core policy ----------------------------
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // OPEN mode = allow everything as guest
    if (this.publicMode === 'OPEN') {
      this.setCtxUser(ctx, { userId: null, role: 'guest' });
      return true;
    }

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || false;

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) || [];

    const meta = this.extractMeta(ctx);
    const token = this.extractToken(ctx);

    // 1) JWT present → strict path: validate + enforce roles
    if (token) {
      await this.attachUserFromToken(ctx, token);

      // If public mode is GATEWAY_ONLY, you may choose to *also* require S2S; keep strict.
      if (this.publicMode === 'GATEWAY_ONLY' && !this.verifyS2S(meta)) {
        throw new UnauthorizedException('s2s_signature_required');
      }

      // Enforce roles if declared
      const user = this.getCtxUser(ctx);
      if (requiredRoles.length && !requiredRoles.includes(user?.role as Role)) {
        throw new ForbiddenException('Insufficient role');
      }
      return true;
    }

    // 2) No JWT → consider S2S (HMAC) path
    const hasS2S = this.verifyS2S(meta);
    const userId = this.extractUserId(meta);

    if (hasS2S) {
      // Role-protected endpoints require JWT; HMAC alone is not enough
      if (requiredRoles.length) {
        throw new UnauthorizedException('Bearer token required for role-protected endpoint');
      }
      // Attach propagated identity (may be null if not provided)
      this.setCtxUser(ctx, { userId: userId ?? null, role: undefined });
      return true;
    }

    // 3) Public endpoints without JWT
    if (isPublic) {
      if (this.publicMode === 'OPTIONAL_AUTH') {
        // Allow as guest
        this.setCtxUser(ctx, { userId: null, role: 'guest' });
        return true;
      }
      if (this.publicMode === 'GATEWAY_ONLY') {
        // Must have valid S2S even if public
        throw new UnauthorizedException('s2s_signature_required');
      }
    }

    // 4) Otherwise, block
    throw new UnauthorizedException('Missing Bearer token or S2S signature');
  }
}
