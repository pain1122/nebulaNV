import type {
  CorsOptions,
  CorsOptionsDelegate,
} from "@nestjs/common/interfaces/external/cors-options.interface";
import * as Joi from "joi";
import helmet from "helmet";

export const HTTP_CORS_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;

export const HTTP_CORS_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
] as const;

export type HttpSurface = "browser-api" | "internal" | "public-render";

interface HttpPolicyRequest {
  originalUrl?: string;
  path?: string;
  url?: string;
}

export interface HttpCorsPolicyOptions {
  origins?: string | readonly string[];
  publicRenderPaths?: readonly string[];
}

function normalizePathPrefix(value: string): string {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.includes("?") ||
    trimmed.includes("#")
  ) {
    throw new Error(`Invalid HTTP policy path prefix: ${value}`);
  }
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, "") : trimmed;
}

function matchesPath(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function requestPath(request: HttpPolicyRequest): string {
  const value = request.path ?? request.originalUrl ?? request.url ?? "/";
  return value.split("?", 1)[0] || "/";
}

export function parseHttpCorsOrigins(
  value: string | readonly string[] | undefined,
): string[] {
  const entries =
    typeof value === "string" ? value.split(",") : value ? [...value] : [];
  const origins = new Set<string>();

  for (const entry of entries) {
    const candidate = entry.trim();
    if (!candidate) continue;
    if (candidate === "*" || candidate.includes("*")) {
      throw new Error(
        "HTTP CORS origins must be exact; wildcards are not allowed",
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error(`Invalid HTTP CORS origin: ${candidate}`);
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.pathname !== "/" && parsed.pathname !== "")
    ) {
      throw new Error(`Invalid HTTP CORS origin: ${candidate}`);
    }

    origins.add(parsed.origin);
  }

  return [...origins];
}

export function classifyHttpSurface(
  path: string,
  publicRenderPaths: readonly string[] = [],
): HttpSurface {
  const normalizedPath = requestPath({ path });
  if (matchesPath(normalizedPath, "/health")) return "internal";

  const renderPrefixes = publicRenderPaths.map(normalizePathPrefix);
  if (renderPrefixes.some((prefix) => matchesPath(normalizedPath, prefix))) {
    return "public-render";
  }

  return "browser-api";
}

function browserApiCorsOptions(origins: readonly string[]): CorsOptions {
  return {
    origin: origins.length > 0 ? [...origins] : false,
    credentials: false,
    methods: [...HTTP_CORS_METHODS],
    allowedHeaders: [...HTTP_CORS_ALLOWED_HEADERS],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

/**
 * Applies temporary direct-service browser CORS only to JSON API routes.
 * Health endpoints remain internal. Public render CORS stays deferred to the
 * CDN/render phase, while its resource-header exception is handled separately.
 */
export function createHttpCorsOptionsDelegate(
  options: HttpCorsPolicyOptions = {},
): CorsOptionsDelegate<HttpPolicyRequest> {
  const origins = parseHttpCorsOrigins(options.origins);
  const publicRenderPaths = (options.publicRenderPaths ?? []).map(
    normalizePathPrefix,
  );
  const browserOptions = browserApiCorsOptions(origins);
  const noBrowserCors: CorsOptions = { origin: false };

  return (request, callback) => {
    const surface = classifyHttpSurface(
      requestPath(request),
      publicRenderPaths,
    );
    callback(null, surface === "browser-api" ? browserOptions : noBrowserCors);
  };
}

export function createHttpSecurityHeadersMiddleware(
  nodeEnv = process.env.NODE_ENV,
): ReturnType<typeof helmet> {
  return helmet({
    strictTransportSecurity: nodeEnv === "production" ? undefined : false,
  });
}

export const httpPolicyEnvSchema = {
  HTTP_CORS_ORIGINS: Joi.string()
    .allow("")
    .default("")
    .custom((value: string, helpers) => {
      try {
        parseHttpCorsOrigins(value);
        return value;
      } catch (error) {
        return helpers.message({
          custom:
            error instanceof Error
              ? error.message
              : "Invalid HTTP CORS origin configuration",
        });
      }
    }),
};
