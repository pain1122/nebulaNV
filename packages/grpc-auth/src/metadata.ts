// packages/grpc-auth/src/metadata.ts
import { Metadata } from '@grpc/grpc-js';
import { buildS2SMetadata, mergeMetadata, withUser } from './s2s';

/** Build gRPC metadata with an Authorization: Bearer header. */
export function bearer(token?: string | null): Metadata | undefined {
  if (!token) return undefined;
  const md = new Metadata();
  md.set('authorization', `Bearer ${token}`); // grpc-js uses lowercase keys
  return md;
}

/**
 * Build metadata that includes:
 *  - Bearer token (if provided)
 *  - S2S signature (always, when configured)
 *  - x-user-id (if provided)
 */
export function authAndS2S(
  token?: string | null,
  opts?: { userId?: string | null }
): Metadata {
  const a = bearer(token);
  const b = buildS2SMetadata();                 // S2S signature + x-svc
  const both = mergeMetadata(a, b);             // tolerate undefined nicely
  return withUser(both, opts?.userId ?? undefined);
}

/** Attach/overwrite a propagated user id onto existing metadata. */
export function attachUserId(
  md: Metadata | undefined,
  userId?: string | null
): Metadata | undefined {
  if (!md) return undefined;
  return withUser(md, userId ?? undefined);
}
