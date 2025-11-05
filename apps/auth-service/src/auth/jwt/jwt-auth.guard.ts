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
import type { Metadata } from '@grpc/grpc-js';
import { ROLES_KEY, Role, IS_PUBLIC_KEY } from '@nebula/grpc-auth';

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

    // 1) Try HTTP header
    const req = ctx.switchToHttp().getRequest?.();
    let token = this.getBearer(req?.headers?.authorization as string | undefined);

    // 2) Fallback to gRPC metadata (second arg)
    if (!token) {
      const md = ctx.getArgByIndex?.(1) as Metadata | undefined;
      const auth = md?.get?.('authorization')?.[0] as string | undefined;
      token = this.getBearer(auth);
    }
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    // 3) Verify locally with ACCESS secret (+ small skew tolerance)
    const secret = this.cfg.get<string>('JWT_ACCESS_SECRET');
    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret });
      // (Optional small skew check is handled by jwt.verify already)
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // 4) Attach user back to context (HTTP + gRPC)
    const user = { userId: payload.sub, email: payload.email, role: payload.role };
    if (req) {
      (req as any).user = user;
    } else {
      const md = ctx.getArgByIndex?.(1) as Metadata | undefined;
      if (md && typeof (md as any).set === 'function') {
        // Not a formal API, but we keep parity with our global guard pattern
        (md as any).user = user;
      }
      const rpcCtx: any = ctx.switchToRpc().getContext?.() ?? {};
      rpcCtx.user = user;
      (ctx as any).user = user;
    }

    // 5) Enforce @Roles() if present
    const required =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        ctx.getHandler?.(),
        ctx.getClass?.(),
      ]) ?? [];
    if (required.length && !required.includes(user.role as Role)) {
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
