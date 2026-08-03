import {
  BeforeApplicationShutdown,
  LogLevel,
  Logger,
  OnApplicationShutdown,
  Provider,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

const LOG_SCHEMA_VERSION = 1;
const MAX_LOG_FIELD_LENGTH = 160;

type RequestUser = {
  userId?: string | null;
  sessionRef?: string;
};

type HttpRequestForLogging = {
  method?: string;
  baseUrl?: string;
  route?: { path?: unknown };
  socket?: { remoteAddress?: string };
  user?: RequestUser;
  requestId?: string;
  svc?: string;
};

type HttpResponseForLogging = {
  statusCode: number;
  on(event: "finish", listener: () => void): void;
  setHeader?(name: string, value: string): void;
};

type NextFunction = () => void;

export type StructuredLogger = Pick<Logger, "debug" | "error" | "log" | "warn">;

type LogEvent = Readonly<Record<string, boolean | number | string>>;

function cleanField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return Array.from(trimmed, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? "_" : character;
  })
    .join("")
    .slice(0, MAX_LOG_FIELD_LENGTH);
}

function timestamp(): string {
  return new Date().toISOString();
}

function serialize(event: LogEvent): string {
  return JSON.stringify({
    schemaVersion: LOG_SCHEMA_VERSION,
    timestamp: timestamp(),
    ...event,
  });
}

function safeWrite(
  logger: StructuredLogger,
  level: keyof StructuredLogger,
  event: LogEvent,
): void {
  try {
    logger[level](serialize(event));
  } catch {
    // Logging is observational and must never change request/lifecycle behavior.
  }
}

function directPeerIp(req: HttpRequestForLogging): string {
  const remoteAddress = cleanField(req.socket?.remoteAddress);
  if (!remoteAddress) return "unknown";
  return remoteAddress.startsWith("::ffff:")
    ? remoteAddress.slice("::ffff:".length)
    : remoteAddress;
}

function routeTemplate(req: HttpRequestForLogging): string {
  const route = cleanField(req.route?.path);
  if (!route) return "unmatched";

  const baseUrl = cleanField(req.baseUrl) ?? "";
  return cleanField(`${baseUrl}${route}`) ?? "unmatched";
}

function requestLogLevel(
  statusCode: number,
  route: string,
): keyof StructuredLogger {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  if (route === "/health" || route.startsWith("/health/")) return "debug";
  return "log";
}

export function serviceLogLevels(nodeEnv = process.env.NODE_ENV): LogLevel[] {
  return nodeEnv === "production"
    ? ["error", "warn", "log"]
    : ["error", "warn", "log", "debug"];
}

export interface HttpRequestLoggingOptions {
  serviceName: string;
}

export function createHttpRequestLoggingMiddleware(
  logger: StructuredLogger,
  options: HttpRequestLoggingOptions,
): (
  req: HttpRequestForLogging,
  res: HttpResponseForLogging,
  next: NextFunction,
) => void {
  const service = cleanField(options.serviceName) ?? "unknown-service";

  return (req, res, next) => {
    const startedAt = performance.now();
    const generatedRequestId = randomUUID();

    if (!cleanField(req.requestId)) {
      req.requestId = generatedRequestId;
    }
    res.setHeader?.("x-request-id", req.requestId ?? generatedRequestId);

    res.on("finish", () => {
      const route = routeTemplate(req);
      const event: Record<string, string | number> = {
        event: "http_request_completed",
        service,
        method: cleanField(req.method)?.toUpperCase() ?? "UNKNOWN",
        route,
        status: res.statusCode,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        peerIp: directPeerIp(req),
        requestId: cleanField(req.requestId) ?? generatedRequestId,
      };

      const userId = cleanField(req.user?.userId);
      const sessionRef = cleanField(req.user?.sessionRef);
      const callerService = cleanField(req.svc);
      if (userId) event.userId = userId;
      if (sessionRef) event.sessionRef = sessionRef;
      if (callerService) event.callerService = callerService;

      safeWrite(logger, requestLogLevel(res.statusCode, route), event);
    });

    next();
  };
}

export function logServiceReady(
  logger: StructuredLogger,
  serviceName: string,
): void {
  safeWrite(logger, "log", {
    event: "service_ready",
    service: cleanField(serviceName) ?? "unknown-service",
  });
}

export function logFatalStartup(
  logger: StructuredLogger,
  serviceName: string,
  error: unknown,
): void {
  safeWrite(logger, "error", {
    event: "service_startup_failed",
    service: cleanField(serviceName) ?? "unknown-service",
    cause: safeErrorName(error),
  });
}

export function safeErrorName(error: unknown): string {
  if (error instanceof Error) {
    return cleanField(error.name) ?? "Error";
  }
  return cleanField(typeof error) ?? "unknown";
}

export class ServiceLifecycleLogger
  implements BeforeApplicationShutdown, OnApplicationShutdown
{
  private readonly logger: Logger;

  constructor(private readonly serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  beforeApplicationShutdown(signal?: string): void {
    const event: Record<string, string> = {
      event: "service_shutdown_started",
      service: this.serviceName,
    };
    const cleanSignal = cleanField(signal);
    if (cleanSignal) event.signal = cleanSignal;
    safeWrite(this.logger, "log", event);
  }

  onApplicationShutdown(signal?: string): void {
    const event: Record<string, string> = {
      event: "service_shutdown_completed",
      service: this.serviceName,
    };
    const cleanSignal = cleanField(signal);
    if (cleanSignal) event.signal = cleanSignal;
    safeWrite(this.logger, "log", event);
  }
}

export function createServiceLifecycleProvider(serviceName: string): Provider {
  return {
    provide: ServiceLifecycleLogger,
    useFactory: () => new ServiceLifecycleLogger(serviceName),
  };
}
