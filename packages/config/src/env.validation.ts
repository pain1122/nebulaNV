import * as Joi from "joi";

const port = Joi.number().integer().min(1).max(65_535);
const host = Joi.alternatives().try(
  Joi.string()
    .trim()
    .ip({ version: ["ipv4", "ipv6"] }),
  Joi.string().trim().hostname(),
);

export const runtimeEnvSchema = {
  NODE_ENV: Joi.string()
    .lowercase()
    .valid("development", "test", "production")
    .default("development"),
};

export const bcryptEnvSchema = {
  BCRYPT_ROUNDS: Joi.number().integer().min(8).max(15).default(10),
};

export const jwtAccessVerificationEnvSchema = {
  JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
};

export function serviceBindEnvSchema(
  servicePrefix: string,
): Record<string, Joi.Schema> {
  const prefix = normalizedServicePrefix(servicePrefix);

  return {
    PORT: port.optional(),
    GRPC_HOST: host.optional(),
    GRPC_PORT: port.optional(),
    [`${prefix}_HTTP_PORT`]: port.optional(),
    [`${prefix}_GRPC_HOST`]: host.optional(),
    [`${prefix}_GRPC_PORT`]: port.optional(),
  };
}

/**
 * Bind variables for an HTTP-only runtime such as the public gateway.
 *
 * This is deliberately separate from `serviceBindEnvSchema`: adding dummy
 * gRPC variables would make the runtime inventory and startup contract claim
 * that the gateway owns a listener which does not exist.
 */
export function httpOnlyBindEnvSchema(
  servicePrefix: string,
): Record<string, Joi.Schema> {
  const prefix = normalizedServicePrefix(servicePrefix);

  return {
    PORT: port.optional(),
    [`${prefix}_HTTP_PORT`]: port.optional(),
  };
}

function grpcTarget(): Joi.StringSchema {
  return Joi.string()
    .trim()
    .custom((value: string, helpers) => {
      const match =
        /^(\[[0-9a-fA-F:]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?):([0-9]{1,5})$/.exec(
          value,
        );
      const parsedPort = match ? Number(match[2]) : 0;

      if (!match || parsedPort < 1 || parsedPort > 65_535) {
        return helpers.error("any.custom", {
          message: "must be a host:port gRPC target without a URL scheme",
        });
      }

      return value;
    });
}

export function grpcTargetEnvSchema(
  ...envNames: string[]
): Record<string, Joi.Schema> {
  return Object.fromEntries(
    envNames.map((envName) => [envName, grpcTarget().optional()]),
  );
}

export function requiredGrpcTargetEnvSchema(
  ...envNames: string[]
): Record<string, Joi.Schema> {
  return Object.fromEntries(
    envNames.map((envName) => [envName, grpcTarget().required()]),
  );
}

export interface ServiceBindOptions {
  servicePrefix: string;
  defaultHttpPort: number;
  defaultGrpcPort: number;
  defaultGrpcHost?: string;
}

export interface ServiceBind {
  httpPort: number;
  grpcHost: string;
  grpcPort: number;
  grpcUrl: string;
}

export interface HttpOnlyBindOptions {
  servicePrefix: string;
  defaultHttpPort: number;
}

export interface HttpOnlyBind {
  httpPort: number;
}

type Environment = Readonly<Record<string, string | number | null | undefined>>;

function selectedNumber(
  env: Environment,
  names: readonly string[],
  fallback: number,
): number {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined && value !== null && value !== "") {
      return Number(value);
    }
  }
  return fallback;
}

function normalizedServicePrefix(servicePrefix: string): string {
  const prefix = servicePrefix.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(prefix)) {
    throw new Error(`Invalid service environment prefix: ${servicePrefix}`);
  }
  return prefix;
}

export function resolveHttpOnlyBind(
  env: Environment,
  options: HttpOnlyBindOptions,
): HttpOnlyBind {
  const prefix = normalizedServicePrefix(options.servicePrefix);
  return {
    httpPort: selectedNumber(
      env,
      [`${prefix}_HTTP_PORT`, "PORT"],
      options.defaultHttpPort,
    ),
  };
}

export function resolveServiceBind(
  env: Environment,
  options: ServiceBindOptions,
): ServiceBind {
  const prefix = normalizedServicePrefix(options.servicePrefix);
  const httpPort = selectedNumber(
    env,
    [`${prefix}_HTTP_PORT`, "PORT"],
    options.defaultHttpPort,
  );
  const grpcPort = selectedNumber(
    env,
    [`${prefix}_GRPC_PORT`, "GRPC_PORT"],
    options.defaultGrpcPort,
  );
  const grpcHost = String(
    env[`${prefix}_GRPC_HOST`] ??
      env.GRPC_HOST ??
      options.defaultGrpcHost ??
      "0.0.0.0",
  );
  const printableGrpcHost =
    grpcHost.includes(":") && !grpcHost.startsWith("[")
      ? `[${grpcHost}]`
      : grpcHost;

  return {
    httpPort,
    grpcHost,
    grpcPort,
    grpcUrl: `${printableGrpcHost}:${grpcPort}`,
  };
}
