import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { status, Metadata } from '@grpc/grpc-js';
import * as crypto from 'crypto';
import {
  resolveS2SSignHeader,
  resolveInboundS2SSecrets,
  X_SVC_HEADER,
} from './tokens';

function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

@Injectable()
export class S2SGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // 1️⃣ Skip if marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler?.(),
      ctx.getClass?.(),
    ]);
    if (isPublic) return true;

    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined;
    if (!meta) return this.deny(ctx, 'missing_metadata');

    const header = resolveS2SSignHeader();
    const sig = (meta.get?.(header)?.[0] as string) || '';
    const svc = (meta.get?.(X_SVC_HEADER)?.[0] as string) || '';


    if (!sig) return this.deny(ctx, 'missing_s2s_signature');

    const secrets = resolveInboundS2SSecrets();
    if (secrets.length === 0) return this.deny(ctx, 's2s_not_configured');

    const now = minuteBucket();
    for (const secret of secrets) {
      const candidates = [
        hmac(secret, `${svc}:${now}`),
        hmac(secret, `${svc}:${now - 1}`),
        hmac(secret, `${svc}:${now + 1}`), // tolerate small clock skew
        hmac(secret, `${now}`),
        hmac(secret, `${now - 1}`),
        hmac(secret, `${now + 1}`),
      ];
      if (candidates.includes(sig)) return true;
    }

    return this.deny(ctx, 'invalid_s2s_signature');
  }

  /**
   * Utility: throw context-appropriate exceptions
   */
  private deny(ctx: ExecutionContext, message: string): never {
    const type = ctx.getType<'http' | 'rpc'>();
    if (type === 'rpc') {
      throw new RpcException({ code: status.UNAUTHENTICATED, message });
    }
    throw new RpcException({ code: status.UNAUTHENTICATED, message: 'invalid_s2s_signature' });
  }
}
