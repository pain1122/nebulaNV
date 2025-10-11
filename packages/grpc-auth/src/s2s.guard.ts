import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Metadata } from '@grpc/grpc-js';
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
    // Honor @Public() — skip S2S check entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler?.(),
      ctx.getClass?.(),
    ]);
    if (isPublic) return true;

    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined;
    if (!meta) throw new UnauthorizedException('missing_metadata');

    const header = resolveS2SSignHeader();
    const sig = (meta.get?.(header)?.[0] as string) || '';
    const svc = (meta.get?.(X_SVC_HEADER)?.[0] as string) || '';

    if (!sig) throw new UnauthorizedException('missing_s2s_signature');

    const secrets = resolveInboundS2SSecrets();
    if (secrets.length === 0) throw new UnauthorizedException('s2s_not_configured');

    const now = minuteBucket();
    for (const secret of secrets) {
      const candidates = [
        hmac(secret, `${svc}:${now}`),
        hmac(secret, `${svc}:${now - 1}`),
        hmac(secret, `${now}`),       // compat (no svc)
        hmac(secret, `${now - 1}`),   // compat (no svc)
      ];
      if (candidates.includes(sig)) return true;
    }

    throw new UnauthorizedException('invalid_s2s_signature');
  }
}
