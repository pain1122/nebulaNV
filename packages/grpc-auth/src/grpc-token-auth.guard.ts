import {
  CanActivate, ExecutionContext, Injectable,
  UnauthorizedException, ForbiddenException, Inject, OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

import { ROLES_KEY, Role } from './roles.decorator';
import { AUTH_SERVICE, AUTH_SERVICE_NAME } from './tokens';
import { authv1 } from '@nebula/protos';

interface AuthGrpc {
  validateToken(
    req: authv1.ValidateTokenRequest,
    meta?: Metadata,
  ): Observable<authv1.ValidateTokenResponse>;
}

@Injectable()
export class GrpcTokenAuthGuard implements CanActivate, OnModuleInit {
  private auth!: AuthGrpc;

  constructor(
    @Inject(AUTH_SERVICE) private readonly client: ClientGrpc,
    /** ← inject the shared Reflector, don’t instantiate it */
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.auth = this.client.getService<AuthGrpc>(AUTH_SERVICE_NAME);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    /** ---------- 0) Skip completely if @Public() ---------- */
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler?.(),
      ctx.getClass?.(),
    ]);
    if (isPublic) return true;

    /** ---------- 1) Extract Bearer token ---------- */
    const httpReq = ctx.switchToHttp().getRequest?.();
    let token = this.parseBearer(
      httpReq?.headers?.authorization as string | undefined,
    );

    if (!token) {
      const meta = ctx.getArgByIndex?.(1) as Metadata | undefined;
      token = this.parseBearer(
        (meta?.get?.('authorization')?.[0] as string) || '',
      );
    }
    if (!token) throw new UnauthorizedException('Missing Bearer token');

    /** ---------- 2) Validate via AuthService ---------- */
    const res = await firstValueFrom(
      this.auth.validateToken(
        authv1.ValidateTokenRequest.create({ token }),
      ),
    );
    if (!res.isValid)
      throw new UnauthorizedException('Invalid or expired token');

    /** ---------- 3) Attach user for downstream ---------- */
    const user = { userId: res.userId, email: res.email, role: res.role };
    if (httpReq) (httpReq as any).user = user;
    else (ctx.switchToRpc().getContext() as any).user = user;

    /** ---------- 4) Enforce @Roles() if present ---------- */
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler?.(),
      ctx.getClass?.(),
    ]) ?? [];
    if (required.length && !required.includes(user.role as Role))
      throw new ForbiddenException('Insufficient role');

    return true;
  }

  private parseBearer(h?: string | null): string | null {
    if (!h) return null;
    const [type, val] = h.split(' ');
    return type?.toLowerCase() === 'bearer' && val ? val : null;
  }
}
