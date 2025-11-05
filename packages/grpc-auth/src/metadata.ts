// packages/grpc-auth/src/metadata.ts
import { Metadata } from '@grpc/grpc-js';
import { buildS2SMetadata, mergeMetadata, withUser } from './s2s';
export type CtxUser = { userId: string; role?: string; email?: string };

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
export function authAndS2S(token?: string | null, opts?: { userId?: string | null }): Metadata {
  const md = new Metadata();

  // Add Bearer token
  if (token) {
    md.set('authorization', `Bearer ${token}`);
  }

  // Add S2S signature
  const s2s = buildS2SMetadata();
  for (const key of s2s.getMap ? Object.keys(s2s.getMap()) : []) {
    const vals = s2s.get(key);
    if (vals) for (const v of vals) md.add(key, v);
  }

  // Add x-user-id
  if (opts?.userId) md.set('x-user-id', String(opts.userId));

  console.debug('[authAndS2S → metadata keys]', Array.from((md as any).getMap ? Object.keys((md as any).getMap()) : []));
  return md;
}

export function withAuth(opts: {
  bearer?: string | null;
  userId?: string | null;
  s2s?: { svc?: string; secret?: string } | boolean;
}): Metadata {
  const md = new Metadata();
  const a = bearer(opts.bearer);
  const b =
    opts.s2s
      ? buildS2SMetadata(
          typeof opts.s2s === 'object'
            ? { serviceName: opts.s2s.svc, secret: opts.s2s.secret }
            : undefined,
        )
      : undefined;
  const userMd = withUser(new Metadata(), opts.userId ?? undefined);
  return mergeMetadata(mergeMetadata(a, b), userMd);
}


/** Attach/overwrite a propagated user id onto existing metadata. */
export function attachUserId(
  md: Metadata | undefined,
  userId?: string | null
): Metadata | undefined {
  if (!md) return undefined;
  return withUser(md, userId ?? undefined);
}


export function tokenFromMeta(meta?: Metadata): string | undefined {
  if (!meta) return undefined;
  const raw = meta.get('authorization')?.[0] as string | undefined;
  if (!raw) return undefined;
  const [type, val] = raw.split(' ');
  return type?.toLowerCase() === 'bearer' ? val : undefined;
}

/** Resolve caller user context from (call.user | meta.user | headers). */
export function resolveCtxUser(meta?: Metadata, call?: any): CtxUser | null {
  const u = call?.user ?? (meta as any)?.user;
  if (u?.userId) return u as CtxUser;

  const id = meta?.get?.('x-user-id')?.[0];
  if (!id) return null;

  const role = (meta.get?.('x-user-role')?.[0] as string | undefined) ?? 'user';
  const email = meta.get?.('x-user-email')?.[0] as string | undefined;
  return { userId: String(id), role, email };
}