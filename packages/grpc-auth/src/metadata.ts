// packages/grpc-auth/src/metadata.ts
import { Metadata } from "@grpc/grpc-js";
import {
  firstMetadataValue,
  getContextUser,
  metadataValueToString,
  type ContextCarrier,
  type MetadataWithContext,
} from "./context";
import { buildS2SMetadata, mergeMetadata, withUser } from "./s2s";

export type CtxUser = { userId: string; role?: string; email?: string };

/** Build gRPC metadata with an Authorization: Bearer header. */
export function bearer(token?: string | null): Metadata | undefined {
  if (!token) return undefined;
  const md = new Metadata();
  md.set("authorization", `Bearer ${token}`); // grpc-js uses lowercase keys
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
  opts?: { userId?: string | null },
): Metadata {
  const md = new Metadata();

  if (token) {
    md.set("authorization", `Bearer ${token}`);
  }

  const s2s = buildS2SMetadata();
  for (const key of Object.keys(s2s.getMap())) {
    const vals = s2s.get(key);
    for (const value of vals) md.add(key, value);
  }

  if (opts?.userId) md.set("x-user-id", String(opts.userId));

  console.debug("[authAndS2S -> metadata keys]", Object.keys(md.getMap()));
  return md;
}

export function withAuth(opts: {
  bearer?: string | null;
  userId?: string | null;
  s2s?: { svc?: string; secret?: string } | boolean;
}): Metadata {
  const a = bearer(opts.bearer);
  const b = opts.s2s
    ? buildS2SMetadata(
        typeof opts.s2s === "object"
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
  userId?: string | null,
): Metadata | undefined {
  if (!md) return undefined;
  return withUser(md, userId ?? undefined);
}

export function tokenFromMeta(meta?: Metadata): string | undefined {
  if (!meta) return undefined;
  const raw = metadataValueToString(meta.get("authorization")?.[0]);
  if (!raw) return undefined;
  const [type, val] = raw.split(" ");
  return type?.toLowerCase() === "bearer" ? val : undefined;
}

/** Resolve caller user context from (call.user | meta.user | headers). */
export function resolveCtxUser(
  meta?: MetadataWithContext,
  call?: ContextCarrier,
): CtxUser | null {
  const user = getContextUser(call) ?? getContextUser(meta);
  if (user?.userId) {
    return {
      userId: user.userId,
      role: user.role,
      email: user.email,
    };
  }

  const id = firstMetadataValue(meta, "x-user-id");
  if (!id) return null;

  const role = firstMetadataValue(meta, "x-user-role") ?? "user";
  const email = firstMetadataValue(meta, "x-user-email");
  return { userId: id, role, email };
}
