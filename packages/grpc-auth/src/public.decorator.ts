import { SetMetadata, applyDecorators } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const PUBLIC_FLAGS_KEY = "publicFlags";
export const INTERNAL_ONLY_KEY = "internalOnly";
export const REQUIRE_USER_ID_KEY = "requireUserId";
export const ALLOWED_S2S_CALLERS_KEY = "allowedS2SCallers";

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

/** Require user context previously attached by verified authentication. */
export function RequireUserId() {
  return SetMetadata(REQUIRE_USER_ID_KEY, true);
}
