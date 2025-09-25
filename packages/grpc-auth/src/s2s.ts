import { Metadata } from '@grpc/grpc-js';
import * as crypto from 'crypto';

export function buildS2SMetadata(opts?: {
  serviceName?: string;              // who am I
  secret?: string;                   // HMAC key
  headerName?: string;               // header for signature
}): Metadata {
  const svc = opts?.serviceName ?? process.env.SVC_NAME ?? 'unknown-svc';
  const secret = opts?.secret ?? process.env.S2S_SECRET ?? process.env.GATEWAY_SECRET ?? '';
  const header = opts?.headerName ?? process.env.GATEWAY_HEADER ?? 'x-gateway-sign';

  const md = new Metadata();
  if (!secret) return md; // silently no-op if not configured

  const bucket = Math.floor(Date.now() / 60000); // minute bucket
  const payload = `${svc}:${bucket}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  md.set(header, sig);
  md.set('x-svc', svc);
  return md;
}
