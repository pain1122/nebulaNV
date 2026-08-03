import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import {
  ROLES_KEY,
  Role,
  IS_PUBLIC_KEY,
  type RpcContextWithContext,
} from '@nebula/grpc-auth';
import type {
  AuthenticatedRequest,
  AuthenticatedRequestUser,
  MetadataWithAuthUser,
} from '../auth.types';
import { AccessTokenValidationService } from '../token/access-token-validation.service';

type ExecutionContextWithAuthUser = ExecutionContext & {
  user?: AuthenticatedRequestUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokenValidationService,
    private readonly reflector: Reflector,
  ) {}

  private isRpc(ctx: ExecutionContext): boolean {
    return ctx.getType<'http' | 'rpc'>() === 'rpc';
  }

  private unauthenticated(ctx: ExecutionContext, message: string): never {
    if (this.isRpc(ctx)) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message,
      });
    }

    throw new UnauthorizedException(message);
  }

  private forbidden(ctx: ExecutionContext, message: string): never {
    if (this.isRpc(ctx)) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message,
      });
    }

    throw new ForbiddenException(message);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
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
    if (!token) this.unauthenticated(ctx, 'Missing Bearer token');

    // 3) Use the same signature, disabled-user, and token-version decision as
    // the public ValidateToken gRPC contract.
    const validation = await this.accessTokens.validate(token);
    if (!validation.valid) {
      this.unauthenticated(ctx, 'Invalid or expired token');
    }
    const user: AuthenticatedRequestUser = {
      userId: validation.payload.sub,
      email: validation.payload.email,
      role: validation.payload.role,
      sessionRef: validation.sessionRef,
    };

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
        ctx.switchToRpc().getContext<RpcContextWithContext | undefined>() ?? {};
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
      this.forbidden(ctx, 'Insufficient role');
    }

    return true;
  }

  private getBearer(h?: string | null): string | null {
    if (!h) return null;
    const [type, val] = h.split(' ');
    return type?.toLowerCase() === 'bearer' && val ? val : null;
  }
}
