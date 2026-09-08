import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import {
  deriveS2SSessionRef,
  type S2SActorRole,
  type S2SSignedContext,
} from "../src/s2s-context";

type AccessTokenPayload = {
  sub?: unknown;
  role?: unknown;
  sid?: unknown;
};

const ROLES = new Set<S2SActorRole>(["user", "admin", "root-admin"]);

function accessTokenPayload(token: string): AccessTokenPayload {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("test_access_token_payload_missing");
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AccessTokenPayload;
  } catch {
    throw new Error("test_access_token_payload_invalid");
  }
}

function testAccessSecret(): string {
  const configured = process.env.JWT_ACCESS_SECRET;
  if (configured) return configured;

  const loaded = loadEnv({
    path: resolve(__dirname, "../../../.env"),
    override: false,
    quiet: true,
  }).parsed?.JWT_ACCESS_SECRET;
  if (!loaded) throw new Error("test_jwt_access_secret_missing");
  return loaded;
}

/**
 * Test-only mirror of the gateway's future auth-verified context projection.
 * Production code must never derive actor authority by decoding a JWT locally.
 */
export function gatewayTestSignedContext(
  accessToken?: string,
): S2SSignedContext {
  const base = {
    version: "1" as const,
    applicationId: "e2e-gateway-client",
    tenantId: "single-site-tenant",
    siteId: "single-site",
    channelId: "e2e",
  };
  if (!accessToken) return base;

  const payload = accessTokenPayload(accessToken);
  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    !ROLES.has(payload.role as S2SActorRole) ||
    typeof payload.sid !== "string"
  ) {
    throw new Error("test_access_token_actor_invalid");
  }
  const secret = testAccessSecret();

  return {
    ...base,
    actor: {
      userId: payload.sub,
      role: payload.role as S2SActorRole,
      sessionRef: deriveS2SSessionRef(secret, payload.sid),
    },
  };
}
