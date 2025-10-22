// packages/grpc-auth/src/tokens.ts

// -------------------------------
// 🧩 DI client provider tokens
// -------------------------------
export const AUTH_SERVICE = "AUTH_SERVICE" as const;
export const AUTH_SERVICE_NAME = "AuthService" as const;

export const USER_SERVICE = "USER_SERVICE" as const;
export const USER_SERVICE_NAME = "UserService" as const;

export const PRODUCT_SERVICE = "PRODUCT_SERVICE" as const;
export const PRODUCT_SERVICE_NAME = "ProductService" as const;

export const SETTINGS_SERVICE = "SETTINGS_SERVICE" as const;
export const SETTINGS_SERVICE_NAME = "SettingsService" as const;

export const ORDER_SERVICE = "ORDER_SERVICE" as const;
export const ORDER_SERVICE_NAME = "OrderService" as const;

export const MEDIA_SERVICE = "MEDIA_SERVICE" as const;
export const MEDIA_SERVICE_NAME = "MediaService" as const;

// ---------------------------------------------
// 🔑 Common metadata/header keys (standardized)
// ---------------------------------------------
export const AUTHORIZATION_HEADER = "authorization" as const;        // "Bearer <token>"
export const S2S_SIGNATURE_HEADER_DEFAULT = "x-gateway-sign" as const;
export const X_SVC_HEADER = "x-svc" as const;                        // caller service name
export const X_SVC_UPSTREAM_HEADER = "x-svc-upstream" as const;      // previous hop (trace)
export const X_USER_ID_HEADER = "x-user-id" as const;                // original initiator

// ---------------------------------------------
// 🌱 Env var keys (centralized references)
// ---------------------------------------------
export const ENV_GATEWAY_SECRET = "GATEWAY_SECRET" as const;   // per-service secret (gateway→this service)
export const ENV_S2S_SECRET = "S2S_SECRET" as const;           // shared secret (service↔service)
export const ENV_GATEWAY_HEADER = "GATEWAY_HEADER" as const;   // header name override
export const ENV_SERVICE_NAME = "SERVICE_NAME" as const;       // preferred service name var
export const ENV_SERVICE_NAME_ALT = "SVC_NAME" as const;       // alt service name var
export const ENV_PUBLIC_MODE = "PUBLIC_MODE" as const;         // OPEN | OPTIONAL_AUTH | GATEWAY_ONLY

// ---------------------------------------------
// 🚦 Public mode (typed)
// ---------------------------------------------
export type PublicMode = "OPEN" | "OPTIONAL_AUTH" | "GATEWAY_ONLY";
export const PublicModes = Object.freeze<PublicMode[]>([
  "OPEN",
  "OPTIONAL_AUTH",
  "GATEWAY_ONLY",
]);

// ---------------------------------------------
// 🛠️ Resolvers (stable, side-effect free)
// ---------------------------------------------
/** Resolve signature header name (env override respected). */
export function resolveS2SSignHeader(): string {
  return process.env[ENV_GATEWAY_HEADER] ?? S2S_SIGNATURE_HEADER_DEFAULT;
}

/** Resolve current service name for tagging x-svc on outbound calls. */
export function resolveServiceName(): string {
  return (
    process.env[ENV_SERVICE_NAME] ??
    process.env[ENV_SERVICE_NAME_ALT] ??
    "unknown-svc"
  );
}

/**
 * Resolve the shared S2S secret (service↔service).
 * This MUST be identical across all services (provided from repo root .env).
 */
export function resolveS2SSecret(): string | undefined {
  return process.env[ENV_S2S_SECRET] ?? undefined;
}

/**
 * Resolve the per-service gateway secret (gateway→this service).
 * Each service may have a distinct value in its own .env.
 */
export function resolveGatewaySecret(): string | undefined {
  return process.env[ENV_GATEWAY_SECRET] ?? undefined;
}

/**
 * Inbound verification secrets (try ALL).
 * - S2S: verifies inter-service traffic
 * - Gateway: verifies gateway→service traffic
 */
export function resolveInboundS2SSecrets(): string[] {
  const arr: string[] = [];
  const s2s = resolveS2SSecret();
  const gw = resolveGatewaySecret();
  if (s2s) arr.push(s2s);
  if (gw) arr.push(gw);
  return arr;
}

/**
 * Select the appropriate secret for OUTBOUND signing.
 * - Services calling other services → use shared S2S secret.
 * - Gateway calling a service → use that service's GATEWAY_SECRET (from the gateway process env).
 *
 * Most microservices should call this with kind: "interservice".
 */
export function selectOutboundS2SSecret(kind: "interservice" | "gateway"): string | undefined {
  if (kind === "interservice") return resolveS2SSecret();
  return resolveGatewaySecret();
}

/** Resolve public mode (guard policy) with sane fallback. */
export function resolvePublicMode(): PublicMode {
    const raw = (process.env[ENV_PUBLIC_MODE] ?? "OPEN").toUpperCase();
  switch (raw) {
    case 'OPEN':
      return 'OPEN';
    case 'GATEWAY_ONLY':
      return 'GATEWAY_ONLY';
    case 'OPTIONAL_AUTH':
    default:
      return 'OPTIONAL_AUTH';
  }
}

// ---------------------------------------------
// ✨ Tiny convenience checks (optional use)
// ---------------------------------------------
export function isGatewayOnly(): boolean {
  return resolvePublicMode() === "GATEWAY_ONLY";
}
export function isOptionalAuth(): boolean {
  return resolvePublicMode() === "OPTIONAL_AUTH";
}
export function isOpenMode(): boolean {
  return resolvePublicMode() === "OPEN";
}
