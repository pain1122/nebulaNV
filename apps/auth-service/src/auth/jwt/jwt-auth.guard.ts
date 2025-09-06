import {
    CanActivate, ExecutionContext, Injectable,
    UnauthorizedException, ForbiddenException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { ConfigService } from '@nestjs/config';
  import { Reflector } from '@nestjs/core';
  import type { Metadata } from '@grpc/grpc-js';
  import { ROLES_KEY, Role, IS_PUBLIC_KEY  } from '@nebula/grpc-auth';
  
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    constructor(
      private readonly jwt: JwtService,
      private readonly cfg: ConfigService,
      private readonly reflector: Reflector,
    ) {}
  
    canActivate(ctx: ExecutionContext): boolean {
      // 0) Public routes are allowed
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (isPublic) return true;
  
      // 1) Try HTTP header
      const req = ctx.switchToHttp().getRequest?.();
      let token = this.getBearer(req?.headers?.authorization as string | undefined);
  
      // 2) Fall back to gRPC metadata
      if (!token) {
        const md = ctx.switchToRpc().getContext?.() as Metadata | undefined;
        const auth = md?.get?.('authorization')?.[0] as string | undefined;
        token = this.getBearer(auth);
      }
      if (!token) throw new UnauthorizedException('Missing Bearer token');
  
      // 3) Verify locally with ACCESS secret
      const secret = this.cfg.get<string>('JWT_ACCESS_SECRET');
      let payload: any;
      try {
        payload = this.jwt.verify(token, { secret });
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
  
      // 4) Attach user
      const user = { userId: payload.sub, email: payload.email, role: payload.role };
      if (req) (req as any).user = user;
      else {
        const rpcCtx: any = ctx.switchToRpc().getContext?.() ?? {};
        rpcCtx.user = user;
      }
  
      // 5) Enforce @Roles() if present
      const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
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
  