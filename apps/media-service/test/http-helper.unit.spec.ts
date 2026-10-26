import { httpJson } from "./utils/http";

describe("integration HTTP helper", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses a bounded single request, closes its connection and preserves auth/body", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "created" } }), {
        status: 201,
      }),
    );
    const result = await httpJson<{ data: { id: string } }>(
      "POST",
      "http://127.0.0.1:3007/media",
      { filename: "test.webp" },
      { authorization: "Bearer test-token" },
    );
    expect(result.data.id).toBe("created");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3007/media", {
      method: "POST",
      headers: {
        connection: "close",
        "content-type": "application/json",
        authorization: "Bearer test-token",
      },
      body: JSON.stringify({ filename: "test.webp" }),
      signal,
    });
  });

  it("retains an HTTP denial without retrying", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
      );
    await expect(
      httpJson("GET", "http://127.0.0.1:3007/media"),
    ).rejects.toThrow("Forbidden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates a closed socket without replaying a write", async () => {
    const failure = new TypeError("fetch failed", {
      cause: { code: "UND_ERR_SOCKET" },
    });
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(failure);
    await expect(
      httpJson("POST", "http://127.0.0.1:3001/auth/login", {
        identifier: "fixture@example.com",
      }),
    ).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
