import { refreshAccessToken } from "@/lib/auth/refresh";
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from "@/lib/auth/tokens";

describe("refreshAccessToken", () => {
  afterEach(() => {
    clearTokens();
    jest.restoreAllMocks();
  });

  it("uses POST and stores the rotated access token", async () => {
    const fetchMock = jest.fn(async () =>
      new Response(JSON.stringify({ ok: true, accessToken: "rotated-access" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    setTokens("old-access");

    await expect(refreshAccessToken()).resolves.toBe("rotated-access");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/refresh", {
      method: "POST",
    });
    expect(getAccessToken()).toBe("rotated-access");
  });

  it("clears local access state when refresh fails", async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: "session_expired" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    setTokens("old-access");

    await expect(refreshAccessToken()).rejects.toThrow("session_expired");
    expect(getAccessToken()).toBeNull();
  });
});
