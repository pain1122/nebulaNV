import { apiFetch } from "@/lib/api/apiFetch";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth/tokens";

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe("apiFetch refresh concurrency", () => {
  afterEach(() => {
    clearTokens();
    jest.restoreAllMocks();
  });

  it("shares one successful refresh and retries every waiting request", async () => {
    setTokens("expired-access");
    const refreshResponse = deferred<Response>();
    let refreshCalls = 0;
    const fetchMock = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get("authorization");
      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        return refreshResponse.promise;
      }
      return new Response(null, {
        status: authorization === "Bearer rotated-access" ? 200 : 401,
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const first = apiFetch("/api/first");
    const second = apiFetch("/api/second");
    await Promise.resolve();
    await Promise.resolve();
    refreshResponse.resolve(
      new Response(JSON.stringify({ accessToken: "rotated-access" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const results = await Promise.all([first, second]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe("rotated-access");
  });

  it("rejects and clears every waiter when the shared refresh fails", async () => {
    setTokens("expired-access");
    const refreshResponse = deferred<Response>();
    let refreshCalls = 0;
    global.fetch = jest.fn(async (input: RequestInfo) => {
      if (String(input) === "/api/auth/refresh") {
        refreshCalls += 1;
        return refreshResponse.promise;
      }
      return new Response(null, { status: 401 });
    }) as unknown as typeof fetch;

    const first = apiFetch("/api/first");
    const second = apiFetch("/api/second");
    await Promise.resolve();
    await Promise.resolve();
    refreshResponse.resolve(
      new Response(JSON.stringify({ message: "refresh_denied" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const results = await Promise.allSettled([first, second]);
    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBeNull();
  });
});
