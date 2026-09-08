import { NextRequest } from "next/server";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as refresh } from "../app/api/auth/refresh/route";

const TOKEN_ENVELOPE = {
  data: {
    accessToken: "access-token",
    accessExpiresInSeconds: 900,
    refreshExpiresInSeconds: 604800,
  },
  meta: {},
  requestId: "request-1",
};

function request(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function upstream(body: unknown, status = 200, setCookie?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": "request-1",
      ...(setCookie ? { "set-cookie": setCookie } : {}),
    },
  });
}

describe("current web auth BFF gateway boundary", () => {
  beforeEach(() => {
    process.env.NEBULA_GATEWAY_API_BASE_URL = "http://127.0.0.1:3002";
    process.env.NEBULA_PUBLIC_CLIENT_ID = "admin-web-local";
    process.env.NEBULA_APPLICATION_ORIGIN = "http://localhost:3000";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends configured application identity and relays only refresh cookie state", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      upstream(
        TOKEN_ENVELOPE,
        200,
        "refreshToken=rotated; Path=/api/auth; HttpOnly; SameSite=Lax",
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await login(
      request("/api/auth/login", {
        identifier: "admin@example.com",
        password: "secret",
        remember: true,
      }),
    );
    const call = fetchMock.mock.calls[0];
    const headers = new Headers(call[1]?.headers);
    expect(call[0]).toBe("http://127.0.0.1:3002/api/v1/auth/login");
    expect(headers.get("x-nebula-client-id")).toBe("admin-web-local");
    expect(headers.get("origin")).toBe("http://localhost:3000");
    expect(headers.get("sec-fetch-site")).toBe("same-origin");
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      identifier: "admin@example.com",
      password: "secret",
    });
    expect(response.headers.get("set-cookie")).toContain("refreshToken=rotated");
    expect(response.headers.get("set-cookie")).not.toContain("accessToken=");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accessToken: "access-token",
    });
  });

  it("forwards the raw cookie on POST refresh and relays rotation", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () =>
      upstream(
        TOKEN_ENVELOPE,
        200,
        "refreshToken=next; Path=/api/auth; HttpOnly; SameSite=Lax",
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await refresh(
      request("/api/auth/refresh", {}, {
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
        cookie: "refreshToken=old; theme=dark",
      }),
    );
    const call = fetchMock.mock.calls[0];
    const headers = new Headers(call[1]?.headers);
    expect(call[1]?.method).toBe("POST");
    expect(call[1]?.body).toBeUndefined();
    expect(headers.get("cookie")).toBe("refreshToken=old; theme=dark");
    expect(response.headers.get("set-cookie")).toContain("refreshToken=next");
  });

  it("preserves the gateway error envelope and refresh-cookie expiry", async () => {
    global.fetch = jest.fn(async () =>
      upstream(
        {
          error: {
            code: "REFRESH_SESSION_INVALID",
            message: "Refresh session is no longer valid",
            requestId: "request-1",
          },
        },
        401,
        "refreshToken=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0",
      ),
    ) as unknown as typeof fetch;

    const response = await refresh(
      request("/api/auth/refresh", {}, {
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
        cookie: "refreshToken=expired",
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "REFRESH_SESSION_INVALID",
        message: "Refresh session is no longer valid",
        requestId: "request-1",
      },
    });
  });

  it("rejects mismatched browser origin before the gateway call", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await refresh(
      request("/api/auth/refresh", {}, {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
        cookie: "refreshToken=old",
      }),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched BFF host even with a copied allowed Origin", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await refresh(
      new NextRequest("http://unexpected-host.test/api/auth/refresh", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
          cookie: "refreshToken=old",
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the host-only refresh cookie even when remote logout fails", async () => {
    global.fetch = jest.fn(async () =>
      upstream(
        {
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
            requestId: "request-1",
          },
        },
        401,
      ),
    ) as unknown as typeof fetch;
    const response = await logout(
      request("/api/auth/logout", {}, {
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
        cookie: "refreshToken=old",
        authorization: "Bearer access-token",
        "idempotency-key": "0123456789abcdef",
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("refreshToken=");
    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth");
  });
});
