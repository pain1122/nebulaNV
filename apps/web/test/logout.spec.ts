import { logoutSession } from "@/lib/auth/logout";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth/tokens";

describe("logoutSession", () => {
  afterEach(() => {
    clearTokens();
    jest.restoreAllMocks();
  });

  it("posts the current session contract and always clears local access state", async () => {
    setTokens("access-token");
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () => new Response(null, { status: 401 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(logoutSession()).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(url).toBe("/api/auth/logout");
    expect(init?.method).toBe("POST");
    expect(headers.get("authorization")).toBe("Bearer access-token");
    expect(headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/u);
    expect(init?.body).toBe("{}");
    expect(getAccessToken()).toBeNull();
  });
});
