import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Metadata } from '@grpc/grpc-js';
import * as crypto from 'crypto';

function hmac(secret: string, svc: string, bucket: number): string {
  return crypto.createHmac('sha256', secret).update(`${svc}:${bucket}`).digest('hex');
}

@Injectable()
export class S2SGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    // Only meaningful for gRPC; HTTP can short-circuit
    const meta = ctx.getArgByIndex?.(1) as Metadata | undefined;
    if (!meta) throw new UnauthorizedException('missing_metadata');

    const header = process.env.GATEWAY_HEADER ?? 'x-gateway-sign';
    const sig = (meta.get?.(header)?.[0] as string) || '';
    const svc = (meta.get?.('x-svc')?.[0] as string) || '';

    if (!sig || !svc) throw new UnauthorizedException('missing_s2s_signature');

    const secret = process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET;
    if (!secret) throw new UnauthorizedException('s2s_not_configured');

    const nowBucket = Math.floor(Date.now() / 60000);
    const expectedNow = hmac(secret, svc, nowBucket);
    const expectedPrev = hmac(secret, svc, nowBucket - 1); // skew tolerance

    if (sig !== expectedNow && sig !== expectedPrev) {
      throw new UnauthorizedException('invalid_s2s_signature');
    }

    return true;
  }
}
