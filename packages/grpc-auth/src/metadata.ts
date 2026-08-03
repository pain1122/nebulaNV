import { Metadata } from "@grpc/grpc-js";
import {
  firstHeaderValue,
  getContextUser,
  metadataValueToString,
  type ContextCarrier,
  type MetadataWithContext,
} from "./context";
import {
  buildGrpcS2SMetadata,
  mergeMetadata,
  mergeSignedMetadata,
  withBearer,
  type BuildGrpcS2SMetadataOptions,
} from "./s2s";

export type CtxUser = {
  userId: string;
  role?: string;
  email?: string;
  sessionRef?: string;
};

export function bearer(token?: string | null): Metadata | undefined {
  if (!token) return undefined;
  return withBearer(new Metadata(), token);
}

/** Parse a bearer token from an HTTP-style Authorization header value. */
export function tokenFromAuthorization(
  value?: string | string[] | null,
): string | undefined {
  const raw = firstHeaderValue(value ?? undefined);
  if (!raw) return undefined;
  const [type, token] = raw.split(" ");
  return type?.toLowerCase() === "bearer" && token ? token : undefined;
}

/**
 * Create outbound metadata containing only the actor bearer token. Call this
 * after the inbound guard has verified the token; S2S clients add a fresh,
 * request-bound service signature separately.
 */
export function bearerFromAuthorization(
  value?: string | string[] | null,
): Metadata | undefined {
  return bearer(tokenFromAuthorization(value));
}

/** Build fresh, request-bound S2S metadata plus an optional user JWT. */
export function authAndS2S<TRequest>(
  token: string | null | undefined,
  opts: BuildGrpcS2SMetadataOptions<TRequest> & {
    metadata?: Metadata;
  },
): Metadata {
  const application = mergeMetadata(opts.metadata, bearer(token));
  const signed = buildGrpcS2SMetadata(opts);
  return mergeSignedMetadata(application, signed);
}

export function withAuth<TRequest>(opts: {
  bearer?: string | null;
  metadata?: Metadata;
  s2s: BuildGrpcS2SMetadataOptions<TRequest>;
}): Metadata {
  return authAndS2S(opts.bearer, {
    ...opts.s2s,
    metadata: opts.metadata,
  });
}

export function tokenFromMeta(meta?: Metadata): string | undefined {
  if (!meta) return undefined;
  return tokenFromAuthorization(
    metadataValueToString(meta.get("authorization")?.[0]),
  );
}

/** Copy only a verified actor bearer token from inbound gRPC metadata. */
export function bearerFromMeta(meta?: Metadata): Metadata | undefined {
  return bearer(tokenFromMeta(meta));
}

/** Read only user context attached after verified authentication. */
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
      sessionRef: user.sessionRef,
    };
  }

  return null;
}
