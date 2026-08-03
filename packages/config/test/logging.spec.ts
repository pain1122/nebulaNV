import {
  createHttpRequestLoggingMiddleware,
  logFatalStartup,
  logServiceReady,
  serviceLogLevels,
  type StructuredLogger,
} from "../src/logging";

type LogLevel = keyof StructuredLogger;

function createLogger() {
  const records: Array<{ level: LogLevel; message: string }> = [];
  const logger: StructuredLogger = {
    debug: (message: unknown) =>
      records.push({ level: "debug", message: String(message) }),
    error: (message: unknown) =>
      records.push({ level: "error", message: String(message) }),
    log: (message: unknown) =>
      records.push({ level: "log", message: String(message) }),
    warn: (message: unknown) =>
      records.push({ level: "warn", message: String(message) }),
  };
  return { logger, records };
}

function runRequest(
  logger: StructuredLogger,
  overrides: Record<string, unknown> = {},
  statusCode = 200,
) {
  let finish: (() => void) | undefined;
  let nextCalled = false;
  const headers: Record<string, string> = {};
  const req: Record<string, unknown> & {
    requestId?: string;
  } = {
    method: "get",
    baseUrl: "/auth",
    route: { path: "/profile/:id" },
    socket: { remoteAddress: "::ffff:127.0.0.1" },
    ...overrides,
  };
  const middleware = createHttpRequestLoggingMiddleware(logger, {
    serviceName: "auth-service",
  });

  middleware(
    req,
    {
      statusCode,
      on: (_event, listener) => {
        finish = listener;
      },
      setHeader: (name, value) => {
        headers[name] = value;
      },
    },
    () => {
      nextCalled = true;
    },
  );
  finish?.();

  return { headers, nextCalled, req };
}

describe("structured logging", () => {
  it("logs only allowlisted request context and never secret-bearing input", () => {
    const { logger, records } = createLogger();
    const { headers, nextCalled } = runRequest(logger, {
      originalUrl: "/auth/profile/42?token=query_canary",
      headers: {
        authorization: "Bearer authorization_canary",
        cookie: "session=cookie_canary",
        "x-forwarded-for": "198.51.100.8",
      },
      body: {
        password: "password_canary",
        refreshToken: "refresh_canary",
      },
      query: { setting: "setting_canary" },
      requestId: "verified-request-id",
      svc: "gateway",
      user: {
        userId: "user-id",
        sessionRef: "safe-session-reference",
        sid: "raw_session_canary",
      },
    });

    expect(nextCalled).toBe(true);
    expect(headers["x-request-id"]).toBe("verified-request-id");
    expect(records).toHaveLength(1);
    expect(records[0]?.level).toBe("log");

    const event = JSON.parse(records[0]?.message ?? "{}");
    expect(event).toMatchObject({
      schemaVersion: 1,
      event: "http_request_completed",
      service: "auth-service",
      method: "GET",
      route: "/auth/profile/:id",
      status: 200,
      peerIp: "127.0.0.1",
      requestId: "verified-request-id",
      callerService: "gateway",
      userId: "user-id",
      sessionRef: "safe-session-reference",
    });
    expect(event.timestamp).toEqual(expect.any(String));
    expect(event.durationMs).toEqual(expect.any(Number));

    const serialized = records[0]?.message ?? "";
    for (const canary of [
      "query_canary",
      "authorization_canary",
      "cookie_canary",
      "password_canary",
      "refresh_canary",
      "setting_canary",
      "raw_session_canary",
      "198.51.100.8",
    ]) {
      expect(serialized).not.toContain(canary);
    }
  });

  it("generates a request id and keeps unmatched paths out of logs", () => {
    const { logger, records } = createLogger();
    const { headers, req } = runRequest(logger, {
      originalUrl: "/secret-path?key=secret",
      route: undefined,
    });

    expect(req.requestId).toEqual(expect.any(String));
    expect(headers["x-request-id"]).toBe(req.requestId);
    expect(JSON.parse(records[0]?.message ?? "{}")).toMatchObject({
      route: "unmatched",
      requestId: req.requestId,
    });
    expect(records[0]?.message).not.toContain("secret-path");
  });

  it.each([
    ["/live", 200, "debug"],
    ["/profile/:id", 404, "warn"],
    ["/profile/:id", 503, "error"],
  ] as const)(
    "uses the expected level for route %s and status %s",
    (path, status, expectedLevel) => {
      const { logger, records } = createLogger();
      runRequest(logger, { baseUrl: "/health", route: { path } }, status);

      expect(records[0]?.level).toBe(expectedLevel);
    },
  );

  it("does not let logger failures change request flow", () => {
    const logger = createLogger().logger;
    logger.log = () => {
      throw new Error("logger unavailable");
    };

    expect(() => runRequest(logger)).not.toThrow();
  });

  it("logs readiness and fatal startup without error messages or stacks", () => {
    const { logger, records } = createLogger();

    logServiceReady(logger, "auth-service");
    logFatalStartup(
      logger,
      "auth-service",
      new TypeError("database_password_canary"),
    );

    expect(JSON.parse(records[0]?.message ?? "{}")).toMatchObject({
      event: "service_ready",
      service: "auth-service",
    });
    expect(JSON.parse(records[1]?.message ?? "{}")).toMatchObject({
      event: "service_startup_failed",
      service: "auth-service",
      cause: "TypeError",
    });
    expect(records[1]?.message).not.toContain("database_password_canary");
    expect(records[1]?.message).not.toContain("stack");
  });

  it("keeps debug disabled in production", () => {
    expect(serviceLogLevels("production")).toEqual(["error", "warn", "log"]);
    expect(serviceLogLevels("development")).toEqual([
      "error",
      "warn",
      "log",
      "debug",
    ]);
  });
});
