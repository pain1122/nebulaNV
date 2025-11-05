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

  // ------------------------- Context utilities -------------------------
  private setCtxUser(ctx: ExecutionContext, user: any) {
    const type = ctx.getType<'rpc' | 'http'>();
    console.debug(
      '[GrpcTokenAuthGuard] Attaching user context:',
      JSON.stringify(user)
    );
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

  private async attachUserFromToken(ctx: ExecutionContext, token: string) {
    const res = await firstValueFrom(
      this.auth.validateToken(authv1.ValidateTokenRequest.create({ token }))
    );
    if (!res.isValid){ 
      if (process.env.NODE_ENV !== 'production') {
        console.error('[GrpcTokenAuthGuard] ValidateToken -> isValid=false');
      }
      throw new UnauthorizedException('token_invalid_or_expired');
    }
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
    // (optional debug)
    if (process.env.NODE_ENV !== 'production') {
      const meta = this.extractMeta(ctx);
      const keys = meta?.getMap ? Object.keys(meta.getMap()) : [];
      if (keys.length > 0) console.debug('[GrpcTokenAuthGuard] Metadata keys:', keys);
    }

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

    // 1) JWT present → strict path (optionally also require S2S if GATEWAY_ONLY)
    if (token) {
      await this.attachUserFromToken(ctx, token);

      if (this.publicMode === 'GATEWAY_ONLY' && !this.verifyS2S(meta)) {
        throw new UnauthorizedException('s2s_signature_required');
      }

      const user = this.getCtxUser(ctx);
      if (requiredRoles.length && !requiredRoles.includes(user?.role as Role)) {
        throw new ForbiddenException('insufficient_role');
      }
      return true;
    }

    // 2) No JWT → handle public endpoints according to mode
    if (isPublic) {
      // 2a) Gateway-only public: allow if S2S is valid, attach propagated identity if any
      if (this.publicMode === 'GATEWAY_ONLY') {
        if (!this.verifyS2S(meta)) {
          throw new UnauthorizedException('s2s_signature_required');
        }
        const propagatedId = this.extractUserId(meta);
        // if a gateway propagated a user, attach it; else guest
        this.setCtxUser(ctx, propagatedId ? { userId: propagatedId, role: 'user' } : { userId: null, role: 'guest' });
        return true;
      }

      // 2b) Optional auth public: anonymous allowed
      if (this.publicMode === 'OPTIONAL_AUTH') {
        this.setCtxUser(ctx, { userId: null, role: 'guest' });
        return true;
      }
    }

    // 3) Otherwise block
    throw new UnauthorizedException('missing_token_or_signature');
  }
}
