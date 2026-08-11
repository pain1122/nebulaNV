import * as Joi from "joi";
import {
  ENV_GATEWAY_INBOUND_KEYS,
  ENV_GATEWAY_OUTBOUND_KEYS,
  ENV_S2S_INBOUND_KEYS,
  ENV_S2S_OUTBOUND_KEYS,
  GATEWAY_OUTBOUND_TARGETS,
  parseExactOutboundKeyMap,
  parseInboundKeyMap,
  parseOutboundKeyMap,
  PublicModes,
  S2S_SIGNATURE_HEADER_DEFAULT,
} from "./tokens";

type KeyMapParser = (raw: string | undefined, envName: string) => unknown;

function keyMap(parser: KeyMapParser, envName: string): Joi.StringSchema {
  return Joi.string()
    .trim()
    .required()
    .custom((value: string, helpers) => {
      try {
        parser(value, envName);
        return value;
      } catch (error) {
        return helpers.error("any.custom", {
          message:
            error instanceof Error ? error.message : `${envName}_invalid`,
        });
      }
    });
}

/**
 * Canonical startup validation shared by every internal gRPC service.
 * Deep trust-bundle and cross-bundle checks are repeated at listener bootstrap.
 */
export function s2sEnvSchema(serviceName: string) {
  return {
    SVC_NAME: Joi.string().valid(serviceName).default(serviceName),
    PUBLIC_MODE: Joi.string()
      .uppercase()
      .valid(...PublicModes)
      .default("OPTIONAL_AUTH"),
    S2S_SIGNATURE_HEADER: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9][a-z0-9-]{0,62}$/)
      .default(S2S_SIGNATURE_HEADER_DEFAULT),
    S2S_MAX_CLOCK_SKEW_MS: Joi.number()
      .integer()
      .min(1_000)
      .max(120_000)
      .default(30_000),
    S2S_REPLAY_STORE: Joi.string()
      .lowercase()
      .valid("redis", "memory")
      .default("redis"),
    S2S_OUTBOUND_KEYS: keyMap(parseOutboundKeyMap, ENV_S2S_OUTBOUND_KEYS),
    S2S_INBOUND_KEYS: keyMap(parseInboundKeyMap, ENV_S2S_INBOUND_KEYS),
    GATEWAY_INBOUND_KEYS: keyMap(parseInboundKeyMap, ENV_GATEWAY_INBOUND_KEYS),
    S2S_REPLAY_REDIS_URL: Joi.string()
      .uri({ scheme: ["redis", "rediss"] })
      .optional(),
    S2S_REPLAY_REDIS_DB: Joi.number().integer().min(0).default(0),
    REDIS_HOST: Joi.string().hostname().default("127.0.0.1"),
    REDIS_PORT: Joi.number().integer().min(1).max(65_535).default(6_379),
    REDIS_PASSWORD: Joi.string().allow("").optional(),
  };
}

/**
 * Startup schema for an HTTP gateway that only signs outbound gRPC calls.
 * It deliberately excludes inbound trust, replay storage, public HTTP policy,
 * and listener configuration owned by hybrid receiving services.
 */
export function gatewayOutboundEnvSchema(
  requiredTargets: readonly string[] = GATEWAY_OUTBOUND_TARGETS,
) {
  return {
    S2S_SIGNATURE_HEADER: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9][a-z0-9-]{0,62}$/)
      .default(S2S_SIGNATURE_HEADER_DEFAULT),
    GATEWAY_OUTBOUND_KEYS: keyMap(
      (raw, envName) => parseExactOutboundKeyMap(raw, envName, requiredTargets),
      ENV_GATEWAY_OUTBOUND_KEYS,
    ),
  };
}
