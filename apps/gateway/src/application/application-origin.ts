export class ApplicationOriginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationOriginError";
  }
}

function defaultPort(protocol: string): string | undefined {
  if (protocol === "http:") return "80";
  if (protocol === "https:") return "443";
  return undefined;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]"
  );
}

function parseOrigin(value: string): URL {
  if (!value || value.trim() !== value || value.includes("*")) {
    throw new ApplicationOriginError("Application origin is not canonical");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApplicationOriginError("Application origin is invalid");
  }

  if (
    !defaultPort(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new ApplicationOriginError("Application origin is invalid");
  }

  return parsed;
}

function explicitPort(value: string): string | undefined {
  const match =
    /^https?:\/\/(?:\[[0-9A-Fa-f:]+\]|[A-Za-z0-9.-]+):(\d{1,5})$/.exec(value);
  if (!match) return undefined;

  const numericPort = Number(match[1]);
  return numericPort >= 1 && numericPort <= 65_535 ? match[1] : undefined;
}

function canonicalOrigin(parsed: URL, port: string): string {
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}:${port}`;
}

/** Validate and retain the explicit-port canonical form stored in registry. */
export function validateRegistryOrigin(value: string, nodeEnv: string): string {
  const parsed = parseOrigin(value);
  const port = explicitPort(value);
  if (!port) {
    throw new ApplicationOriginError(
      "Application registry origins require an explicit port",
    );
  }

  const canonical = canonicalOrigin(parsed, port);
  if (value !== canonical) {
    throw new ApplicationOriginError("Application origin is not canonical");
  }

  if (parsed.protocol === "http:") {
    if (nodeEnv === "production" || !isLoopbackHost(parsed.hostname)) {
      throw new ApplicationOriginError(
        "HTTP application origins are limited to non-production loopback",
      );
    }
  }

  return canonical;
}

/** Normalize a browser/BFF Origin, including the effective default port. */
export function normalizeLookupOrigin(value: string): string {
  if (
    !/^https?:\/\/(?:\[[0-9A-Fa-f:]+\]|[A-Za-z0-9.-]+)(?::\d{1,5})?$/.test(
      value,
    )
  ) {
    throw new ApplicationOriginError("Application origin is not canonical");
  }
  const parsed = parseOrigin(value);
  const port = parsed.port || defaultPort(parsed.protocol);
  if (!port) {
    throw new ApplicationOriginError("Application origin has no valid port");
  }
  return canonicalOrigin(parsed, port);
}
