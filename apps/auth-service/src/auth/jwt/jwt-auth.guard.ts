import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role, IS_PUBLIC_KEY } from '@nebula/grpc-auth';
import type {
  AuthenticatedRequest,
  AuthenticatedRequestUser,
  MetadataWithAuthUser,
  RpcContextWithAuthUser,
} from '../auth.types';
import { isAuthTokenPayload } from '../auth.types';

type ExecutionContextWithAuthUser = ExecutionContext & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    // 0) Public routes → allow
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler?.(),
      ctx.getClass?.(),
    ]);
    if (isPublic) return true;

    // 1) Try HTTP header. In gRPC contexts Nest may still return an object
    // from switchToHttp(), but it is not an Express request with headers.
    const req = ctx
      .switchToHttp()
      .getRequest<AuthenticatedRequest | undefined>();
    const isHttpRequest = !!req?.headers;
    let token = this.getBearer(
      isHttpRequest ? req.headers.authorization : undefined,
    );

    // 2) Fallback to gRPC metadata (second arg)
    if (!token) {
      const md = ctx.getArgByIndex<MetadataWithAuthUser | undefined>(1);
      const rawAuth = md?.get('authorization')?.[0];
      const auth = typeof rawAuth === 'string' ? rawAuth : undefined;
      token = this.getBearer(auth);
    }
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    // 3) Verify locally with ACCESS secret (+ small skew tolerance)
    const secret = this.cfg.get<string>('JWT_ACCESS_SECRET');
    let user: AuthenticatedRequestUser;
    try {
      const verified: unknown = this.jwt.verify(token, { secret });
      if (!isAuthTokenPayload(verified)) {
        throw new UnauthorizedException('Invalid token payload');
      }
      user = {
        userId: verified.sub,
        email: verified.email,
        role: verified.role,
      };
      // (Optional small skew check is handled by jwt.verify already)
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 4) Attach user back to context (HTTP + gRPC)
    if (isHttpRequest && req) {
      req.user = user;
    } else {
      const md = ctx.getArgByIndex<MetadataWithAuthUser | undefined>(1);
      if (md) {
        // Not a formal API, but we keep parity with our global guard pattern
        md.user = user;
      }
      const rpcCtx =
        ctx.switchToRpc().getContext<RpcContextWithAuthUser | undefined>() ??
        {};
      rpcCtx.user = user;
      (ctx as ExecutionContextWithAuthUser).user = user;
    }

    // 5) Enforce @Roles() if present
    const required =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? [];
    if (required.length && !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }

  private getBearer(h?: string | null): string | null {
    if (!h) return null;
    const [type, val] = h.split(' ');
    return type?.toLowerCase() === 'bearer' && val ? val : null;
  }
}
