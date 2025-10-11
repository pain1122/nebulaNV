// packages/grpc-auth/src/s2s.ts
import { Metadata } from '@grpc/grpc-js';
import * as crypto from 'crypto';
import {
  resolveServiceName,
  resolveS2SSecret,
  resolveS2SSignHeader,
  X_SVC_HEADER,
  X_SVC_UPSTREAM_HEADER,
  X_USER_ID_HEADER,
} from './tokens';

/** Minute bucket for time-based signatures. */
function minuteBucket(): number {
  return Math.floor(Date.now() / 60000);
}

/** Build HMAC signature payload(s). */
function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Build S2S metadata:
 * - x-gateway-sign: HMAC(secret, `${svc}:${minuteBucket}`)
 * - x-svc: caller service name
 * - (optionally) x-svc-upstream: previous hop chain
 */
export function buildS2SMetadata(opts?: {
  serviceName?: string;     // who am I
  secret?: string;          // shared HMAC key (prefers S2S_SECRET)
  headerName?: string;      // signature header name (default x-gateway-sign)
  upstreamSvc?: string;     // optional upstream trace hint
}): Metadata {
  const svc = opts?.serviceName ?? resolveServiceName();
  const secret = opts?.secret ?? resolveS2SSecret() ?? '';
  const header = opts?.headerName ?? resolveS2SSignHeader();

  const md = new Metadata();

  if (secret) {
    const bucket = minuteBucket();
    const sig = hmac(secret, `${svc}:${bucket}`);
    md.set(header, sig);
  }

  if (svc) md.set(X_SVC_HEADER, svc);
  if (opts?.upstreamSvc) md.set(X_SVC_UPSTREAM_HEADER, opts.upstreamSvc);

  return md;
}

/** Attach the original end-user id into metadata for downstream authZ. */
export function withUser(md: Metadata, userId?: string | null): Metadata {
  if (!userId) return md;
  md.set(X_USER_ID_HEADER, userId);
  return md;
}

/**
 * Merge two Metadata objects, preserving multi-value headers.
 * - Public API only: use .set() for first value and .add() for additional values.
 * - Avoids relying on grpc-js private internals.
 */
export function mergeMetadata(a?: Metadata, b?: Metadata): Metadata {
  if (!a && !b) return new Metadata();
  if (a && !b) return a;
  if (!a && b) return b;

  const out = new Metadata();

  // Helper to copy entries from src into out.
  const copy = (src: Metadata) => {
    // Metadata#getMap() loses multi-values (keeps only the first), so iterate keys via internal structure
    // if available; else fall back to getMap().
    const anySrc = src as any;
    if (anySrc?.internalRepr instanceof Map) {
      for (const [key, vals] of anySrc.internalRepr as Map<string, string[]>) {
        if (!vals || vals.length === 0) continue;
        // Set first, then add the rest to preserve multiplicity
        out.set(key, vals[0]);
        for (let i = 1; i < vals.length; i++) out.add(key, vals[i]);
      }
      return;
    }

    // Fallback: best-effort using getMap (single value per key)
    const map = src.getMap();
    for (const key of Object.keys(map)) {
      const v = (map as Record<string, string>)[key];
      if (v != null) out.set(key, v);
    }
  };

  copy(a!);
  copy(b!);

  return out;
}
