import { SetMetadata, applyDecorators } from "@nestjs/common";
import type { S2SCallerKind } from "./s2s.crypto";

export const IS_PUBLIC_KEY = "isPublic";
export const PUBLIC_FLAGS_KEY = "publicFlags";
export const INTERNAL_ONLY_KEY = "internalOnly";
export const REQUIRE_USER_ID_KEY = "requireUserId";
export const ALLOWED_S2S_CALLERS_KEY = "allowedS2SCallers";
export const ALLOWED_S2S_IDENTITIES_KEY = "allowedS2SIdentities";

export type AllowedS2SIdentity = Readonly<{
  kind: S2SCallerKind;
  caller: string;
}>;

export type PublicFlags = {
  /** Allow calls without JWT (client may still send JWT). */
  optionalAuth?: boolean;
  /** Allow only if S2S/HMAC signature is valid (no anonymous external). */
  gatewayOnly?: boolean;
};

/**
 * Mark an endpoint as public (no JWT required).
 * You can still constrain it via flags (gatewayOnly/optionalAuth).
 *
 * Examples:
 *  - @Public()                         // fully public (guard may attach guest)
 *  - @Public({ optionalAuth: true })   // try JWT if present, else guest
 *  - @Public({ gatewayOnly: true })    // allow only if S2S/HMAC is valid
 */
export function Public(flags: PublicFlags = {}) {
  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(PUBLIC_FLAGS_KEY, flags),
  );
}

/** Require a verified gateway caller without making user authentication optional. */
export function GatewayOnly() {
  return SetMetadata(PUBLIC_FLAGS_KEY, { gatewayOnly: true });
}

/**
 * Require the request to come from a trusted internal caller
 * (validated by S2S/HMAC in the guard).
 */
export function InternalOnly() {
  return SetMetadata(INTERNAL_ONLY_KEY, true);
}

/** Restrict a signed RPC/route to named service callers. */
export function AllowedS2SCallers(...callers: string[]) {
  return SetMetadata(ALLOWED_S2S_CALLERS_KEY, callers);
}

/** Restrict a signed route to exact caller-kind and caller-name pairs. */
export function AllowedS2SIdentities(...identities: AllowedS2SIdentity[]) {
  if (identities.length === 0) {
    throw new Error("allowed_s2s_identities_empty");
  }
  const seen = new Set<string>();
  const normalized = identities.map((identity) => {
    if (
      (identity.kind !== "service" && identity.kind !== "gateway") ||
      !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/.test(identity.caller)
    ) {
      throw new Error("allowed_s2s_identity_invalid");
    }
    const key = `${identity.kind}:${identity.caller}`;
    if (seen.has(key)) throw new Error("allowed_s2s_identity_duplicate");
    seen.add(key);
    return Object.freeze({ kind: identity.kind, caller: identity.caller });
  });
  return SetMetadata(ALLOWED_S2S_IDENTITIES_KEY, Object.freeze(normalized));
}

/** Require user context previously attached by verified authentication. */
export function RequireUserId() {
  return SetMetadata(REQUIRE_USER_ID_KEY, true);
}
