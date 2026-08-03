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
  const prefix = servicePrefix.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(prefix)) {
    throw new Error(`Invalid service environment prefix: ${servicePrefix}`);
  }

  return {
    PORT: port.optional(),
    GRPC_HOST: host.optional(),
    GRPC_PORT: port.optional(),
    [`${prefix}_HTTP_PORT`]: port.optional(),
    [`${prefix}_GRPC_HOST`]: host.optional(),
    [`${prefix}_GRPC_PORT`]: port.optional(),
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

export function resolveServiceBind(
  env: Environment,
  options: ServiceBindOptions,
): ServiceBind {
  const prefix = options.servicePrefix.trim().toUpperCase();
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
